"""The one live network call: recent NASA POWER daily data for a field.
5 second timeout, 10 minute memory cache. Any failure returns None and the
caller keeps the cached snapshot values.
"""
import os
import threading
import time
from datetime import date, datetime, timedelta, timezone

import requests

URL = "https://power.larc.nasa.gov/api/temporal/daily/point"
PARAMS = "T2M,T2M_MAX,T2M_MIN,PRECTOTCORR,RH2M,WS2M,ALLSKY_SFC_SW_DWN,GWETTOP,GWETROOT"
FILL = (-999.0, -99.0)
TTL_S = 600
RETRY_S = 60
TIMEOUT_S = 5
_lock = threading.Lock()
_cache: dict[str, tuple[float, dict | None]] = {}
last_status = {"ok": None, "checked_utc": None, "error": None}


def _clean(v):
    return None if v is None or v in FILL else float(v)


def _mark(ok, error=None):
    last_status.update(ok=ok, error=error, checked_utc=datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"))


def fetch_recent(cell: str, lat: float, lon: float) -> dict | None:
    """Returns {"weather": {...}, "wetness": {...}, "api_version", "retrieved_utc"} or None."""
    if os.environ.get("FIELDSHIFT_OFFLINE") == "1":
        _mark(False, "offline mode forced")
        return None
    with _lock:  # parallel requests for one field share a single POWER call
        return _fetch_locked(cell, lat, lon)


def _fetch_locked(cell: str, lat: float, lon: float) -> dict | None:
    now = time.time()
    if cell in _cache:
        age, cached = now - _cache[cell][0], _cache[cell][1]
        # A success is kept for 10 minutes; a failure is retried after 1 minute.
        if age < (TTL_S if cached else RETRY_S):
            return cached
    end = date.today() - timedelta(days=1)
    start = end - timedelta(days=45)
    try:
        resp = requests.get(URL, timeout=TIMEOUT_S, params={
            "parameters": PARAMS, "community": "AG", "latitude": lat, "longitude": lon,
            "start": start.strftime("%Y%m%d"), "end": end.strftime("%Y%m%d"), "format": "JSON"})
        resp.raise_for_status()
        body = resp.json()
        result = _summarise(body)
        _mark(result is not None, None if result else "no valid days in response")
    except Exception as exc:  # network down, timeout, bad payload: fall back to cache
        result = None
        _mark(False, type(exc).__name__)
    _cache[cell] = (now, result)
    return result


def _summarise(body: dict) -> dict | None:
    p = body["properties"]["parameter"]
    days = sorted(p["T2M"])
    rows = [{k: _clean(p[k].get(d)) for k in p} | {"date": d} for d in days]
    valid = [r for r in rows if r["T2M"] is not None]
    if not valid:
        return None
    last = valid[-1]
    idx = rows.index(last)

    def rain(n, need):
        window = [r["PRECTOTCORR"] for r in rows[max(0, idx - n + 1): idx + 1] if r["PRECTOTCORR"] is not None]
        return round(sum(window), 1) if len(window) >= need else None

    def rnd(v, d=1):
        return None if v is None else round(v, d)

    temps = [r["T2M"] for r in valid[-30:]]
    iso = f"{last['date'][:4]}-{last['date'][4:6]}-{last['date'][6:]}"
    weather = {
        "as_of": iso, "t2m": rnd(last["T2M"]), "t2m_max": rnd(last["T2M_MAX"]), "t2m_min": rnd(last["T2M_MIN"]),
        "rh2m": rnd(last["RH2M"], 0), "ws2m": rnd(last["WS2M"]), "solar": rnd(last["ALLSKY_SFC_SW_DWN"]),
        "rain_1d": rnd(last["PRECTOTCORR"]), "rain_7d": rain(7, 5), "rain_30d": rain(30, 24),
        "t2m_30d_mean": rnd(sum(temps) / len(temps)),
    }
    wet_rows = [r for r in rows if r.get("GWETROOT") is not None]
    wetness = None
    if wet_rows:
        w = wet_rows[-1]
        wi = wet_rows.index(w)
        earlier = wet_rows[wi - 7] if wi >= 7 else None
        wetness = {
            "as_of": f"{w['date'][:4]}-{w['date'][4:6]}-{w['date'][6:]}",
            "gwettop": rnd(w.get("GWETTOP"), 2), "gwetroot": rnd(w["GWETROOT"], 2),
            "gwetroot_7d_change": rnd(w["GWETROOT"] - earlier["GWETROOT"], 2) if earlier else None,
        }
    return {"weather": weather, "wetness": wetness,
            "api_version": body.get("header", {}).get("api", {}).get("version"),
            "retrieved_utc": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")}
