"""Deterministic rotation planner.

For one field it builds every (dry-season crop, monsoon crop) pair, rejects the
ones that break a hard rule, scores the rest 0-100 and returns the top three
plus the farmer's existing rotation. It ranks strategies; it does not predict yield.
"""
from itertools import product

from .crops import CROPS, SLOTS, ranges_for
from .rules import (SCORED_RULES, Context, rule_irrigation_required, rule_season_fit, water_base)

SOIL_BASE = 50.0
DEFAULT_PRIORITIES = {"income": 40, "soil": 30, "water": 30}


def clamp(x, lo=0.0, hi=100.0):
    return max(lo, min(hi, x))


def context_from_field(field: dict) -> Context:
    """Build the rule context from one record of fields_snapshot.json."""
    history = field.get("crop_history") or []
    seasons = (field.get("climatology") or {}).get("seasons") or {}
    winter, summer = seasons.get("winter") or {}, seasons.get("summer") or {}
    dry_rain = None
    if winter.get("rain_mm") is not None and summer.get("rain_mm") is not None:
        dry_rain = winter["rain_mm"] + summer["rain_mm"]
    return Context(
        prev_crop=CROPS.get(history[0]) if history else None,
        irrigated=bool(field.get("irrigated")),
        ph=(field.get("soil") or {}).get("ph"),
        gwetroot=(field.get("wetness") or {}).get("gwetroot"),
        monsoon_rain_mm=(seasons.get("monsoon") or {}).get("rain_mm"),
        dry_rain_mm=dry_rain,
        temps={"monsoon": seasons.get("monsoon"), "winter": winter, "summer": summer},
    )


def existing_pair(field: dict) -> tuple[str, str] | None:
    """crop_history is the usual rotation as [monsoon crop, dry-season crop]."""
    history = field.get("crop_history") or []
    if len(history) >= 2 and history[0] in CROPS and history[1] in CROPS:
        return history[1], history[0]
    return None


def evidence(field: dict, ctx: Context) -> list[dict]:
    prov = field.get("provenance") or {}
    clim = field.get("climatology") or {}
    clim_label = "NASA POWER climatology 2001-2025 (modelled)" if "2001" in str(clim.get("period")) \
        else "NASA POWER climatology (modelled)"
    items = []
    if ctx.monsoon_rain_mm is not None:
        items.append({"label": "Monsoon rain (May-Oct mean)", "value": f"{ctx.monsoon_rain_mm:.0f} mm", "source": clim_label})
    if ctx.dry_rain_mm is not None:
        items.append({"label": "Dry-season rain (Nov-Apr mean)", "value": f"{ctx.dry_rain_mm:.0f} mm", "source": clim_label})
    if ctx.gwetroot is not None:
        items.append({"label": "Root-zone wetness (modelled, 0-1)", "value": str(ctx.gwetroot),
                      "source": f"NASA POWER, {(prov.get('wetness') or {}).get('as_of', '')}"})
    if ctx.ph is not None:
        items.append({"label": "Topsoil pH (0-5 cm)", "value": str(ctx.ph), "source": "ISRIC SoilGrids v2.0 (not NASA)"})
    for season in ("winter", "summer", "monsoon"):
        t = ctx.temps.get(season) or {}
        if t.get("t2m") is not None:
            items.append({"label": f"{season.capitalize()} mean temperature", "value": f"{t['t2m']} C", "source": clim_label})
    return items


def gaps(field: dict, ctx: Context, returns: dict | None, pair) -> list[str]:
    out = []
    prov = field.get("provenance") or {}
    if (prov.get("smap") or {}).get("status") == "NOT_CONNECTED":
        out.append("No SMAP satellite soil moisture for this field yet; moisture comes from the POWER model only.")
    if (prov.get("ndvi") or {}).get("status") == "NOT_CONNECTED":
        out.append("No MODIS vegetation (NDVI) history for this field yet.")
    if ctx.ph is None:
        out.append("No soil pH value for this location; soil fit was not scored.")
    if ctx.gwetroot is None:
        out.append("No current soil wetness value; dry-season establishment was not scored.")
    if not returns:
        out.append("No expected returns entered, so income is scored as neutral: every cropped season counts "
                   "the same and a fallow season counts as zero.")
    else:
        for cid in pair:
            if cid != "fallow" and returns.get(cid) is None:
                out.append(f"No expected return entered for {CROPS[cid].name.lower()}; counted as zero income.")
    out.append("Soil salinity is not in these datasets.")
    out.append("Sowing windows are regional; confirm the dates for your township.")
    return out


def check_locally(dry, monsoon, ctx: Context) -> list[str]:
    out = []
    for crop in (dry, monsoon):
        if crop.local_check:
            out.append(f"{crop.name}: {crop.local_check}")
    rng = ranges_for(dry)
    if (dry.id != "fallow" and not ctx.irrigated and rng and ctx.dry_rain_mm is not None
            and rng.get("rain_abs_min_mm") and ctx.dry_rain_mm < rng["rain_abs_min_mm"]):
        out.append(f"Dry-season rain averages {ctx.dry_rain_mm:.0f} mm, far below the {rng['rain_abs_min_mm']:.0f} mm "
                   f"{dry.name.lower()} needs over its cycle (EcoCrop): it depends on moisture left by the monsoon. "
                   "Check how long your field stays moist after harvest.")
    out.append("Check for salt intrusion in the dry season, seed availability and the local market before deciding.")
    return out


