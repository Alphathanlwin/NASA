# AI-assisted: Claude Code
"""Deterministic explanation steps for one field.

There is no live LLM in the MVP. The event log is a fixed sequence of nine steps
filled from the field profile and the rule output. Same field in, same log out.
The moving marker in the UI is a visual metaphor for these steps, not a claim
that a vehicle or satellite travels to the field.
"""
import math

SPEED_KMH = 20.0
SIM_START_MIN = 9 * 60 + 12
STEPS = [
    ("field_selected", "Field selected"),
    ("geometry_resolved", "Geometry resolved"),
    ("loading_power", "Loading NASA POWER"),
    ("loading_imerg", "Loading cached IMERG"),
    ("checking_quality", "Checking data quality"),
    ("building_profile", "Building field profile"),
    ("evaluating_rotations", "Evaluating rotations"),
    ("scenario_recalculated", "Scenario recalculated"),
    ("report_ready", "Report ready"),
]


def distance_km(a, b):
    lat1, lon1, lat2, lon2 = map(math.radians, (a[0], a[1], b[0], b[1]))
    h = math.sin((lat2 - lat1) / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin((lon2 - lon1) / 2) ** 2
    return 6371.0 * 2 * math.asin(math.sqrt(h))


def sim_time(minutes):
    total = SIM_START_MIN + int(round(minutes))
    return f"{total // 60 % 24:02d}:{total % 60:02d}"


def build_run(field: dict, base: dict, steps: int = 30, scenario_label: str | None = None) -> dict:
    start = (base["lat"], base["lon"])
    end = tuple(field["centroid"])
    km = distance_km(start, end)
    waypoints = [[round(start[0] + (end[0] - start[0]) * i / steps, 6),
                  round(start[1] + (end[1] - start[1]) * i / steps, 6)] for i in range(steps + 1)]
    prov = field.get("provenance") or {}
    town = field.get("town_name")
    dist = field.get("town_distance_km")

    def status(name):
        return (prov.get(name) or {}).get("status")

    detail = {
        "field_selected": (f"Field {field['id']} selected.", None, "DEMO"),
        "geometry_resolved": (f"Polygon resolved; {field.get('area_acres')} acres. Nearest reference: {town}, {dist} km.",
                              "Demo geometry (DEMO)", "DEMO"),
        "loading_power": (f"NASA POWER point data for the {town} grid cell.", "NASA POWER daily", status("power_recent")),
        "loading_imerg": ("GPM IMERG Late run is not available in this build.", "GPM_3IMERGDL V07", "UNAVAILABLE"),
        "checking_quality": ("Fill values (-999/-99), range checks and duplicate dates checked in the cleaning report.",
                             "Cleaning report", "CACHED"),
        "building_profile": ("Field profile built from the grid-cell values above; no field measurements are claimed.",
                             "Field profile", "CACHED"),
        "evaluating_rotations": ("Rice-rice baseline plus rice-mung bean and rice-black gram scored by the rules engine.",
                                 "Rotation engine", "CACHED"),
        "scenario_recalculated": (scenario_label or "Baseline assumptions (no scenario selected).", "Scenario simulator", "USER-INPUT"),
        "report_ready": ("Reasons, evidence references, unknowns and local checks ready.", "Decision report", "CACHED"),
    }
    events = []
    for i, (key, label) in enumerate(STEPS):
        text, source, state = detail[key]
        events.append({"key": key, "label": label, "t_ms": i * 450, "sim_time": sim_time(i * 0.8),
                       "text": text, "source": source, "status": state, "ok": state != "UNAVAILABLE"})
    return {"field_id": field["id"], "waypoints": waypoints, "distance_km": round(km, 2),
            "travel_ms": 2200, "sim_clock_note": "Simulated clock, not real time.",
            "metaphor": "Visualises the analysis steps", "events": events}
