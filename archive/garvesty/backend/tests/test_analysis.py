import copy

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.services.analysis import analyse
from app.services import store


client = TestClient(app)


def polygon(lon=95.955, lat=16.735):
    return {"type": "Polygon", "coordinates": [[[lon, lat], [lon + .002, lat],
            [lon + .002, lat + .002], [lon, lat + .002], [lon, lat]]]}


def test_drawn_field_keeps_reference_data_separate_from_farm_claims():
    result = analyse({"geometry": polygon(), "field_context": {"name": "My field"}})
    field = result["field"]
    assert field["name"] == "My field"
    assert field["crop_history"] == []
    assert field["irrigation"] == "unknown"
    assert field["soil"] is None
    assert field["provenance"]["field"]["status"] == "USER-INPUT"
    assert field["weather"] is not None
    assert field["coverage"]["supported"] is True
    assert 4 < field["area_ha"] < 5
    assert field["centroid"] != store.field("F-01")["centroid"]


def test_unsupported_geometry_never_inherits_twante_data():
    result = analyse({"geometry": polygon(0, 0)})
    assert result["field"]["weather"] is None
    assert result["field"]["coverage"]["supported"] is False
    assert result["baseline"]["assessment_status"] == "insufficient_data"
    assert all(p["score"] is None for p in result["baseline"]["plans"])


@pytest.mark.parametrize("geometry", [
    {"type": "Point", "coordinates": [95.9, 16.7]},
    {"type": "Polygon", "coordinates": [[[95, 16], [96, 17], [95, 17], [96, 16], [95, 16]]]},
    {"type": "Polygon", "coordinates": [[[181, 16], [182, 16], [182, 17], [181, 16]]]},
    {"type": "Polygon", "coordinates": [[[95, 16], [96, 16], [96, 17]]]},
])
def test_api_rejects_invalid_polygons(geometry):
    response = client.post("/api/analysis", json={"geometry": geometry})
    assert response.status_code == 422


def test_request_requires_exactly_one_field_source():
    assert client.post("/api/analysis", json={}).status_code == 422
    assert client.post("/api/analysis", json={"field_id": "F-01", "geometry": polygon()}).status_code == 422
    assert client.post("/api/analysis", json={"field_id": "missing"}).status_code == 404


def test_scenario_does_not_mutate_source_or_moisture_measurements():
    original = copy.deepcopy(store.field("F-01"))
    result = analyse({"field_id": "F-01", "scenario": {
        "rainfall_change_percent": -20, "planting_delay_days": 14,
        "irrigation": "unavailable", "drainage": "poor"}})
    assert store.field("F-01") == original
    assert result["field"]["wetness"] == original["wetness"]
    assert result["scenario"] is not None
    assert result["scenario"]["assumptions"]["rainfall_change_percent"] == -20
    assert any("planting" in x.lower() for x in result["limitations"])
    baseline = {p["id"]: p for p in result["baseline"]["plans"]}
    changed = {p["id"]: p for p in result["scenario"]["plans"]}
    assert changed["green_gram>monsoon_rice"]["score"] < baseline["green_gram>monsoon_rice"]["score"]


def test_fixed_snapshot_is_reproducible_and_has_completed_steps():
    one = analyse({"field_id": "F-01"})
    two = analyse({"field_id": "F-01"})
    assert one["analysis_id"] == two["analysis_id"]
    assert one["baseline"] == two["baseline"]
    assert one["engine_version"]
    assert all(step["status"] in ("complete", "unavailable") for step in one["processing"])


def test_api_validates_scenarios_and_crop_ids():
    assert client.post("/api/analysis", json={"field_id": "F-01", "scenario": {
        "rainfall_change_percent": -101}}).status_code == 422
    assert client.post("/api/analysis", json={"geometry": polygon(), "field_context": {
        "crop_history": ["invented_crop"]}}).status_code == 422
    response = client.post("/api/analysis", json={"field_id": "F-01"})
    assert response.status_code == 200
    assert response.json()["field"]["id"] == "F-01"
