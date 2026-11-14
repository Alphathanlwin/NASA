"""The agent run: a deterministic list of events describing the data checks for
one field. The frontend replays it to move the marker and fill the event log.
Same field data in, same events out.
"""
import math

SPEED_KMH = 20.0
SIM_START_MIN = 9 * 60 + 12  # sim clock starts at 09:12


def distance_km(a, b):
    lat1, lon1, lat2, lon2 = map(math.radians, (a[0], a[1], b[0], b[1]))
    h = math.sin((lat2 - lat1) / 2) ** 2 + math.cos(lat1) * math.cos(lat2) * math.sin((lon2 - lon1) / 2) ** 2
    return 6371.0 * 2 * math.asin(math.sqrt(h))


def sim_time(minutes):
    total = SIM_START_MIN + int(round(minutes))
    return f"{total // 60 % 24:02d}:{total % 60:02d}"


def build_run(field: dict, base: dict, steps: int = 30) -> dict:
    start = (base["lat"], base["lon"])
    end = tuple(field["centroid"])
    waypoints = [[round(start[0] + (end[0] - start[0]) * i / steps, 6),
                  round(start[1] + (end[1] - start[1]) * i / steps, 6)] for i in range(steps + 1)]
    km = distance_km(start, end)
    eta = max(1.0, km / SPEED_KMH * 60)
    prov = field.get("provenance") or {}
    weather, wet, soil = field.get("weather"), field.get("wetness"), field.get("soil")
    ndvi, smap = field.get("ndvi"), field.get("smap")

    def ev(key, t_ms, minutes, text, source=None, status=None, ok=True):
        return {"key": key, "t_ms": t_ms, "sim_time": sim_time(minutes), "text": text,
                "source": source, "status": status, "ok": ok}

    def st(name):
        return (prov.get(name) or {}).get("status")

    events = [
        ev("dispatched", 0, 0, f"Agent dispatched to {field['name']} ({field['id']})."),
        ev("en_route", 400, eta * 0.2, f"En route: {km:.1f} km in a straight line."),
        ev("arrived", 2500, eta, "Arrived at the field. Starting checks."),
    ]
    t, m = 2900, eta + 1
    if weather:
        events.append(ev("reading_power", t, m,
                         f"Weather: {weather['t2m']} C, {weather['rain_7d']} mm rain in the last 7 days "
                         f"(as of {weather['as_of']}).", "NASA POWER (modelled)", st("weather")))
    else:
        events.append(ev("reading_power", t, m, "Weather: no data available.", "NASA POWER", None, ok=False))
    t, m = t + 400, m + 1
    if wet:
        events.append(ev("reading_wetness", t, m, f"Root-zone wetness: {wet['gwetroot']} on a 0-1 scale.",
                         "NASA POWER (modelled)", st("wetness")))
        t, m = t + 400, m + 1
    if soil and soil.get("ph") is not None:
        events.append(ev("reading_soil", t, m, f"Topsoil: pH {soil['ph']}, clay {soil.get('clay_pct')}%.",
                         "ISRIC SoilGrids", st("soil")))
    else:
        events.append(ev("reading_soil", t, m, "Topsoil: no data for this location.", "ISRIC SoilGrids", None, ok=False))
    t, m = t + 400, m + 1
    if smap:
        events.append(ev("reading_smap", t, m, f"Satellite soil moisture: {smap['value']} m3/m3 (district scale, 9 km).",
                         "SMAP SPL3SMP_E", st("smap")))
    else:
        events.append(ev("reading_smap", t, m, "Satellite soil moisture: not connected, skipped.",
                         "SMAP SPL3SMP_E", "NOT_CONNECTED", ok=False))
    t, m = t + 400, m + 1
    if ndvi:
        events.append(ev("reading_ndvi", t, m, f"Vegetation index (NDVI): {ndvi['value']} on {ndvi['as_of']}.",
                         "MODIS MOD13Q1", st("ndvi")))
    else:
        events.append(ev("reading_ndvi", t, m, "Vegetation index: not connected, skipped.",
                         "MODIS MOD13Q1", "NOT_CONNECTED", ok=False))
    t, m = t + 400, m + 1
    events.append(ev("scoring", t, m, "Scoring rotations with the rules engine."))
    events.append(ev("plan_ready", t + 500, m + 1, "Plans ready."))
    return {"field_id": field["id"], "waypoints": waypoints, "distance_km": round(km, 2),
            "eta_min": round(eta, 1), "travel_ms": 2500, "sim_clock_note": "Sim time, not real time.",
            "events": events}
