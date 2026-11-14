# AI-assisted: Claude Code
"""Data and provenance properties: what the interface is allowed to claim."""
import json
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[2]
SNAP = json.loads((ROOT / "frontend" / "public" / "snapshot.json").read_text(encoding="utf-8"))
STATUSES = {"LIVE", "CACHED", "DEMO", "UNAVAILABLE", "USER-INPUT"}
PROV_KEYS = {"dataset", "product", "spatial_resolution", "retrieved_at", "status", "scale"}


def fields():
    return SNAP["fields"].values()


def test_four_fields_one_per_reference_town():
    towns = sorted(f["town_id"] for f in fields())
    assert towns == ["bogale", "myaungmya", "pathein", "twante"]
    for f in fields():
        assert f["nearest_reference"].startswith("Nearest reference:")
        assert "not a field measurement" in f["nearest_reference"]


def test_every_value_has_complete_provenance():
    for f in fields():
        for key, value in f["values"].items():
            source = value.get("source")
            assert source, f"{f['id']}.{key} has no source"
            prov = f["provenance"][source]
            assert PROV_KEYS <= set(prov), f"{f['id']}.{key} provenance incomplete"
            assert value.get("variable")
            assert value.get("unit")
            assert prov["status"] in STATUSES
            assert prov["scale"]


def test_no_power_fill_values_survive():
    for f in fields():
        for key, value in f["values"].items():
            assert value["value"] not in (-999, -99, "-999", "-99"), f"{f['id']}.{key} still has a fill value"


def test_sources_are_complete_and_retrieved_dates_recorded():
    assert len(SNAP["sources"]) >= 10
    for s in SNAP["sources"]:
        for key in ("id", "name", "product", "version", "variables", "spatial_resolution",
                    "period", "url", "licence", "used_for"):
            assert s.get(key) not in (None, ""), f"{s.get('id')} missing {key}"
    cached = [s for s in SNAP["sources"] if s["id"] in ("power_recent", "power_history", "modis", "soilgrids")]
    assert all(s["retrieved_at"] for s in cached)


def test_snapshot_plans_are_three_with_baseline():
    for f in fields():
        plans = f["plans"]["plans"]
        assert len(plans) == 3
        assert any(p["is_baseline"] for p in plans)
        assert round(sum(f["plans"]["weights"].values()), 6) == 100.0
        for p in plans:
            assert 0 <= p["score"] <= 100
            assert p["engine_version"] == SNAP["engine_version"]


def test_agent_log_is_nine_steps_and_scripted():
    for f in fields():
        run = f["agent_run"]
        assert len(run["events"]) == 9
        assert run["metaphor"] == "Visualises the analysis steps"
        assert "not real time" in run["sim_clock_note"]


def test_no_yield_or_profit_fields_in_results():
    forbidden = {"yield", "yield_kg", "profit", "revenue", "price_forecast"}
    for f in fields():
        assert not (forbidden & set(f["plans"]))


@pytest.mark.parametrize("field_id", ["F-01", "F-02", "F-03", "F-04"])
def test_scenarios_cover_required_controls(field_id):
    scenarios = SNAP["fields"][field_id]["scenarios"]
    ids = {s["id"] for s in scenarios}
    assert {"delay_0", "delay_7", "delay_14", "moisture_low", "drainage_poor", "rainfall_minus_20"} <= ids


def test_crop_table_flags_verification():
    table = json.loads((ROOT / "backend" / "app" / "engine" / "crops.json").read_text(encoding="utf-8"))
    for cid, crop in table["crops"].items():
        for key, value in crop.items():
            if isinstance(value, dict) and "source" in value:
                assert isinstance(value["verified"], bool), f"{cid}.{key}"
                assert value["source"], f"{cid}.{key}"
