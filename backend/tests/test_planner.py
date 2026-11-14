from app.engine import planner
from app.engine.crops import CROPS
from app.engine.rules import Context, rule_irrigation_required, rule_pest_break, rule_season_fit


def make_field(history=("monsoon_rice", "summer_rice"), irrigated=True, ph=6.0, gwetroot=0.8):
    return {
        "id": "T-01", "crop_history": list(history), "irrigated": irrigated,
        "soil": {"ph": ph}, "wetness": {"gwetroot": gwetroot},
        "climatology": {"seasons": {
            "monsoon": {"rain_mm": 2400, "t2m": 27.5, "t2m_max": 31.0},
            "winter": {"rain_mm": 80, "t2m": 25.0, "t2m_max": 32.0},
            "summer": {"rain_mm": 60, "t2m": 29.5, "t2m_max": 36.5},
        }},
        "provenance": {},
    }


def ids(result):
    return [p["id"] for p in result["plans"]]


def test_season_fit_rejects_long_and_wrong_season_crops():
    assert rule_season_fit(CROPS["pigeon_pea"], "monsoon") is not None  # 200 days > 184
    assert rule_season_fit(CROPS["black_gram"], "monsoon") is not None
    assert rule_season_fit(CROPS["black_gram"], "dry") is None
    assert rule_season_fit(CROPS["monsoon_rice"], "monsoon") is None


def test_summer_rice_needs_irrigation():
    ctx = planner.context_from_field(make_field(irrigated=False))
    assert rule_irrigation_required(CROPS["summer_rice"], "dry", ctx) is not None
    result = planner.plan(make_field(history=("monsoon_rice", "black_gram"), irrigated=False))
    assert all("summer_rice" not in pid for pid in ids(result))


def test_same_crop_penalised_and_legume_break_rewarded():
    ctx = Context(CROPS["monsoon_rice"], True, None, None, None, None, {})
    rice_rice = rule_pest_break(CROPS["summer_rice"], CROPS["monsoon_rice"], ctx)
    assert all(f.points < 0 for f in rice_rice)
    pulse = rule_pest_break(CROPS["black_gram"], CROPS["monsoon_rice"], ctx)
    assert all(f.points > 0 for f in pulse)


def test_existing_rotation_always_returned_with_at_least_three_others():
    result = planner.plan(make_field())
    existing = [p for p in result["plans"] if p["is_existing"]]
    assert len(existing) == 1 and existing[0]["id"] == "summer_rice>monsoon_rice"
    assert len(result["plans"]) == 4


def test_rice_pulse_beats_rice_rice_on_soil():
    result = planner.plan(make_field(), {"income": 0, "soil": 100, "water": 0})
    by_id = {p["id"]: p for p in result["plans"]}
    existing = by_id["summer_rice>monsoon_rice"]
    best = result["plans"][0]
    assert best["score"] > existing["score"]
    assert any(r["rule"] == "Paddy cycle" for r in existing["reasons_against"])


def test_deterministic():
    assert planner.plan(make_field()) == planner.plan(make_field())


def test_priorities_change_ranking():
    returns = {"summer_rice": 900, "monsoon_rice": 800, "black_gram": 300, "green_gram": 250,
               "sesame": 200, "groundnut": 280, "maize": 260, "chickpea": 240}
    income_first = planner.plan(make_field(), {"income": 100, "soil": 0, "water": 0}, returns)
    water_first = planner.plan(make_field(), {"income": 0, "soil": 0, "water": 100}, returns)
    assert income_first["plans"][0]["id"] != water_first["plans"][0]["id"]
    existing_income = next(p for p in income_first["plans"] if p["is_existing"])
    existing_water = next(p for p in water_first["plans"] if p["is_existing"])
    assert existing_income["rank"] < existing_water["rank"]


def test_income_neutral_without_farmer_numbers():
    result = planner.plan(make_field())
    for p in result["plans"]:
        assert p["breakdown"]["income"] is None
        assert p["breakdown"]["weights"]["income"] == 0
    assert "not calculated" in result["income_basis"]


def test_ineligible_baseline_remains_visible():
    result = planner.plan(make_field(irrigated=False))
    existing = next(p for p in result["plans"] if p["is_existing"])
    assert existing["id"] == "summer_rice>monsoon_rice"
    assert existing["eligibility"] == "unsuitable"
    assert existing["score"] is None
    assert existing["reasons_against"]


def test_missing_returns_are_not_assumed_zero():
    result = planner.plan(make_field(), returns={"summer_rice": 1000})
    assert "not calculated" in result["income_basis"]
    assert all(p["breakdown"]["income"] is None for p in result["plans"])


def test_core_delta_comparisons_present():
    result = planner.plan(make_field())
    assert {"summer_rice>monsoon_rice", "black_gram>monsoon_rice", "green_gram>monsoon_rice"} <= set(ids(result))


def test_every_plan_explains_itself():
    for p in planner.plan(make_field())["plans"]:
        assert p["reasons_for"] or p["reasons_against"]
        assert p["evidence"] and p["gaps"] and p["check_locally"]
        assert 0 <= p["score"] <= 100


def test_missing_data_does_not_crash():
    field = {"id": "T-02", "crop_history": ["monsoon_rice", "fallow"], "irrigated": False}
    result = planner.plan(field)
    assert len(result["plans"]) == 4
