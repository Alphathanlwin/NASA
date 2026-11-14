import copy

from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field

from .engine import agent, planner
from .engine.crops import CROPS, SLOTS
from .services import analysis, models, power, store

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
                       "duration_days": c.duration_days, "water_class": c.water_class, "legume": c.legume}
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
