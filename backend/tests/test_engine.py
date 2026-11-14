# AI-assisted: Claude Code
"""Engine tests. These are the properties the submission makes, not just smoke tests."""
import copy
import json

import pytest

from app.engine import engine


def climate():
    rain = [0.1] * 139 + [8.0] * (366 - 139)
    tmax, tmin, rh = [], [], []
    for day in range(1, 367):
        if day < 60:
            tmax.append(33.0); tmin.append(20.0); rh.append(75.0)
        elif day < 150:
            tmax.append(39.0); tmin.append(24.0); rh.append(65.0)
        else:
            tmax.append(31.0); tmin.append(24.0); rh.append(85.0)
    return {"rain_mm": rain, "t2m_max": tmax, "t2m_min": tmin, "rh2m": rh, "years": [1996, 2025]}


def inputs(**over):
    base = {"ph": 6.4, "clay_pct": 32.6, "sand_pct": 26.5, "gwetroot": 0.8,
            "dry_rain_mm": 90.0, "field_irrigation": "unavailable", "clim": climate()}
    base.update(over)
    return base


def by_id(result):
    return {p["id"]: p for p in result["plans"]}


def test_same_input_same_output():
    a = engine.evaluate(inputs())
    b = engine.evaluate(inputs())
    assert json.dumps(a, sort_keys=True) == json.dumps(b, sort_keys=True)


@pytest.mark.parametrize("priorities", [None, {"income": 0, "soil_health": 100, "water_saving": 0},
                                        {"income": 10, "soil_health": 10, "water_saving": 10}])
def test_weights_sum_to_100(priorities):
    result = engine.evaluate(inputs(), priorities=priorities)
    assert round(sum(result["weights"].values()), 6) == 100.0
    assert all(v >= 0 for v in result["weights"].values())


def test_baseline_always_present():
    for scenario in (None, {"irrigation": "unavailable"}, {"planting_delay_days": 14},
                     {"rainfall_change_percent": -20}, {"drainage": "poor"}):
        result = engine.evaluate(inputs(), scenario)
        assert "rice_rice" in by_id(result)
        assert by_id(result)["rice_rice"]["is_baseline"] is True
        assert result["plans"][-1]["id"] == "rice_rice" or any(p["is_baseline"] for p in result["plans"])
        assert len(result["plans"]) == 3


def test_missing_data_goes_to_unknowns_not_a_number():
    bare = inputs(ph=None, clay_pct=None, sand_pct=None, gwetroot=None, dry_rain_mm=None, clim=None)
    result = engine.evaluate(bare)
    codes = {u["rule"] for p in result["plans"] for u in p["unknowns"]}
    assert {"unknown_ph", "unknown_texture", "unknown_moisture", "unknown_climatology"} <= codes
    for p in result["plans"]:
        assert p["score_components"]["income"] is None
        assert all(isinstance(f["score_delta"], (int, float)) for f in p["reasons_for"] + p["reasons_against"])


def test_income_disabled_without_price_and_cost():
    result = engine.evaluate(inputs())
    assert result["income_enabled"] is False
    assert result["weights"]["income"] == 0
    assert "Not calculated" in result["income_note"]
    for p in result["plans"]:
        assert p["score_components"]["income"] is None
        assert any(u["rule"] == "unknown_income" for u in p["unknowns"])


def test_income_enabled_only_from_farmer_numbers():
    econ = {"rice": {"price": 900, "cost": 600}, "mung_bean": {"price": 500, "cost": 300},
            "black_gram": {"price": 550, "cost": 350}}
    result = engine.evaluate(inputs(), priorities={"income": 100, "soil_health": 0, "water_saving": 0}, econ=econ)
    assert result["income_enabled"] is True
    assert result["income_note"] is None
    assert result["weights"]["income"] == 100
    rice = by_id(result)["rice_rice"]["score_components"]["income"]
    assert rice == 100.0


@pytest.mark.parametrize("scenario,component", [
    ({"irrigation": "available"}, "water_saving"),
    ({"residual_moisture": "low"}, "water_saving"),
    ({"drainage": "poor"}, "season_field_fit"),
    ({"planting_delay_days": 14}, "season_field_fit"),
    ({"rainfall_change_percent": -20}, "water_saving"),
])
def test_scenario_changes_only_relevant_components(scenario, component):
    base = by_id(engine.evaluate(inputs()))
    after = by_id(engine.evaluate(inputs(), scenario))
    for pid, plan in after.items():
        changed = {k for k in plan["score_components"] if plan["score_components"][k] != base[pid]["score_components"][k]}
        assert changed <= {component}


def test_each_hero_scenario_has_a_visible_effect():
    base = by_id(engine.evaluate(inputs()))
    baseline_assumptions = engine.resolve_scenario(inputs(), None)
    for s in engine.TABLE["scenarios"]:
        if all(str(v) == str(baseline_assumptions.get(k)) for k, v in s["assumptions"].items()):
            continue  # this option is the field's current assumption
        after = by_id(engine.evaluate(inputs(), s["assumptions"]))
        assert any(after[k]["score"] != base[k]["score"] or after[k]["category"] != base[k]["category"] for k in base), s["id"]
    # The three irrigation settings must not produce one identical result.
    scores = [tuple(p["score"] for p in engine.evaluate(inputs(), {"irrigation": v})["plans"])
              for v in ("available", "sometimes", "unavailable")]
    assert len(set(scores)) == 3


def test_scores_clamped_and_categories_known():
    for p in engine.evaluate(inputs(), {"drainage": "good"})["plans"]:
        assert 0 <= p["score"] <= 100
        assert p["category"] in engine.TABLE["categories"]
        assert p["engine_version"] == engine.ENGINE_VERSION


def test_crop_table_is_sourced_and_pulses_differ():
    for cid, crop in engine.TABLE["crops"].items():
        for key in ("family", "cycle_days", "sow_window", "water_category", "waterlogging_tolerance",
                    "texture_opt", "local_risks"):
            assert "source" in crop[key] and "verified" in crop[key], (cid, key)
    mung, black = engine.TABLE["crops"]["mung_bean"], engine.TABLE["crops"]["black_gram"]
    sourced = [k for k in mung if isinstance(mung[k], dict) and mung[k].get("verified")
               and mung[k].get("value") != black[k].get("value")]
    assert sourced


def test_compare_reports_what_changed_and_why():
    cmp = engine.compare(inputs(), {"planting_delay_days": 14})
    assert cmp["changed_assumptions"] == [{"assumption": "planting_delay_days", "from": 0, "to": 14}]
    assert len(cmp["plans"]) == 3
    rice = next(p for p in cmp["plans"] if p["id"] == "rice_rice")
    assert rice["score_to"] < rice["score_from"]
    assert rice["why_it_changed"]
