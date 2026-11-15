# AI-assisted: Claude Code
"""FastAPI routes. The backend owns the calculations; the frontend only displays them.

The same engine is ported to TypeScript so the static GitHub Pages build can run with
no backend. scripts/parity_test.mjs keeps the two in step.
"""
import copy
from typing import Literal

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from .engine import agent, engine
from .services import store

router = APIRouter(prefix="/api")


class Priorities(BaseModel):
    income: float = Field(40, ge=0, le=100)
    soil_health: float = Field(30, ge=0, le=100)
    water_saving: float = Field(30, ge=0, le=100)


class Econ(BaseModel):
    price: float | None = Field(None, allow_inf_nan=False, ge=0, le=1e12)
    cost: float | None = Field(None, allow_inf_nan=False, ge=0, le=1e12)


class Scenario(BaseModel):
    irrigation: Literal['available', 'sometimes', 'unavailable'] | None = None
    planting_delay_days: int | None = Field(None, ge=0, le=365)
    residual_moisture: Literal['normal', 'low', 'unknown'] | None = None
    drainage: Literal['good', 'poor', 'unknown'] | None = None
    rainfall_change_percent: float | None = Field(None, ge=-100, le=1000, allow_inf_nan=False)


class PlanRequest(BaseModel):
    priorities: Priorities = Priorities()
    econ: dict[str, Econ] | None = None
    scenario: Scenario | None = None


class ScenarioRequest(BaseModel):
    assumptions: Scenario = Field(default_factory=Scenario)
    priorities: Priorities = Priorities()
    econ: dict[str, Econ] | None = None


def field_or_404(field_id: str) -> dict:
    rec = store.field(field_id)
    if rec is None:
        raise HTTPException(404, f"Unknown field {field_id}")
    return copy.deepcopy(rec)


def engine_inputs(rec: dict) -> dict:
    clim = (store.snapshot().get("climatology") or {}).get(rec["town_id"])
    return engine.inputs_from_profile(rec, clim)


def econ_dict(econ: dict[str, Econ] | None) -> dict:
    if not econ:
        return {}
    return {k: {"price": v.price, "cost": v.cost} for k, v in econ.items()}


@router.get("/health")
def health():
    snap = store.snapshot()
    return {"status": "ok", "fields": len(snap.get("fields") or {}),
            "snapshot_generated_utc": snap.get("generated_at"), "engine_version": engine.ENGINE_VERSION,
            "backend": "online"}


@router.get("/fields")
def fields():
    return store.geojson()


@router.get("/scenarios")
def scenarios():
    return {"scenarios": engine.TABLE.get("scenarios", [])}


@router.get("/fields/{field_id}")
def field_detail(field_id: str):
    rec = field_or_404(field_id)
    rec["nearest_reference"] = (f"Nearest reference: {rec['town_name']}, {rec['town_distance_km']} km. "
                                "Grid-cell value, not a field measurement.")
    return rec


@router.post("/fields/{field_id}/plans")
def plans(field_id: str, body: PlanRequest):
    rec = field_or_404(field_id)
    return engine.evaluate(engine_inputs(rec), body.scenario.model_dump(exclude_none=True) if body.scenario else None, body.priorities.model_dump(), econ_dict(body.econ))


@router.post("/fields/{field_id}/scenarios")
def scenarios_run(field_id: str, body: ScenarioRequest):
    rec = field_or_404(field_id)
    return engine.compare(engine_inputs(rec), body.assumptions.model_dump(exclude_none=True), body.priorities.model_dump(), econ_dict(body.econ))


@router.get("/fields/{field_id}/agent-run")
def agent_run(field_id: str, scenario: str | None = None):
    rec = field_or_404(field_id)
    return agent.build_run(rec, store.agent_base(), scenario_label=scenario)


@router.get("/datasets")
def datasets():
    """Everything the one Analyst Mode screen shows: source catalogue + cleaning report."""
    report = store.cleaning_report()
    return {"sources": store.sources().get("sources", []), "retrieved_at": store.sources().get("retrieved_at"),
            "cleaning_report": report, "engine_version": engine.ENGINE_VERSION}
