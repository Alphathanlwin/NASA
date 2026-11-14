# AI-assisted: Claude Code
"""Rotation engine: compares Rice-Rice (baseline), Rice-Mung bean and Rice-Black gram.

Pure functions, no I/O apart from loading crops.json once. No randomness, no model.
Each rule returns findings (score_delta, reason, evidence_refs) or an "unknown" when
its input is missing; it never substitutes a value. It ranks plans; it does not
predict yield or profit.

frontend/src/engine/engine.ts is a line-for-line port. Keep the two in step:
scripts/parity_test.mjs fails if their outputs differ.
"""
import json
import math
from pathlib import Path

TABLE = json.loads((Path(__file__).with_name("crops.json")).read_text(encoding="utf-8"))
ENGINE_VERSION = TABLE["engine_version"]
MONTH_DAYS = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]  # leap-year calendar, day 1-366
MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"]
SCENARIO_KEYS = ["irrigation", "planting_delay_days", "residual_moisture", "drainage", "rainfall_change_percent"]


def fmt(x) -> str:
    if isinstance(x, str):
        return x
    if x == math.floor(x):
        return str(int(x))
    return ("%.2f" % x).rstrip("0").rstrip(".")


def round1(x: float) -> float:
    return math.floor(x * 10 + 0.5) / 10


def clamp(x, lo=0.0, hi=100.0):
    return max(lo, min(hi, x))


def wrap_doy(day: int) -> int:
    return (day - 1) % 366 + 1


def doy_label(day: int) -> str:
    d = wrap_doy(day)
    for i, n in enumerate(MONTH_DAYS):
        if d <= n:
            return f"{d} {MONTHS[i]}"
        d -= n
    return ""


def render(code: str, params: dict) -> str:
    text = TABLE["templates"][code]
    for k, v in params.items():
        text = text.replace("{" + k + "}", fmt(v))
    return text


def finding(code, component, delta, params, refs, table=TABLE):
    unverified = False
    for ref in refs:
        parts = ref.split(".")
        if parts[0] == "crops":
            unverified = unverified or not table["crops"][parts[1]][parts[2]]["verified"]
        elif parts[0] == "assumptions":
            unverified = True
    return {"rule": code, "component": component, "score_delta": delta, "reason": render(code, params),
            "evidence_refs": refs, "assumption": unverified}


def unknown(code, params=None):
    return {"rule": code, "reason": render(code, params or {})}


def onset_doy(clim):
    """First day after 1 March whose trailing 7-day mean rain reaches the onset threshold."""
    if not clim or not clim.get("rain_mm"):
        return None
    rain = clim["rain_mm"]
    threshold = TABLE["assumptions"]["onset_rule"]["value"]
    for day in range(61, 245):
        window = rain[day - 7:day]
        if any(v is None for v in window):
            continue
        if sum(window) / 7 >= threshold:
            return day
    return None


def texture_class(clay, sand):
    if clay >= 35:
        return "heavy"
    if clay < 18 and sand is not None and sand > 65:
        return "light"
    return "medium"


def resolve_scenario(inputs: dict, scenario: dict | None) -> dict:
    """Fill a partial scenario with the field's own defaults."""
    s = scenario or {}
    moisture = s.get("residual_moisture")
    if moisture is None:
        g = inputs.get("gwetroot")
        moisture = "unknown" if g is None else ("low" if g < TABLE["assumptions"]["moisture_threshold"]["value"] else "normal")
    return {
        "irrigation": s.get("irrigation") or inputs.get("field_irrigation") or "unavailable",
        "planting_delay_days": s.get("planting_delay_days") or 0,
        "residual_moisture": moisture,
        "drainage": s.get("drainage") or "unknown",
        "rainfall_change_percent": s.get("rainfall_change_percent") or 0,
    }


# ----------------------------------------------------------------------------- rules
# Each rule: (crop_id, crop, inputs, scenario) -> (findings, unknowns)

def rule_family(cid, crop, inputs, sc):
    w = TABLE["weights"]
    p = {"crop": crop["name"], "family": crop["family"]["value"]}
    refs = [f"crops.{cid}.family", "assumptions.pest_break"]
    if crop["family"]["value"] == TABLE["crops"]["rice"]["family"]["value"]:
        return [finding("family_same", "soil_health", w["family_same"], p, refs)], []
    return [finding("family_break", "soil_health", w["family_break"], p, refs)], []


