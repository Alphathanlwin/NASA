"""Deterministic rotation planner.

For one field it builds every (dry-season crop, monsoon crop) pair, rejects the
ones that break a hard rule, scores the rest 0-100 and returns the top three
plus the farmer's existing rotation. It ranks strategies; it does not predict yield.
"""
from itertools import product
import math

from .crops import CROPS, SLOTS, ranges_for
from .rules import (SCORED_RULES, Context, rule_irrigation_required, rule_season_fit, water_base)

SOIL_BASE = 50.0
DEFAULT_PRIORITIES = {"income": 40, "soil": 30, "water": 30}


def clamp(x, lo=0.0, hi=100.0):
    return max(lo, min(hi, x))


def context_from_field(field: dict, scenario: dict | None = None) -> Context:
    """Build the rule context from one record of fields_snapshot.json.

    scenario carries the farmer-reported input conditions (fertilizer,
    pesticide, cash) for Rule 9. Unknown values fall back to "no shock", so a
    bad value can never crash the planner or invent a shock.
    """
    history = field.get("crop_history") or []
    seasons = (field.get("climatology") or {}).get("seasons") or {}
    winter, summer = seasons.get("winter") or {}, seasons.get("summer") or {}
    dry_rain = None
    if winter.get("rain_mm") is not None and summer.get("rain_mm") is not None:
        dry_rain = winter["rain_mm"] + summer["rain_mm"]
    scenario = scenario or {}
    return Context(
        prev_crop=CROPS.get(history[0]) if history else None,
        irrigated=({"available": True, "unavailable": False}.get(field["irrigation"])
                   if "irrigation" in field else field.get("irrigated")),
        ph=(field.get("soil") or {}).get("ph"),
        gwetroot=(field.get("wetness") or {}).get("gwetroot"),
        monsoon_rain_mm=(seasons.get("monsoon") or {}).get("rain_mm"),
        dry_rain_mm=dry_rain,
        temps={"monsoon": seasons.get("monsoon"), "winter": winter, "summer": summer},
        drainage=field.get("drainage", "unknown"),
        fertilizer=scenario.get("fertilizer") if scenario.get("fertilizer") in ("normal", "expensive", "unavailable") else "normal",
        pesticide=scenario.get("pesticide") if scenario.get("pesticide") in ("available", "unavailable") else "available",
        cash=scenario.get("cash") if scenario.get("cash") in ("normal", "tight") else "normal",
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
        out.append("Income is not calculated: complete expected net-return inputs are missing. "
                   "Income has zero effective weight; remaining priorities are normalized.")
    else:
        for cid in pair:
            if cid != "fallow" and returns.get(cid) is None:
                out.append(f"No expected return entered for {CROPS[cid].name.lower()}; it is unknown, not zero.")
    if ctx.irrigated is None:
        out.append("Reliable irrigation availability is unknown; irrigation-dependent crops require confirmation.")
    if ctx.drainage == "unknown":
        out.append("Drainage is unknown; it has not been inferred from crop history or elevation.")
    if ctx.fertilizer != "normal" or ctx.pesticide != "available" or ctx.cash != "normal":
        out.append("Scenario assumes farmer-reported input conditions (fertilizer "
                   f"{ctx.fertilizer}, pesticide {ctx.pesticide}, cash {ctx.cash}); "
                   "verify local availability and prices before deciding.")
    out.append("Rule points are transparent team assumptions, not validated probabilities of crop success.")
    out.append("Soil salinity is not in these datasets.")
    out.append("Sowing windows are regional; confirm the dates for your township.")
    return out


def check_locally(dry, monsoon, ctx: Context) -> list[str]:
    out = []
    for crop in (dry, monsoon):
        if crop.local_check:
            out.append(f"{crop.name}: {crop.local_check}")
    if dry.id != "fallow" and ctx.irrigated is not True and ctx.dry_rain_mm is not None:
        out.append(f"Dry-season reference rainfall is {ctx.dry_rain_mm:.0f} mm. "
                   "Confirm residual field moisture and irrigation; seasonal rain is not a crop water balance.")
    out.append("Check for salt intrusion in the dry season, seed availability and the local market before deciding.")
    return out


def score_pair(dry, monsoon, ctx: Context) -> dict:
    findings = [f for rule in SCORED_RULES for f in rule(dry, monsoon, ctx)]
    soil = clamp(SOIL_BASE + sum(f.points for f in findings if f.component == "soil"))
    water = clamp(water_base(dry, monsoon) + sum(f.points for f in findings if f.component == "water"))
    adjustment = sum(f.points for f in findings if f.component == "adjustment")
    return {"findings": findings, "soil": soil, "water": water, "adjustment": adjustment}


def plan(field: dict, priorities: dict | None = None, returns: dict | None = None, scenario: dict | None = None) -> dict:
    """returns: optional {crop_id: farmer's own expected return per acre}.
    scenario: optional farmer-reported input conditions for Rule 9."""
    weights = {**DEFAULT_PRIORITIES, **(priorities or {})}
    weights = {k: max(0.0, float(weights[k])) for k in ("income", "soil", "water")}
    if sum(weights.values()) == 0:
        weights = {k: 1.0 for k in weights}
    returns = {k: float(v) for k, v in (returns or {}).items() if v is not None and k in CROPS} or None
    ctx = context_from_field(field, scenario)

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

    # Income: only from complete farmer's numbers for all eligible candidate crops.
    scored_crop_ids = {s["dry"].id for s in scored if s["dry"].id != "fallow"} | {s["monsoon"].id for s in scored if s["monsoon"].id != "fallow"}
    has_full_returns = bool(returns and all(c in returns for c in scored_crop_ids))

    if has_full_returns:
        totals = [returns.get(s["dry"].id, 0.0) + returns.get(s["monsoon"].id, 0.0) for s in scored]
        top = max(totals) if totals and max(totals) > 0 else 0
        for s, total in zip(scored, totals):
            s["income"] = round(100 * total / top, 1) if top else 50.0
        effective_weights = {**weights}
        wsum = sum(effective_weights.values()) or 1.0
        for s in scored:
            weighted = (effective_weights["income"] * s["income"] + effective_weights["soil"] * s["soil"] + effective_weights["water"] * s["water"]) / wsum
            s["score"] = round(clamp(weighted + s["adjustment"]), 1)
            s["has_legume"] = s["dry"].legume or s["monsoon"].legume
    else:
        for s in scored:
            s["income"] = None
        effective_weights = {**weights, "income": 0.0}
        wsum = effective_weights["soil"] + effective_weights["water"]
        if wsum == 0:
            wsum = 1.0
            effective_weights["soil"] = 0.5
            effective_weights["water"] = 0.5
        for s in scored:
            weighted = (effective_weights["soil"] * s["soil"] + effective_weights["water"] * s["water"]) / wsum
            s["score"] = round(clamp(weighted + s["adjustment"]), 1)
            s["has_legume"] = s["dry"].legume or s["monsoon"].legume

    # Ties: the plan with a legume wins, then alphabetical, so the order never changes between runs.
    scored.sort(key=lambda s: (-s["score"], not s["has_legume"], s["dry"].id, s["monsoon"].id))
    for s in scored:  # equal scores share a rank
        s["rank"] = 1 + sum(1 for other in scored if other["score"] > s["score"])

    existing = existing_pair(field)
    
    # Ensure core delta comparisons (black gram, green gram) are included if possible
    core_pairs = [("black_gram", "monsoon_rice"), ("green_gram", "monsoon_rice")]
    core_scored = [s for s in scored if (s["dry"].id, s["monsoon"].id) in core_pairs and (s["dry"].id, s["monsoon"].id) != existing]
    
    other_scored = [s for s in scored if (s["dry"].id, s["monsoon"].id) != existing and s not in core_scored]
    chosen_alternatives = (core_scored + other_scored)[:3]
    
    existing_scored = next((s for s in scored if (s["dry"].id, s["monsoon"].id) == existing), None)
    chosen = list(chosen_alternatives)
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
            "eligibility": "suitable",
            "sequence": [
                {"slot": "dry", "slot_label": SLOTS["dry"]["label"], "crop_id": dry.id, "crop_name": dry.name},
                {"slot": "monsoon", "slot_label": SLOTS["monsoon"]["label"], "crop_id": monsoon.id, "crop_name": monsoon.name},
            ],
            "score": s["score"],
            "breakdown": {
                "income": round(s["income"], 1) if s["income"] is not None else None,
                "soil": round(s["soil"], 1),
                "water": round(s["water"], 1),
                "adjustment": round(s["adjustment"], 1),
                "weights": effective_weights
            },
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
    if existing and not existing_scored and existing[0] in CROPS and existing[1] in CROPS:
        dry_e, monsoon_e = CROPS[existing[0]], CROPS[existing[1]]
        why_reasons = [r for r in (rule_season_fit(dry_e, "dry"), rule_season_fit(monsoon_e, "monsoon"),
                                   rule_irrigation_required(dry_e, "dry", ctx)) if r]
        plans.append({
            "id": f"{dry_e.id}>{monsoon_e.id}",
            "rank": None,
            "is_existing": True,
            "eligibility": "unsuitable",
            "sequence": [
                {"slot": "dry", "slot_label": SLOTS["dry"]["label"], "crop_id": dry_e.id, "crop_name": dry_e.name},
                {"slot": "monsoon", "slot_label": SLOTS["monsoon"]["label"], "crop_id": monsoon_e.id, "crop_name": monsoon_e.name},
            ],
            "score": None,
            "breakdown": {
                "income": None,
                "soil": None,
                "water": None,
                "adjustment": None,
                "weights": effective_weights
            },
            "reasons_for": [],
            "reasons_against": [{"rule": "Constraint", "component": "water", "points": -50, "text": r} for r in why_reasons] if why_reasons else [{"rule": "Constraint", "component": "water", "points": -50, "text": "Unsuitable rotation"}],
            "notes": [],
            "evidence": ev,
            "gaps": gaps(field, ctx, returns, existing),
            "check_locally": check_locally(dry_e, monsoon_e, ctx),
        })
        existing_note = "The existing rotation could not be scored: " + (" ".join(why_reasons) if why_reasons else "unsuitable crops.")

    return {
        "field_id": field.get("id"),
        "weights": effective_weights,
        "income_basis": "farmer-entered expected returns" if has_full_returns else "income not calculated: farmer expected returns missing or incomplete",
        "considered": len(scored),
        "plans": plans,
        "existing_note": existing_note,
        "rejected": rejected[:8],
        "rejected_count": len(rejected),
        "disclaimer": "Decision support, not a yield forecast. It does not replace your own judgment or local advice.",
    }