def score_pair(dry, monsoon, ctx: Context) -> dict:
    findings = [f for rule in SCORED_RULES for f in rule(dry, monsoon, ctx)]
    soil = clamp(SOIL_BASE + sum(f.points for f in findings if f.component == "soil"))
    water = clamp(water_base(dry, monsoon) + sum(f.points for f in findings if f.component == "water"))
    adjustment = sum(f.points for f in findings if f.component == "adjustment")
    return {"findings": findings, "soil": soil, "water": water, "adjustment": adjustment}


def plan(field: dict, priorities: dict | None = None, returns: dict | None = None) -> dict:
    """returns: optional {crop_id: farmer's own expected return per acre}."""
    weights = {**DEFAULT_PRIORITIES, **(priorities or {})}
    weights = {k: max(0.0, float(weights[k])) for k in ("income", "soil", "water")}
    if sum(weights.values()) == 0:
        weights = {k: 1.0 for k in weights}
    returns = {k: float(v) for k, v in (returns or {}).items() if v is not None and k in CROPS} or None
    ctx = context_from_field(field)

    scored, rejected = [], []
    for dry_id, monsoon_id in product(sorted(CROPS), sorted(CROPS)):
        dry, monsoon = CROPS[dry_id], CROPS[monsoon_id]
        if dry.id == "fallow" and monsoon.id == "fallow":
            continue
        reasons = [r for r in (rule_season_fit(dry, "dry"), rule_season_fit(monsoon, "monsoon"),
                               rule_irrigation_required(dry, "dry", ctx)) if r]
        if reasons:
            # Record only rejections where each crop is at least tried in a slot it could plausibly fill.
            if "dry" in dry.slots and ("monsoon" in monsoon.slots):
                rejected.append({"sequence": [dry.name, monsoon.name], "reasons": reasons})
            continue
        scored.append({"dry": dry, "monsoon": monsoon, **score_pair(dry, monsoon, ctx)})

    # Income: only from the farmer's own numbers.
    if returns:
        totals = [returns.get(s["dry"].id, 0.0) + returns.get(s["monsoon"].id, 0.0) for s in scored]
        top = max(totals) if totals and max(totals) > 0 else 0
        for s, total in zip(scored, totals):
            s["income"] = round(100 * total / top, 1) if top else 50.0
    else:
        # No farmer numbers: every cropped season counts the same, a fallow season earns nothing.
        for s in scored:
            cropped = sum(1 for c in (s["dry"], s["monsoon"]) if c.id != "fallow")
            s["income"] = 50.0 * cropped / 2

    wsum = sum(weights.values())
    for s in scored:
        weighted = (weights["income"] * s["income"] + weights["soil"] * s["soil"] + weights["water"] * s["water"]) / wsum
        s["score"] = round(clamp(weighted + s["adjustment"]), 1)
        s["has_legume"] = s["dry"].legume or s["monsoon"].legume

    # Ties: the plan with a legume wins, then alphabetical, so the order never changes between runs.
    scored.sort(key=lambda s: (-s["score"], not s["has_legume"], s["dry"].id, s["monsoon"].id))
    for s in scored:  # equal scores share a rank
        s["rank"] = 1 + sum(1 for other in scored if other["score"] > s["score"])

    existing = existing_pair(field)
    chosen = [s for s in scored if (s["dry"].id, s["monsoon"].id) != existing][:3]
    existing_scored = next((s for s in scored if (s["dry"].id, s["monsoon"].id) == existing), None)
    if existing_scored:
        chosen.append(existing_scored)
    chosen.sort(key=lambda s: scored.index(s))

    ev = evidence(field, ctx)
    plans = []
    for s in chosen:
        dry, monsoon = s["dry"], s["monsoon"]
        pair = (dry.id, monsoon.id)
        plans.append({
            "id": f"{dry.id}>{monsoon.id}",
            "rank": s["rank"],
            "is_existing": pair == existing,
            "sequence": [
                {"slot": "dry", "slot_label": SLOTS["dry"]["label"], "crop_id": dry.id, "crop_name": dry.name},
                {"slot": "monsoon", "slot_label": SLOTS["monsoon"]["label"], "crop_id": monsoon.id, "crop_name": monsoon.name},
            ],
            "score": s["score"],
            "breakdown": {"income": round(s["income"], 1), "soil": round(s["soil"], 1), "water": round(s["water"], 1),
                          "adjustment": round(s["adjustment"], 1), "weights": weights},
            "reasons_for": [{"rule": f.rule, "component": f.component, "points": f.points, "text": f.text}
                            for f in s["findings"] if f.points > 0],
            "reasons_against": [{"rule": f.rule, "component": f.component, "points": f.points, "text": f.text}
                                for f in s["findings"] if f.points < 0],
            "notes": [{"rule": f.rule, "text": f.text} for f in s["findings"] if f.points == 0],
            "evidence": ev,
            "gaps": gaps(field, ctx, returns, pair),
            "check_locally": check_locally(dry, monsoon, ctx),
        })

    existing_note = None
    if existing and not existing_scored:
        why = [r for r in rejected if r["sequence"] == [CROPS[existing[0]].name, CROPS[existing[1]].name]]
        existing_note = "The existing rotation could not be scored: " + (" ".join(why[0]["reasons"]) if why else "unknown crops.")

    return {
        "field_id": field.get("id"),
        "weights": weights,
        "income_basis": "farmer-entered expected returns" if returns else "neutral (no returns entered)",
        "considered": len(scored),
        "plans": plans,
        "existing_note": existing_note,
        "rejected": rejected[:8],
        "rejected_count": len(rejected),
        "disclaimer": "Decision support, not a yield forecast. It does not replace your own judgment or local advice.",
    }