def rule_legume(cid, crop, inputs, sc):
    if not crop["legume"]["value"]:
        return [], []
    return [finding("legume", "soil_health", TABLE["weights"]["legume"], {"crop": crop["name"]},
                    [f"crops.{cid}.legume", "assumptions.legume_soil_benefit"])], []


def rule_ph(cid, crop, inputs, sc):
    ph = inputs.get("ph")
    if ph is None:
        return [], [unknown("unknown_ph")]
    w = TABLE["weights"]
    (lo, hi), (alo, ahi) = crop["ph_opt"]["value"], crop["ph_abs"]["value"]
    p = {"ph": ph, "crop": crop["name"], "lo": lo, "hi": hi, "alo": alo, "ahi": ahi}
    refs = ["values.soil_ph", f"crops.{cid}.ph_opt", f"crops.{cid}.ph_abs"]
    code = "ph_opt" if lo <= ph <= hi else ("ph_abs" if alo <= ph <= ahi else "ph_out")
    return [finding(code, "soil_health", w[code], p, refs)], []


def rule_texture(cid, crop, inputs, sc):
    clay = inputs.get("clay_pct")
    if clay is None:
        return [], [unknown("unknown_texture")]
    w = TABLE["weights"]
    tex = texture_class(clay, inputs.get("sand_pct"))
    opt, absolute = crop["texture_opt"]["value"], crop["texture_abs"]["value"]
    refs = ["values.clay_pct", f"crops.{cid}.texture_opt", f"crops.{cid}.texture_abs", "assumptions.texture_classes"]
    if tex in opt or "wide" in opt:
        code, lst = "texture_opt", opt
    elif tex in absolute or "wide" in absolute:
        code, lst = "texture_abs", opt
    else:
        code, lst = "texture_out", absolute
    return [finding(code, "soil_health", w[code], {"texture": tex, "clay": clay, "crop": crop["name"], "list": ", ".join(lst)}, refs)], []


def rule_water_need(cid, crop, inputs, sc):
    code = "water_very_high" if crop["water_category"]["value"] == "very_high" else "water_low"
    return [finding(code, "water_saving", TABLE["weights"][code], {"crop": crop["name"]}, [f"crops.{cid}.water_category"])], []


def rule_irrigation(cid, crop, inputs, sc):
    w = TABLE["weights"]
    p = {"crop": crop["name"]}
    refs = [f"crops.{cid}.needs_irrigation_in_dry_season", "scenario.irrigation"]
    if crop["needs_irrigation_in_dry_season"]["value"]:
        code = "irrigated_crop_" + sc["irrigation"]
        return [finding(code, "water_saving", w.get(code, 0), p, refs)], []
    if sc["irrigation"] == "available":
        return [finding("rainfed_crop_irrigation_available", "water_saving", w["rainfed_crop_irrigation_available"], p, refs)], []
    return [], []


def rule_moisture(cid, crop, inputs, sc):
    w = TABLE["weights"]
    m = sc["residual_moisture"]
    p = {"crop": crop["name"]}
    refs = ["values.gwetroot", "scenario.residual_moisture", "assumptions.moisture_threshold"]
    if m == "unknown":
        return [], [unknown("unknown_moisture")]
    if crop["needs_irrigation_in_dry_season"]["value"]:
        if m == "low":
            return [finding("moisture_low_irrigated_crop", "water_saving", w["moisture_low_irrigated_crop"], p, refs)], []
        return [], []
    code = "moisture_normal" if m == "normal" else "moisture_low_irrigation_" + sc["irrigation"]
    return [finding(code, "water_saving", w[code], p, refs + ["scenario.irrigation"])], []


def rule_rain_change(cid, crop, inputs, sc):
    pct = sc["rainfall_change_percent"]
    if pct == 0:
        return [], []
    rain = inputs.get("dry_rain_mm")
    if rain is None:
        return [], [unknown("unknown_rain")]
    after = round1(rain * (1 + pct / 100))
    delta = int(math.floor((after - rain) / 10 + 0.5))
    return [finding("rain_change", "water_saving", delta, {"pct": pct, "from": rain, "to": after},
                    ["values.dry_season_rain_normal", "scenario.rainfall_change_percent"])], []


