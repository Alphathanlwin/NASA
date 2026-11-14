# AI-assisted: Claude Code
"""Loads the cleaned data the API serves. The backend never reads data/raw."""
import json
from functools import lru_cache
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
DATA = ROOT / "data"


def _read(path: Path, default):
    if not path.exists():
        return default
    return json.loads(path.read_text(encoding="utf-8"))


@lru_cache(maxsize=1)
def geojson() -> dict:
    return _read(DATA / "fields.geojson", {"type": "FeatureCollection", "features": []})


@lru_cache(maxsize=1)
def snapshot() -> dict:
    return _read(DATA / "snapshots" / "fields_snapshot.json", {"generated_at": None, "fields": {}, "climatology": {}})


@lru_cache(maxsize=1)
def cleaning_report() -> dict:
    return _read(DATA / "reports" / "cleaning_report.json", {"retrieved_at": None, "sources": {}})


@lru_cache(maxsize=1)
def sources() -> dict:
    return _read(DATA / "sources.json", {"retrieved_at": None, "sources": []})


def field(field_id: str) -> dict | None:
    return (snapshot().get("fields") or {}).get(field_id)


def agent_base() -> dict:
    return geojson().get("agent_base") or {"lat": 16.709, "lon": 95.956, "name": "Agent base (DEMO)"}
