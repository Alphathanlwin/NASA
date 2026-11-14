"""Shared helpers for the fetch and cleaning scripts."""
import json
from datetime import datetime, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / "data"
RAW = DATA / "raw"
CLEAN = DATA / "clean"
SNAPSHOTS = DATA / "snapshots"
REPORTS = DATA / "reports"

USER_AGENT = "fieldshift-demo/0.1"


def load_fields():
    fc = json.loads((DATA / "fields.geojson").read_text(encoding="utf-8"))
    return [f["properties"] for f in fc["features"]]


def snap_to_power_grid(lat: float, lon: float) -> tuple[float, float]:
    """POWER meteorology grid is 0.5 deg x 0.625 deg; fields in one cell share one request."""
    return round(lat * 2) / 2, round(lon / 0.625) * 0.625


def cell_key(lat: float, lon: float) -> str:
    glat, glon = snap_to_power_grid(lat, lon)
    return f"{glat:.3f}_{glon:.3f}"


def utc_now() -> str:
    return datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")


def write_json(path: Path, obj) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, indent=2), encoding="utf-8")
