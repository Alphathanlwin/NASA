"""Unified Analysis Service for Garvesty.

Provides deterministic rotation analysis for either pre-defined fields or
user-drawn custom field geometries, with scenario comparisons, traceability,
and gating for out-of-coverage areas.
"""
import copy
import hashlib
import json
import math
from typing import Any

from app.engine.crops import CROPS
from app.engine import planner, timeseries_hybrid
from app.services import iot, store

ENGINE_VERSION = "1.2.0"
COVERAGE_BBOX = {"min_lat": 16.2, "max_lat": 17.2, "min_lon": 95.5, "max_lon": 96.6}


def ccw(A, B, C):
    return (C[1] - A[1]) * (B[0] - A[0]) > (B[1] - A[1]) * (C[0] - A[0])


def segments_intersect(A, B, C, D):
    return ccw(A, C, D) != ccw(B, C, D) and ccw(A, B, C) != ccw(A, B, D)


def validate_geometry(geom: dict) -> list[list[float]]:
    """Validate GeoJSON Polygon geometry. Raises ValueError on invalid geometry."""
    if not isinstance(geom, dict) or geom.get("type") != "Polygon":
        raise ValueError("Geometry must be a GeoJSON Polygon")

    coords = geom.get("coordinates")
    if not isinstance(coords, list) or len(coords) < 1 or not isinstance(coords[0], list):
        raise ValueError("Polygon coordinates must contain at least an exterior ring")

    ring = coords[0]
    if len(ring) < 4:
        raise ValueError("Polygon exterior ring must have at least 4 coordinates")

    if ring[0] != ring[-1]:
        raise ValueError("Polygon exterior ring must be closed (first coordinate equals last)")

    for pt in ring:
        if not isinstance(pt, (list, tuple)) or len(pt) < 2:
            raise ValueError("Coordinates must be [lon, lat] pairs")
        lon, lat = pt[0], pt[1]
        if not (isinstance(lon, (int, float)) and isinstance(lat, (int, float)) and math.isfinite(lon) and math.isfinite(lat)):
            raise ValueError("Coordinates must be finite numeric values")
        if not (-180.0 <= lon <= 180.0 and -90.0 <= lat <= 90.0):
            raise ValueError(f"Coordinate [{lon}, {lat}] is out of bounds")

    # Check for self-intersections
    n = len(ring) - 1
    for i in range(n):
        p1, p2 = ring[i], ring[i + 1]
        for j in range(i + 2, n):
            if i == 0 and j == n - 1:
                continue
            p3, p4 = ring[j], ring[j + 1]
            if segments_intersect(p1, p2, p3, p4):
                raise ValueError("Polygon exterior ring cannot be self-intersecting")

    return ring


def compute_polygon_metrics(ring: list[list[float]]) -> tuple[list[float], float]:
    """Calculate [lat, lon] centroid and area in hectares."""
    pts = ring[:-1]
    n = len(pts)
    mean_lon = sum(p[0] for p in pts) / n
    mean_lat = sum(p[1] for p in pts) / n
    centroid = [round(mean_lat, 6), round(mean_lon, 6)]

    # Projected planar area in m2 using centroid latitude
    rad = math.radians(mean_lat)
    cos_lat = math.cos(rad)
    m_per_deg_lat = 110540.0
    m_per_deg_lon = 111320.0 * cos_lat

    area_m2 = 0.0
    for i in range(n):
        x1 = pts[i][0] * m_per_deg_lon
        y1 = pts[i][1] * m_per_deg_lat
        x2 = pts[(i + 1) % n][0] * m_per_deg_lon
        y2 = pts[(i + 1) % n][1] * m_per_deg_lat
        area_m2 += (x1 * y2 - x2 * y1)

    area_ha = round(abs(area_m2) / 20000.0, 3)  # Shoelace / 2 -> m2, / 10000 -> ha
    return centroid, max(0.001, area_ha)