def calendar(crop, inputs, sc):
    lo, hi = crop["cycle_days"]["value"]
    sow = crop["sow_window"]["value"][0] + sc["planting_delay_days"]
    harvest = sow + (lo + hi) // 2
    return {"sow_day": sow, "harvest_day": harvest, "sow": doy_label(sow), "harvest": doy_label(harvest),
            "onset_doy": onset_doy(inputs.get("clim"))}


def rule_season(cid, crop, inputs, sc):
    cal = calendar(crop, inputs, sc)
    onset = cal["onset_doy"]
    if onset is None:
        return [], [unknown("unknown_climatology")]
    w = TABLE["weights"]
    # Sowing is in Nov-Dec; a harvest day above 366 falls in the following year.
    days_before = onset - (cal["harvest_day"] - 366) if cal["harvest_day"] > 366 else 366
    p = {"sow": cal["sow"], "crop": crop["name"], "harvest": cal["harvest"], "onset": doy_label(onset), "days": abs(days_before)}
    refs = ["climatology.rain_mm", f"crops.{cid}.sow_window", f"crops.{cid}.cycle_days", "assumptions.onset_rule",
            "assumptions.cycle_midpoint", "scenario.planting_delay_days"]
    if days_before <= 0:
        code = "harvest_after_onset"
    elif days_before <= w["near_onset_days"]:
        code = "harvest_near_onset"
    else:
        code = "harvest_clear"
    return [finding(code, "season_field_fit", w[code], p, refs)], []


def rule_heat(cid, crop, inputs, sc):
    clim = inputs.get("clim")
    if not clim or not clim.get("t2m_max"):
        return [], []  # already reported by rule_season
    w = TABLE["weights"]
    cal = calendar(crop, inputs, sc)
    limit = crop["temp_abs_max_c"]["value"]
    n = 0
    for day in range(cal["sow_day"], cal["harvest_day"] + 1):
        v = clim["t2m_max"][wrap_doy(day) - 1]
        if v is not None and v > limit:
            n += 1
    p = {"n": n, "limit": limit, "crop": crop["name"]}
    refs = ["climatology.t2m_max", f"crops.{cid}.temp_abs_max_c", f"crops.{cid}.sow_window", "scenario.planting_delay_days"]
    if n >= w["heat_many_days"]:
        return [finding("heat_many", "season_field_fit", w["heat_many"], p, refs)], []
    if n >= w["heat_some_days"]:
        return [finding("heat_some", "season_field_fit", w["heat_some"], p, refs)], []
    return [finding("heat_none", "season_field_fit", 0, p, refs)], []


def premonson_overlap(crop, inputs, sc):
    """Days of the growing period that fall in the pre-monsoon heat window.

    The window is 1 March to the climatological onset of pre-monsoon rain. The dry-season
    crop is sown in November, so its calendar days are compared against the following
    year's window (day numbers above 366).
    """
    clim = inputs.get("clim")
    if not clim or not clim.get("t2m_max"):
        return None
    onset = onset_doy(clim)
    if onset is None:
        return None
    cal = calendar(crop, inputs, sc)
    start = 60 + 366          # 1 March of the year after sowing
    end = onset + 366
    lo = max(cal["sow_day"], start)
    hi = min(cal["harvest_day"], end)
    if hi < lo:
        return {"days": 0, "hot_days": 0, "onset": onset, "calendar": cal}
    limit = crop["temp_abs_max_c"]["value"]
    hot = 0
    for day in range(lo, hi + 1):
        v = clim["t2m_max"][wrap_doy(day) - 1]
        if v is not None and v > limit:
            hot += 1
    return {"days": hi - lo + 1, "hot_days": hot, "onset": onset, "calendar": cal}


