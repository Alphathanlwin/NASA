"""The one live network call: recent NASA POWER daily data for a field.
5 second timeout, 10 minute memory cache. Any failure returns None and the
caller keeps the cached snapshot values.
"""
import os
import math
import threading
import time
from datetime import date, datetime, timedelta, timezone

import requests

URL = "https://power.larc.nasa.gov/api/temporal/daily/point"
PARAMS = "T2M,T2M_MAX,T2M_MIN,PRECTOTCORR,RH2M,WS2M,ALLSKY_SFC_SW_DWN,GWETTOP,GWETROOT"
RANGES = {
    "T2M": (-100, 70), "T2M_MAX": (-100, 75), "T2M_MIN": (-100, 70),
    "PRECTOTCORR": (0, math.inf), "RH2M": (0, 100), "WS2M": (0, 150),
    "ALLSKY_SFC_SW_DWN": (0, 80), "GWETTOP": (0, 1), "GWETROOT": (0, 1),
}
TTL_S = 600
RETRY_S = 60
TIMEOUT_S = 5
_lock = threading.Lock()
_cell_locks: dict[str, threading.Lock] = {}
_cache: dict[str, tuple[float, dict | None]] = {}
last_status = {"ok": None, "checked_utc": None, "error": None}


def clean_value(value, parameter, fill=-999.0):
    try:
        value = float(value)
    except (ValueError, TypeError):
        return None
    low, high = RANGES.get(parameter, (-math.inf, math.inf))
    return value if math.isfinite(value) and value != fill and low <= value <= high else None


def normalize_daily(body):
    """Keep a complete daily calendar so missing days never shorten a window."""
    params = body["properties"]["parameter"]
    dates = sorted({datetime.strptime(d, "%Y%m%d").date() for values in params.values() for d in values})
    if not dates:
        return [], {"rows_in": 0, "fill_values_nulled": 0, "out_of_range_nulled": 0}
    fill = body.get("header", {}).get("fill_value", -999.0)
    counts = {"rows_in": len(dates), "fill_values_nulled": 0, "out_of_range_nulled": 0}
    rows = []
    day = dates[0]
    while day <= dates[-1]:
        key = day.strftime("%Y%m%d")
        row = {"date": day.isoformat()}
        for name in PARAMS.split(","):
            value = params.get(name, {}).get(key)
            row[name] = clean_value(value, name, fill)
            if value is not None and row[name] is None:
                counts["fill_values_nulled" if value == fill else "out_of_range_nulled"] += 1
        rows.append(row)
        day += timedelta(days=1)
    return rows, counts


def summarize_daily(rows):
    valid = [row for row in rows if row["T2M"] is not None]
    if not valid:
        return None
    last = valid[-1]
    by_date = {row["date"]: row for row in rows}
    as_of = date.fromisoformat(last["date"])

    def window(parameter, days):
        values = [by_date.get((as_of - timedelta(days=i)).isoformat(), {}).get(parameter) for i in range(days)]
        return [v for v in values if v is not None]

    def rounded(value, digits=1):
        return None if value is None else round(value, digits)

    coverage = {}
    totals = {}
    for days in (7, 30):
        values = window("PRECTOTCORR", days)
        key = f"rain_{days}d"
        coverage[key] = {"observed": len(values), "expected": days}
        totals[key] = round(sum(values), 1) if len(values) == days else None
    temps = window("T2M", 30)
    coverage["t2m_30d_mean"] = {"observed": len(temps), "expected": 30}
    weather = {"as_of": last["date"], "coverage": coverage, **totals,
               "t2m_30d_mean": round(sum(temps) / len(temps), 1) if len(temps) == 30 else None}
    for key, parameter in {"t2m": "T2M", "t2m_max": "T2M_MAX", "t2m_min": "T2M_MIN",
                           "rh2m": "RH2M", "ws2m": "WS2M", "solar": "ALLSKY_SFC_SW_DWN",
                           "rain_1d": "PRECTOTCORR"}.items():
        weather[key] = rounded(last[parameter], 0 if key == "rh2m" else 1)
    wet = [row for row in rows if row["GWETROOT"] is not None]
    wetness = None
    if wet:
        w = wet[-1]
        comparison_date = (date.fromisoformat(w["date"]) - timedelta(days=7)).isoformat()
        prior = by_date.get(comparison_date, {}).get("GWETROOT")
        wetness = {"as_of": w["date"], "gwettop": rounded(w["GWETTOP"], 2),
                   "gwetroot": rounded(w["GWETROOT"], 2), "comparison_date": comparison_date,
                   "gwetroot_7d_change": rounded(w["GWETROOT"] - prior, 2) if prior is not None else None}
    return {"weather": weather, "wetness": wetness}


def _mark(ok, error=None):
    last_status.update(ok=ok, error=error, checked_utc=datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ"))


def fetch_recent(cell: str, lat: float, lon: float) -> dict | None:
    """Returns {"weather": {...}, "wetness": {...}, "api_version", "retrieved_utc"} or None."""
    if os.environ.get("FIELDSHIFT_OFFLINE") == "1":
        _mark(False, "offline mode forced")
        return None
    with _lock:
        lock = _cell_locks.setdefault(cell, threading.Lock())
    with lock:  # same-cell requests share a refresh without blocking other cells
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
    rows, _ = normalize_daily(body)
    result = summarize_daily(rows)
    if result is None:
        return None
    header = body.get("header", {})
    return {**result, "metadata": {"time_standard": header.get("time_standard"),
                                  "sources": header.get("sources"), "parameters": body.get("parameters", {})},
            "api_version": body.get("header", {}).get("api", {}).get("version"),
            "retrieved_utc": datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")}
