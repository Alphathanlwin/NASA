import pytest
from fastapi.testclient import TestClient

from app.engine.timeseries_hybrid import (
    SoilPhysicsBucketModel,
    ConformalTimeSeriesCalibrator,
    ExtendedKalmanSatelliteFilter,
    predict_rootzone_recession,
)
from app.services import iot
from app.main import app


client = TestClient(app)


def test_soil_physics_conservation_and_decay():
    model = SoilPhysicsBucketModel(soil_texture="clay", root_depth_m=0.6)
    
    # Check PET calculation is physically plausible for delta latitude (16.7°)
    pet = model.compute_hargreaves_samani_pet(t_mean=28.0, t_max=32.0, t_min=24.0, lat_deg=16.7, day_of_year=320)
    assert 1.0 <= pet <= 10.0

    # Under zero rainfall, moisture must strictly decay (recede)
    initial_s = 0.80
    next_s = model.step(initial_s, rain_mm=0.0, pet_mm=4.0, kc=0.7)
    assert 0.0 < next_s < initial_s
    assert 0.05 <= next_s <= 1.0


def test_conformal_calibrator_bounds():
    calibrator = ConformalTimeSeriesCalibrator(alpha=0.10)
    point = 0.55
    low, high = calibrator.get_prediction_interval(point, horizon_step=7)
    
    assert low < point < high
    assert 0.0 <= low
    assert high <= 1.0

    # Uncertainty margin must expand with longer horizons
    _, high_early = calibrator.get_prediction_interval(point, horizon_step=1)
    _, high_late = calibrator.get_prediction_interval(point, horizon_step=28)
    assert high_late > high_early


def test_kalman_filter_state_update():
    ekf = ExtendedKalmanSatelliteFilter(initial_moisture=0.60)
    ekf.predict(physical_decay_rate=0.98)
    assert ekf.x < 0.60
    prior_p = ekf.p

    # Observe higher satellite reading
    updated_x, updated_p = ekf.update(0.75, sensor_type="smap")
    assert updated_x > 0.60 * 0.98  # Pulled toward observation
    assert updated_p < prior_p      # Uncertainty reduced


def test_predict_rootzone_recession_full_pipeline():
    recent_weather = {"t2m": 27.5, "t2m_max": 33.0, "t2m_min": 22.0}
    res = predict_rootzone_recession(
        current_rootzone_wetness=0.72,
        recent_weather=recent_weather,
        days_forward=28,
        soil_texture="clay",
        confidence_level=0.90
    )

    assert res["days_forward"] == 28
    assert len(res["trajectory"]) == 28
    assert res["confidence_level"] == 0.90
    assert "critical_desaturation_day" in res
    assert res["terminal_wetness_point"] < res["initial_wetness"]

    for pt in res["trajectory"]:
        assert pt["wetness_lower_ci"] <= pt["wetness_point"] <= pt["wetness_upper_ci"]


def test_iot_telemetry_and_alerts():
    tel = iot.get_field_telemetry("F-01")
    assert tel is not None
    assert tel["telemetry"]["device_id"] == "GW-TW01"
    assert tel["fusion_status"] == "GROUND_TRUTH_SYNCHRONIZED"
    assert 0 <= tel["battery_percentage"] <= 100
    assert tel["signal_quality"] in ("strong", "moderate", "weak")

    # Record packet with high salinity to verify alert triggering
    packet = iot.IoTTelemetryPacket(
        device_id="GW-TEST",
        field_id="F-TEST",
        soil_moisture_10cm_vwc=0.20,
        soil_moisture_40cm_vwc=0.22,
        soil_temp_c=29.0,
        salinity_ec_ds_m=2.8
    )
    res = iot.record_telemetry(packet)
    assert len(res["alerts"]) >= 2
    types = [a["type"] for a in res["alerts"]]
    assert "salinity_intrusion" in types
    assert "desaturation_drought" in types


def test_unified_analysis_includes_hybrid_nowcast_and_iot():
    poly = {
        "type": "Polygon",
        "coordinates": [[[95.955, 16.735], [95.957, 16.735], [95.957, 16.737], [95.955, 16.737], [95.955, 16.735]]]
    }
    # Test with custom field
    res = client.post("/api/analysis", json={"geometry": poly, "field_context": {"name": "Hybrid Test Farm"}})
    assert res.status_code == 200
    data = res.json()

    assert "hydrological_trajectory" in data
    assert data["hydrological_trajectory"] is not None
    assert len(data["hydrological_trajectory"]["trajectory"]) == 28

    # Test with pre-defined field F-01 which has in-situ IoT probe
    res_f1 = client.post("/api/analysis", json={"field_id": "F-01"})
    assert res_f1.status_code == 200
    data_f1 = res_f1.json()
    assert "iot_telemetry" in data_f1
    assert data_f1["iot_telemetry"] is not None
    assert data_f1["iot_telemetry"]["fusion_status"] == "GROUND_TRUTH_SYNCHRONIZED"


def test_api_timeseries_and_iot_endpoints():
    res_nowcast = client.get("/api/timeseries/hybrid-nowcast?field_id=F-01&days_forward=21")
    assert res_nowcast.status_code == 200
    assert res_nowcast.json()["days_forward"] == 21

    res_devices = client.get("/api/iot/devices")
    assert res_devices.status_code == 200
    assert len(res_devices.json()) >= 2

    res_f1_iot = client.get("/api/fields/F-01/iot")
    assert res_f1_iot.status_code == 200
    assert res_f1_iot.json()["telemetry"]["device_id"] == "GW-TW01"

    new_packet = {
        "device_id": "GW-TW01",
        "field_id": "F-01",
        "soil_moisture_10cm_vwc": 0.38,
        "soil_moisture_40cm_vwc": 0.44,
        "soil_temp_c": 27.5,
        "salinity_ec_ds_m": 0.9,
        "battery_mv": 3850,
        "rssi_dbm": -70
    }
    post_res = client.post("/api/fields/F-01/iot", json=new_packet)
    assert post_res.status_code == 200
    assert post_res.json()["telemetry"]["soil_moisture_40cm_vwc"] == 0.44

    # Test regional Paw San coverage endpoint
    res_pawsan = client.get("/api/regional/pawsan-coverage")
    assert res_pawsan.status_code == 200
    data_pawsan = res_pawsan.json()
    assert data_pawsan["dataset"] == "pawsan-ayeyarwady"
    assert len(data_pawsan["modis_townships"]) == 7
    assert len(data_pawsan["smap_townships_passing"]) == 3
    assert len(data_pawsan["smap_townships_zero_passing"]) == 4