def rule_premonsoon(cid, crop, inputs, sc):
    """Planting delay moves the harvest into (or further into) the pre-monsoon heat window."""
    w = TABLE["weights"]
    ov = premonson_overlap(crop, inputs, sc)
    if ov is None:
        return [], [unknown("unknown_climatology")]
    cal = ov["calendar"]
    p = {"sow": cal["sow"], "harvest": cal["harvest"], "crop": crop["name"], "n": ov["days"],
         "hot": ov["hot_days"], "onset": doy_label(ov["onset"]), "limit": crop["temp_abs_max_c"]["value"]}
    refs = ["climatology.t2m_max", "climatology.rain_mm", "assumptions.premonsoon_window",
            f"crops.{cid}.sow_window", f"crops.{cid}.cycle_days", f"crops.{cid}.temp_abs_max_c",
            "scenario.planting_delay_days"]
    if ov["days"] == 0:
        return [finding("premonsoon_clear", "season_field_fit", w["premonsoon_clear"], p, refs)], []
    delta = -min(w["premonsoon_cap"], round1(ov["hot_days"] * w["premonsoon_per_hot_day"]))
    return [finding("premonsoon_hot", "season_field_fit", delta, p, refs)], []


def rule_drainage(cid, crop, inputs, sc):
    w = TABLE["weights"]
    p = {"crop": crop["name"]}
    refs = [f"crops.{cid}.waterlogging_tolerance", "scenario.drainage"]
    if crop["waterlogging_tolerance"]["value"] == "high":
        return [finding("drainage_rice", "season_field_fit", 0, p, refs)], []
    if sc["drainage"] == "unknown":
        return [], [unknown("unknown_drainage", p)]
    code = "drainage_" + sc["drainage"]
    return [finding(code, "season_field_fit", w[code], p, refs)], []


RULES = [rule_family, rule_legume, rule_ph, rule_texture, rule_water_need, rule_irrigation,
         rule_moisture, rule_rain_change, rule_season, rule_heat, rule_premonsoon, rule_drainage]


# --------------------------------------------------------------------------- evaluate
def normalise_weights(priorities: dict | None, income_enabled: bool) -> dict:
    p = {"income": 40, "soil_health": 30, "water_saving": 30}
    p.update(priorities or {})
    raw = {k: max(0.0, float(p[k])) for k in ("income", "soil_health", "water_saving")}
    if not income_enabled:
        raw["income"] = 0.0
    total = sum(raw.values())
    if total == 0:
        raw = {"income": 1.0 if income_enabled else 0.0, "soil_health": 1.0, "water_saving": 1.0}
        total = sum(raw.values())
    # Round while keeping the displayed weights exactly at 100%.
    weights = {k: round(100 * v / total, 2) for k, v in raw.items()}
    weights["water_saving"] = round(100 - weights["income"] - weights["soil_health"], 2)
    return weights


