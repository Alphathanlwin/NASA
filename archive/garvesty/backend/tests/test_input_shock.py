"""Rule 9 (input shock adaptation) and the three-tenses time context.

Farmer-reported input conditions (fertilizer, pesticide, cash) re-rank the
rotation under a shock. The satellite cannot see these; the farmer reports
them in the scenario. With no shock the rule emits nothing, so the baseline
is unchanged.
"""
import pytest

from app.engine import planner
from app.engine.crops import CROPS
from app.engine.rules import Context, rule_input_shock
from app.services.analysis import analyse


def make_field(history=("monsoon_rice", "summer_rice"), irrigated=True, ph=6.0, gwetroot=0.71):
    return {
        "id": "T-01", "crop_history": list(history), "irrigated": irrigated,
        "soil": {"ph": ph}, "wetness": {"gwetroot": gwetroot},
        "climatology": {"seasons": {
            "monsoon": {"rain_mm": 1702, "t2m": 28.1, "t2m_max": 30.1},
            "winter": {"rain_mm": 42, "t2m": 26.5, "t2m_max": 30.4},
            "summer": {"rain_mm": 46, "t2m": 30.3, "t2m_max": 35.8},
        }},
        "provenance": {},
    }


def by_id(result):
    return {p["id"]: p for p in result["plans"]}


def test_no_shock_emits_nothing():
    ctx = Context(CROPS["monsoon_rice"], True, 6.0, 0.71, 1702, 88, {})
    assert rule_input_shock(CROPS["black_gram"], CROPS["monsoon_rice"], ctx) == []
    assert rule_input_shock(CROPS["summer_rice"], CROPS["monsoon_rice"], ctx) == []


def test_fertilizer_unavailable_lifts_legumes_and_drops_rice():
    base = by_id(planner.plan(make_field()))
    shock = by_id(planner.plan(make_field(), scenario={"fertilizer": "unavailable"}))
    legume = shock["black_gram>monsoon_rice"]
    rice = shock["summer_rice>monsoon_rice"]
    # Legume +12, monsoon rice -10 -> net +2; rice + rice -> -20.
    assert legume["breakdown"]["adjustment"] - base["black_gram>monsoon_rice"]["breakdown"]["adjustment"] == 2
    assert rice["breakdown"]["adjustment"] - base["summer_rice>monsoon_rice"]["breakdown"]["adjustment"] == -20
    assert legume["score"] > base["black_gram>monsoon_rice"]["score"]
    assert rice["score"] < base["summer_rice>monsoon_rice"]["score"]
    assert any(r["rule"] == "Input shock adaptation" and "farmer-reported" in r["text"]
               for r in legume["reasons_for"])


def test_pesticide_unavailable_rewards_breaks_and_penalises_repeats():
    base = by_id(planner.plan(make_field()))
    shock = by_id(planner.plan(make_field(), scenario={"pesticide": "unavailable"}))
    # Black gram breaks the pest cycle across families (+6); rice after rice has no break (-8).
    assert shock["black_gram>monsoon_rice"]["breakdown"]["adjustment"] - base["black_gram>monsoon_rice"]["breakdown"]["adjustment"] == 6
    assert shock["summer_rice>monsoon_rice"]["breakdown"]["adjustment"] - base["summer_rice>monsoon_rice"]["breakdown"]["adjustment"] == -8


def test_cash_tight_favours_low_input():
    legume_pair = rule_input_shock(CROPS["black_gram"], CROPS["green_gram"],
                                   Context(CROPS["monsoon_rice"], True, 6.0, 0.71, 1702, 88, {}, cash="tight"))
    assert sum(f.points for f in legume_pair) == 12
    rice_pair = rule_input_shock(CROPS["summer_rice"], CROPS["monsoon_rice"],
                                 Context(CROPS["monsoon_rice"], True, 6.0, 0.71, 1702, 88, {}, cash="tight"))
    assert sum(f.points for f in rice_pair) == -16


def test_existing_rotation_never_hidden_under_combined_shock():
    result = planner.plan(make_field(), scenario={
        "fertilizer": "unavailable", "pesticide": "unavailable", "cash": "tight"})
    existing = [p for p in result["plans"] if p["is_existing"]]
    assert len(existing) == 1 and existing[0]["id"] == "summer_rice>monsoon_rice"
    assert any("farmer-reported" in g for p in result["plans"] for g in p["gaps"])


def test_analysis_validates_input_shock_values():
    with pytest.raises(ValueError):
        analyse({"field_id": "F-01", "scenario": {"fertilizer": "free"}})
    with pytest.raises(ValueError):
        analyse({"field_id": "F-01", "scenario": {"pesticide": "sometimes"}})
    with pytest.raises(ValueError):
        analyse({"field_id": "F-01", "scenario": {"cash": "rich"}})


def test_analysis_scenario_carries_input_shock_and_time_context():
    result = analyse({"field_id": "F-01", "scenario": {
        "fertilizer": "unavailable", "pesticide": "unavailable", "cash": "tight"}})
    assert result["scenario"] is not None
    assert result["scenario"]["assumptions"]["fertilizer"] == "unavailable"
    assert any("fertilizer unavailable" in x for x in result["limitations"])
    assert any("pesticide unavailable" in x for x in result["limitations"])
    assert any("cash is tight" in x for x in result["limitations"])
    tc = result["time_context"]
    assert tc["future"] is not None
    assert tc["future"]["desaturation_risk"] in ("low", "moderate", "critical")
    assert tc["present"] is not None
    assert tc["present"]["as_of"] == "2026-11-10"
    assert tc["present"]["gwetroot"] == 0.71
    assert isinstance(tc["past"], list) and len(tc["past"]) >= 1
    assert all("type" in e for e in tc["past"])