def analyse(payload: dict[str, Any]) -> dict[str, Any]:
    """Unified analysis function."""
    has_fid = "field_id" in payload and payload["field_id"] is not None
    has_geom = "geometry" in payload and payload["geometry"] is not None

    if (has_fid and has_geom) or (not has_fid and not has_geom):
        raise ValueError("Request must specify exactly one of 'field_id' or 'geometry'")

    field_ctx = payload.get("field_context") or {}
    priorities = payload.get("priorities")
    returns = payload.get("returns")
    scenario_req = payload.get("scenario")

    # Validate crop history in field_context
    if "crop_history" in field_ctx:
        for cid in field_ctx["crop_history"]:
            if cid not in CROPS:
                raise ValueError(f"Unknown crop ID in crop_history: '{cid}'")

    # Validate scenario assumptions
    if scenario_req:
        rf_pct = scenario_req.get("rainfall_change_percent")
        if rf_pct is not None and (rf_pct < -100 or rf_pct > 500):
            raise ValueError("Scenario rainfall_change_percent must be >= -100")
        fert = scenario_req.get("fertilizer")
        if fert is not None and fert not in ("normal", "expensive", "unavailable"):
            raise ValueError("Scenario fertilizer must be one of: normal, expensive, unavailable")
        pest = scenario_req.get("pesticide")
        if pest is not None and pest not in ("available", "unavailable"):
            raise ValueError("Scenario pesticide must be one of: available, unavailable")
        cash = scenario_req.get("cash")
        if cash is not None and cash not in ("normal", "tight"):
            raise ValueError("Scenario cash must be one of: normal, tight")

    processing = [
        {"step": "input_validation", "status": "complete", "details": "Validated request payload and constraints"}
    ]

    limitations = []

    # 1. Resolve field
    if has_fid:
        fid = payload["field_id"]
        stored = store.field(fid)
        if not stored:
            raise KeyError(f"Field '{fid}' not found")
        # Deep copy to ensure no store mutations
        field = copy.deepcopy(stored)
        supported = True
        processing.append({"step": "field_resolution", "status": "complete", "details": f"Loaded predefined field {fid}"})
    else:
        ring = validate_geometry(payload["geometry"])
        centroid, area_ha = compute_polygon_metrics(ring)
        lat, lon = centroid[0], centroid[1]

        supported = (COVERAGE_BBOX["min_lat"] <= lat <= COVERAGE_BBOX["max_lat"] and
                     COVERAGE_BBOX["min_lon"] <= lon <= COVERAGE_BBOX["max_lon"])

        field = {
            "id": "drawn-field",
            "name": field_ctx.get("name", "Drawn field"),
            "geometry": payload["geometry"],
            "centroid": centroid,
            "area_ha": area_ha,
            "crop_history": list(field_ctx.get("crop_history", [])),
            "irrigation": field_ctx.get("irrigation", "unknown"),
            "drainage": field_ctx.get("drainage", "unknown"),
            "soil": None,
            "provenance": {"field": {"status": "USER-INPUT"}},
            "coverage": {
                "supported": supported,
                "region": "Twante / Yangon Delta" if supported else "Outside supported observation coverage"
            },
        }

        if supported:
            # Attach representative weather/climatology from nearest cell
            ref = store.field("F-01") or {}
            field["weather"] = copy.deepcopy(ref.get("weather"))
            field["wetness"] = copy.deepcopy(ref.get("wetness"))
            field["climatology"] = copy.deepcopy(ref.get("climatology"))
            processing.append({"step": "environmental_retrieval", "status": "complete", "details": "Attached regional NASA POWER climatology"})
        else:
            field["weather"] = None
            field["wetness"] = None
            field["climatology"] = None
            limitations.append("Geometry is outside supported regional observation coverage; satellite layers unavailable.")
            processing.append({"step": "environmental_retrieval", "status": "unavailable", "details": "Out of observation coverage"})

    # 1.5 IoT In-Situ Ground Truth Telemetry Fusion
    iot_telemetry = None
    if field.get("id"):
        iot_telemetry = iot.get_field_telemetry(field["id"])
        if iot_telemetry and iot_telemetry.get("telemetry"):
            tel = iot_telemetry["telemetry"]
            for alert in iot_telemetry.get("alerts", []):
                limitations.append(f"IoT Sensor Alert [{alert['severity']}]: {alert['message']}")
            processing.append({
                "step": "iot_sensor_fusion",
                "status": "complete",
                "details": f"Fused in-situ ground truth from {tel.get('device_id')} (VWC: {tel.get('soil_moisture_40cm_vwc')}, EC: {tel.get('salinity_ec_ds_m')} dS/m)"
            })

    # 2. Hybrid Hydrological Time-Series Nowcasting
    soil_texture = "clay"
    if field.get("soil") and field["soil"].get("texture"):
        soil_texture = str(field["soil"]["texture"]).lower()

    hydrological_nowcast = None
    if supported and field.get("weather"):
        current_wet = 0.70
        if field.get("wetness") and field["wetness"].get("gwetroot") is not None:
            current_wet = float(field["wetness"]["gwetroot"])
        elif field["weather"].get("rain_7d") is not None:
            current_wet = min(0.9, 0.4 + field["weather"]["rain_7d"] / 100.0)

        ndvi = field.get("ndvi") or {}
        ndvi_val = float(ndvi.get("value")) if ndvi.get("value") is not None else None
        clim_months = (field.get("climatology") or {}).get("months")

        hydrological_nowcast = timeseries_hybrid.predict_rootzone_recession(
            current_rootzone_wetness=current_wet,
            recent_weather=field["weather"],
            climatology_monthly=clim_months,
            soil_texture=soil_texture,
            days_forward=28,
            confidence_level=0.90,
            current_ndvi=ndvi_val,
            ndvi_series=ndvi.get("series") or [],
        )
        processing.append({
            "step": "hydrological_time_series_hybrid",
            "status": "complete",
            "details": f"Computed 28-day FAO-56 PET recession trajectory with 90% conformal calibration (risk: {hydrological_nowcast['desaturation_risk']})"
        })

    # 3. Baseline Plan
    if supported and field.get("climatology"):
        baseline_plan = planner.plan(field, priorities, returns)
        baseline_assessment = "complete"
    else:
        baseline_plan = planner.plan(field, priorities, returns)
        baseline_assessment = "insufficient_data"
        # Null out plan scores when data is insufficient
        for p in baseline_plan.get("plans", []):
            p["score"] = None
        limitations.append("Baseline assessment marked insufficient_data due to missing environmental series.")

    baseline_result = {
        "assessment_status": baseline_assessment,
        **baseline_plan
    }
    processing.append({"step": "rotation_planning", "status": "complete", "details": "Computed candidate rotation scores and trade-offs"})

    # 4. Scenario Projection (if requested)
    scenario_result = None
    if scenario_req:
        scenario_field = copy.deepcopy(field)
        assumptions = dict(scenario_req)

        # Apply rainfall modification to climatology rain_mm
        rf_change = scenario_req.get("rainfall_change_percent")
        if rf_change is not None and scenario_field.get("climatology"):
            clim = scenario_field["climatology"]
            factor = max(0.0, 1.0 + (rf_change / 100.0))
            for sname, sdata in (clim.get("seasons") or {}).items():
                if "rain_mm" in sdata and sdata["rain_mm"] is not None:
                    sdata["rain_mm"] = round(sdata["rain_mm"] * factor, 1)

        # Apply irrigation/drainage overrides
        if "irrigation" in scenario_req:
            scenario_field["irrigation"] = scenario_req["irrigation"]
            scenario_field["irrigated"] = (scenario_req["irrigation"] == "available")
        if "drainage" in scenario_req:
            scenario_field["drainage"] = scenario_req["drainage"]

        if scenario_req.get("planting_delay_days"):
            limitations.append(f"Planting delay (+{scenario_req['planting_delay_days']} days) tested: delayed sowing compresses post-monsoon establishment window.")

        # Farmer-reported input shocks (Rule 9). The satellite cannot see input
        # prices or availability, so these come from the farmer, never inferred.
        if scenario_req.get("fertilizer") in ("expensive", "unavailable"):
            limitations.append(f"Scenario assumes fertilizer {scenario_req['fertilizer']} (farmer-reported); rankings favour low-input rotations.")
        if scenario_req.get("pesticide") == "unavailable":
            limitations.append("Scenario assumes pesticide unavailable (farmer-reported); the rotation break is the pest control.")
        if scenario_req.get("cash") == "tight":
            limitations.append("Scenario assumes cash is tight (farmer-reported); rankings favour low bought-input rotations.")

        if supported and scenario_field.get("climatology"):
            scenario_plan = planner.plan(scenario_field, priorities, returns, scenario=scenario_req)
            scenario_status = "complete"
        else:
            scenario_plan = planner.plan(scenario_field, priorities, returns, scenario=scenario_req)
            scenario_status = "insufficient_data"
            for p in scenario_plan.get("plans", []):
                p["score"] = None

        scenario_result = {
            "status": scenario_status,
            "assumptions": assumptions,
            **scenario_plan
        }
        processing.append({"step": "scenario_projection", "status": "complete", "details": "Calculated scenario response under explicit assumptions"})
    else:
        processing.append({"step": "scenario_projection", "status": "unavailable", "details": "No scenario requested"})

    # 5. Time context: what happened, what is happening, what will happen.
    # Present is the main decision input; past is dated evidence from the
    # cleaned series; future is the physics projection (assumptions stated,
    # never an ML forecast and never a prediction of rain).
    stored_tc = field.get("time_context") or {}
    time_context = {
        "present": stored_tc.get("present"),
        "past": stored_tc.get("past", []),
        "future": None,
    }
    if hydrological_nowcast:
        time_context["future"] = {
            "days_forward": hydrological_nowcast["days_forward"],
            "initial_wetness": hydrological_nowcast["initial_wetness"],
            "terminal_wetness_point": hydrological_nowcast["terminal_wetness_point"],
            "critical_desaturation_day": hydrological_nowcast["critical_desaturation_day"],
            "desaturation_risk": hydrological_nowcast["desaturation_risk"],
            "assumptions": "Physics bucket recession (FAO-56 PET), dry-season rain assumed 0.0 mm/day, "
                           "starting mid-November; conformal 90% intervals in the trajectory. "
                           "A projection, not a forecast of rain.",
            "trajectory": hydrological_nowcast["trajectory"],
        }
    processing.append({"step": "time_context", "status": "complete",
                       "details": "Assembled past events, present state and 28-day projection"})

    # Deterministic analysis ID based on canonical input hash
    hash_key = json.dumps({
        "field_id": field.get("id"),
        "centroid": field.get("centroid"),
        "area_ha": field.get("area_ha"),
        "priorities": priorities,
        "returns": returns,
        "scenario": scenario_req
    }, sort_keys=True)
    analysis_id = "ana_" + hashlib.sha256(hash_key.encode("utf-8")).hexdigest()[:16]

    return {
        "analysis_id": analysis_id,
        "engine_version": ENGINE_VERSION,
        "field": field,
        "baseline": baseline_result,
        "scenario": scenario_result,
        "hydrological_trajectory": hydrological_nowcast,
        "time_context": time_context,
        "iot_telemetry": iot_telemetry,
        "limitations": limitations,
        "processing": processing,
    }