def evaluate(inputs: dict, scenario: dict | None = None, priorities: dict | None = None, econ: dict | None = None) -> dict:
    """econ: {crop_id: {"price": sales per acre, "cost": cost per acre}}, the farmer's own numbers."""
    sc = resolve_scenario(inputs, scenario)
    w = TABLE["weights"]
    econ = econ or {}
    if not any(plan["baseline"] for plan in TABLE["plans"]):
        raise ValueError("the crop table must include a baseline plan")
    nets = {}
    for plan in TABLE["plans"]:
        e = econ.get(plan["dry"]) or {}
        if e.get("price") is not None and e.get("cost") is not None:
            nets[plan["id"]] = float(e["price"]) - float(e["cost"])
    income_enabled = len(nets) == len(TABLE["plans"])
    weights = normalise_weights(priorities, income_enabled)
    income_note = None if income_enabled else "Not calculated — enter your price and cost."

    plans = []
    for plan in TABLE["plans"]:
        cid = plan["dry"]
        crop = TABLE["crops"][cid]
        findings, unknowns = [], []
        for rule in RULES:
            f, u = rule(cid, crop, inputs, sc)
            findings += f
            unknowns += u
        soil = clamp(w["soil_base"] + sum(f["score_delta"] for f in findings if f["component"] == "soil_health"))
        water = clamp(w["water_base"] + sum(f["score_delta"] for f in findings if f["component"] == "water_saving"))
        fit = sum(f["score_delta"] for f in findings if f["component"] == "season_field_fit")
        income = None
        if income_enabled:
            lo, hi = min(nets.values()), max(nets.values())
            income = round1(100 * (nets[plan["id"]] - lo) / (hi - lo)) if hi > lo else 50.0
            findings.append(finding("income_relative", "income", 0, {"net": nets[plan["id"]], "crop": crop["name"]}, ["user_input.price", "user_input.cost"]))
        else:
            unknowns.append(unknown("unknown_income"))
        unknowns += [unknown("unknown_salinity"), unknown("unknown_satellite_moisture")]
        weighted = (weights["soil_health"] * soil + weights["water_saving"] * water + weights["income"] * (income or 0)) / 100
        score = round1(clamp(weighted + fit))
        blocked = any(f["rule"] == "irrigated_crop_unavailable" for f in findings)
        if blocked:
            category = "not_workable"
        elif score >= w["category_worth"]:
            category = "worth_investigating"
        elif score >= w["category_caution"]:
            category = "possible_with_caution"
        else:
            category = "weak_fit"
        local = [render("local_sowing", {}), render("local_rain", {})]
        if crop["waterlogging_tolerance"]["value"] == "low":
            local.append(render("local_drainage", {}))
        local += crop["local_risks"]["value"] + [render("local_general", {})]
        refs = []
        for f in findings:
            for ref in f["evidence_refs"]:
                if ref not in refs:
                    refs.append(ref)
        plans.append({
            "id": plan["id"], "is_baseline": plan["baseline"],
            "sequence": [TABLE["crops"][plan["monsoon"]]["name"], crop["name"]], "dry_crop": cid,
            "score": score, "category": category, "category_label": TABLE["categories"][category],
            "score_components": {"income": income, "soil_health": soil, "water_saving": water, "season_field_fit": fit},
            "weights": weights,
            "reasons_for": [f for f in findings if f["score_delta"] > 0],
            "reasons_against": [f for f in findings if f["score_delta"] < 0],
            "notes": [f for f in findings if f["score_delta"] == 0],
            "evidence_refs": refs, "unknowns": unknowns, "local_checks": local,
            "calendar": calendar(crop, inputs, sc), "engine_version": ENGINE_VERSION,
        })
    order = sorted(range(len(plans)), key=lambda i: (-plans[i]["score"], i))
    for i in order:
        plans[i]["rank"] = 1 + sum(1 for q in plans if q["score"] > plans[i]["score"])
    return {"engine_version": ENGINE_VERSION, "scenario": sc, "weights": weights, "income_enabled": income_enabled,
            "income_note": income_note,
            "plans": [plans[i] for i in order],
            "disclaimer": "Decision support only — not a yield forecast or agronomic prescription. Check with local extension officers."}


def compare(inputs: dict, scenario: dict, priorities: dict | None = None, econ: dict | None = None) -> dict:
    """Original result vs scenario result, with what changed and why. A what-if, not a forecast."""
    base = evaluate(inputs, None, priorities, econ)
    scen = evaluate(inputs, scenario, priorities, econ)
    changed = [{"assumption": k, "from": base["scenario"][k], "to": scen["scenario"][k]}
               for k in SCENARIO_KEYS if base["scenario"][k] != scen["scenario"][k]]
    plans = []
    for b in base["plans"]:
        s = next(p for p in scen["plans"] if p["id"] == b["id"])
        before = {f["rule"]: f for f in b["reasons_for"] + b["reasons_against"] + b["notes"]}
        why = [f for f in s["reasons_for"] + s["reasons_against"] + s["notes"]
               if f["rule"] not in before or before[f["rule"]]["reason"] != f["reason"]]
        comps = {k: {"from": b["score_components"][k], "to": s["score_components"][k]}
                 for k in b["score_components"] if b["score_components"][k] != s["score_components"][k]}
        plans.append({"id": b["id"], "sequence": b["sequence"], "score_from": b["score"], "score_to": s["score"],
                      "category_from": b["category"], "category_to": s["category"],
                      "rank_from": b["rank"], "rank_to": s["rank"], "component_changes": comps,
                      "why_it_changed": [f["reason"] for f in why], "reasons": why})
    return {"original": base, "scenario_result": scen, "changed_assumptions": changed, "plans": plans,
            "note": "What-if comparison on the same rules. Not a forecast."}


def inputs_from_profile(profile: dict, climatology: dict | None) -> dict:
    """Engine inputs from one record of fields_snapshot.json."""
    v = profile.get("values") or {}

    def val(name):
        return (v.get(name) or {}).get("value")

    return {"ph": val("soil_ph"), "clay_pct": val("clay_pct"), "sand_pct": val("sand_pct"), "gwetroot": val("gwetroot"),
            "dry_rain_mm": val("dry_season_rain_normal"), "field_irrigation": profile.get("irrigation"),
            "clim": climatology}
