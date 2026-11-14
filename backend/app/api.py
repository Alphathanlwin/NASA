import copy
import json
from pathlib import Path

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from .engine import agent, planner, timeseries_hybrid
from .engine.crops import CROPS, SLOTS
from .services import analysis, iot, models, power, store

router = APIRouter(prefix="/api")


class Priorities(BaseModel):
    income: float = Field(40, ge=0, le=100)
    soil: float = Field(30, ge=0, le=100)
    water: float = Field(30, ge=0, le=100)


class PlanRequest(BaseModel):
    priorities: Priorities = Priorities()
    # The farmer's own expected return per acre, per crop id. Never filled in by the app.
    returns: dict[str, float] | None = None


def field_or_404(field_id: str) -> dict:
    rec = store.field(field_id)
    if rec is None:
        raise HTTPException(404, f"Unknown field {field_id}")
    return rec


def with_live_weather(rec: dict, live: bool = True) -> dict:
    """Copy of the snapshot record; weather and wetness replaced by a live POWER read when it works."""
    out = copy.deepcopy(rec)
    if not live:
        return out
    lat, lon = rec["centroid"]
    fresh = power.fetch_recent(rec["power_cell"], lat, lon)
    if not fresh:
        return out
    clim_month = (rec.get("weather") or {}).get("clim_month")
    month = int(fresh["weather"]["as_of"][5:7])
    months = (rec.get("climatology") or {}).get("months") or []
    clim_month = next((m for m in months if m["month"] == month), clim_month)
    out["weather"] = {**fresh["weather"], "clim_month": clim_month}
    for name, block in (("weather", fresh["weather"]), ("wetness", fresh["wetness"])):
        if block is None:
            continue
        if name == "wetness":
            out["wetness"] = block
        out["provenance"][name] = {**(out["provenance"].get(name) or {}), "status": "LIVE",
                                   "as_of": block["as_of"], "retrieved_utc": fresh["retrieved_utc"],
                                   "version": fresh["api_version"] or (out["provenance"].get(name) or {}).get("version")}
    return out


@router.get("/health")
def health():
    snap = store.snapshot()
    return {"status": "ok", "fields": len(snap["fields"]), "snapshot_generated_utc": snap["generated_utc"],
            "power_live": power.last_status}


@router.get("/fields")
def fields():
    return store.geojson()


@router.get("/crops")
def crops():
    return {"slots": SLOTS,
            "crops": [{"id": c.id, "name": c.name, "family": c.family, "slots": c.slots,
                       "duration_days": c.duration_days, "water_class": c.water_class, "legume": c.legume,
                       "input_cost": c.input_cost}
                      for c in CROPS.values()]}


@router.get("/fields/{field_id}")
def field_detail(field_id: str, live: bool = True):
    return with_live_weather(field_or_404(field_id), live)


@router.get("/fields/{field_id}/timeseries")
def timeseries(field_id: str, param: str = Query("PRECTOTCORR"), days: int = Query(120, ge=7, le=731)):
    rec = field_or_404(field_id)
    df = store.power_daily()
    if df is None or param not in df.columns:
        raise HTTPException(404, f"No series for {param}")
    cell = df[df["cell"] == rec["power_cell"]].tail(days)
    values = [None if v != v else round(float(v), 2) for v in cell[param]]
    return {"field_id": field_id, "param": param, "dates": [str(d.date()) for d in cell["date"]],
            "values": values, "source": "NASA POWER daily (modelled), cleaned", "status": "CACHED"}


@router.post("/fields/{field_id}/plan")
def plan(field_id: str, body: PlanRequest, live: bool = True):
    rec = with_live_weather(field_or_404(field_id), live)
    return planner.plan(rec, body.priorities.model_dump(), body.returns)


@router.get("/fields/{field_id}/agent-run")
def agent_run(field_id: str, live: bool = True):
    rec = with_live_weather(field_or_404(field_id), live)
    return agent.build_run(rec, store.agent_base())


@router.post("/analysis")
def post_analysis(payload: dict):
    try:
        return analysis.analyse(payload)
    except KeyError as e:
        raise HTTPException(404, str(e))
    except ValueError as e:
        raise HTTPException(422, str(e))


@router.get("/models/status")
def models_status():
    return models.get_model_status()


@router.get("/datasets/status")
def datasets_status():
    snap = store.snapshot()
    first = next(iter(snap["fields"].values()), {})
    prov = first.get("provenance") or {}
    layers = []
    for name in ("weather", "wetness", "soil", "smap", "ndvi", "field"):
        p = dict(prov.get(name) or {})
        if name in ("weather", "wetness") and power.last_status["ok"]:
            p["status"] = "LIVE"
        layers.append({"layer": name, **p})
    return {"layers": layers, "power_live": power.last_status, "cleaning_report": store.cleaning_report()}


@router.get("/timeseries/hybrid-nowcast")
def hybrid_nowcast(field_id: str = "F-01", days_forward: int = Query(28, ge=7, le=60)):
    rec = field_or_404(field_id)
    wetness = rec.get("wetness") or {}
    weather = rec.get("weather") or {}
    soil = rec.get("soil") or {}
    
    current_wet = float(wetness.get("gwetroot", 0.70))
    texture = str(soil.get("texture", "clay")).lower()
    
    return timeseries_hybrid.predict_rootzone_recession(
        current_rootzone_wetness=current_wet,
        recent_weather=weather,
        soil_texture=texture,
        days_forward=days_forward,
        confidence_level=0.90
    )


@router.get("/iot/devices")
def get_iot_devices():
    return iot.list_devices()


@router.get("/fields/{field_id}/iot")
def get_field_iot(field_id: str):
    field_or_404(field_id)
    data = iot.get_field_telemetry(field_id)
    if not data:
        raise HTTPException(404, f"No active in-situ IoT telemetry registered for field {field_id}")
    return data


@router.post("/fields/{field_id}/iot")
def post_field_iot(field_id: str, packet: iot.IoTTelemetryPacket):
    if packet.field_id != field_id:
        raise HTTPException(422, f"Payload field_id '{packet.field_id}' does not match URL field_id '{field_id}'")
    return iot.record_telemetry(packet)


@router.get("/regional/pawsan-coverage")
def get_pawsan_coverage():
    clean_dir = Path(__file__).resolve().parents[2] / "data" / "clean"
    ndvi_path = clean_dir / "ndvi.json"
    smap_path = clean_dir / "smap.json"

    ndvi_data = json.loads(ndvi_path.read_text(encoding="utf-8")) if ndvi_path.exists() else {}
    smap_data = json.loads(smap_path.read_text(encoding="utf-8")) if smap_path.exists() else {}

    return {
        "dataset": "pawsan-ayeyarwady",
        "task_id": "14cb26b2-28d6-4415-b328-38c29df7865e",
        "spatial_scope": "Ayeyarwady Delta (7 Townships)",
        "modis_townships": list(ndvi_data.keys()),
        "smap_townships_passing": list(smap_data.keys()),
        "smap_townships_zero_passing": [t for t in ndvi_data.keys() if t not in smap_data],
        "phenology_verdict": "Single monsoon rice cycle (sown Jun-Jul, flower Oct-Nov, harvest Dec-Jan). Severe dry-season soil moisture floor (0.02-0.09 VWC) Feb-Apr dictates dry-season pulse rotation.",
        "ndvi_series": ndvi_data,
        "smap_series": smap_data,
    }

