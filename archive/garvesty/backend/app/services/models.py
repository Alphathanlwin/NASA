import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
MANIFEST_PATH = ROOT / "data" / "reports" / "model_evaluation.json"

DEFAULT_TRACKS = [
    {
        "id": "regional_wetness",
        "name": "Regional root-zone wetness",
        "description": "7-day forward prediction of root-zone wetness from NASA POWER time series",
        "status": "blocked",
        "used_in_recommendations": False,
        "reason": "Evaluation manifest missing or invalid",
    },
    {
        "id": "vegetation_anomalies",
        "name": "Vegetation anomalies (NDVI)",
        "description": "Seasonal baseline deviations from quality-screened MODIS MOD13Q1 observations",
        "status": "blocked",
        "used_in_recommendations": False,
        "reason": "Evaluation manifest missing or invalid",
    },
    {
        "id": "yield_feasibility",
        "name": "Crop yield feasibility",
        "description": "Supervised yield model gated by plot-level harvest labels",
        "status": "blocked",
        "used_in_recommendations": False,
        "reason": "Missing representative plot-level harvest ground truth in Delta townships",
    },
]


def get_model_status() -> dict:
    """Return status of all three gated ML tracks. Fails closed (blocked) if manifest is missing or invalid."""
    if not MANIFEST_PATH.exists():
        return {"tracks": [dict(t) for t in DEFAULT_TRACKS]}

    try:
        data = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
        if not isinstance(data, dict) or "tracks" not in data:
            return {"tracks": [dict(t) for t in DEFAULT_TRACKS]}
        tracks = []
        for t in data.get("tracks", []):
            item = dict(t)
            # Enforce gate: never used in recommendations unless explicitly validated
            if item.get("status") != "validated":
                item["used_in_recommendations"] = False
            tracks.append(item)
        return {"tracks": tracks}
    except Exception:
        # Fails closed on any parse error
        return {"tracks": [dict(t) for t in DEFAULT_TRACKS]}
