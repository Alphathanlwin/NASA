# AI-assisted: Claude Code
"""Shared helpers for the fetch and cleaning scripts.

Every script here can be re-run from scratch:
    python pipeline/<script>.py
"""
import json
import math
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
RAW = DATA / "raw"
CLEAN = DATA / "clean"
SNAPSHOTS = DATA / "snapshots"
REPORTS = DATA / "reports"

USER_AGENT = "fieldshift-demo/0.2"
POWER_FILL = (-999.0, -99.0)


def config() -> dict:
    return json.loads((DATA / "reference" / "towns.json").read_text(encoding="utf-8"))


def towns() -> list[dict]:
    out = []
    for t in config()["towns"]:
        glat, glon = snap_to_power_grid(t["lat"], t["lon"])
        out.append({**t, "grid_lat": glat, "grid_lon": glon})
    return out


def load_fields() -> list[dict]:
    fc = json.loads((DATA / "fields.geojson").read_text(encoding="utf-8"))
    return [f["properties"] for f in fc["features"]]


def snap_to_power_grid(lat: float, lon: float) -> tuple[float, float]:
    """POWER meteorology grid: 0.5 degree latitude x 0.625 degree longitude."""
    return round(lat * 2) / 2, round(lon / 0.625) * 0.625


def distance_km(lat1, lon1, lat2, lon2) -> float:
    a, b, c, d = map(math.radians, (lat1, lon1, lat2, lon2))
    h = math.sin((c - a) / 2) ** 2 + math.cos(a) * math.cos(c) * math.sin((d - b) / 2) ** 2
    return 6371.0 * 2 * math.asin(math.sqrt(h))


def utc_now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def write_json(path: Path, obj) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, indent=2, ensure_ascii=False), encoding="utf-8")


def read_json(path: Path, default=None):
    return json.loads(path.read_text(encoding="utf-8")) if path.exists() else default
