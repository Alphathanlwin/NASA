# AI-assisted: Claude Code
"""Fetch NASA POWER daily point data for each reference town. No login needed.

Two requests per town, both to the daily *point* endpoint (the regional endpoint
rejects areas under 2 degrees):
  recent : the last 400 days, 9 variables  -> current conditions
  history: 1996-2025, 4 variables          -> day-of-year climatology

Requests run one at a time with a 1 s pause. Raw responses are saved untouched
with their retrieval time.

    python pipeline/fetch_power.py [recent|history|all]
"""
import sys
import time
from datetime import date, timedelta

import requests

from common import RAW, USER_AGENT, towns, utc_now, write_json

URL = "https://power.larc.nasa.gov/api/temporal/daily/point"
RECENT = ["T2M", "T2M_MAX", "T2M_MIN", "PRECTOTCORR", "RH2M", "WS2M", "ALLSKY_SFC_SW_DWN", "GWETTOP", "GWETROOT"]
HISTORY = ["PRECTOTCORR", "T2M_MAX", "T2M_MIN", "RH2M"]
HISTORY_YEARS = (1996, 2025)
MAX_PARAMS = 20  # POWER limit for daily requests
PAUSE_S = 1.0


def get(params: dict) -> dict:
    assert len(params["parameters"].split(",")) <= MAX_PARAMS
    last = None
    for attempt in range(4):
        try:
            resp = requests.get(URL, params=params, timeout=240, headers={"User-Agent": USER_AGENT})
            if resp.status_code == 200:
                return resp.json()
            last = f"HTTP {resp.status_code}"
        except requests.RequestException as exc:
            last = type(exc).__name__
        print(f"  {last}, retrying", flush=True)
        time.sleep(2 ** (attempt + 1))
    raise RuntimeError(f"POWER request failed: {last}")


def main(mode: str):
    end = date.today() - timedelta(days=1)
    for t in towns():
        base = {"community": "AG", "latitude": t["grid_lat"], "longitude": t["grid_lon"], "format": "JSON"}
        meta = {"town": t["id"], "grid_lat": t["grid_lat"], "grid_lon": t["grid_lon"]}
        if mode in ("recent", "all"):
            start = end - timedelta(days=400)
            body = get({**base, "parameters": ",".join(RECENT), "start": start.strftime("%Y%m%d"), "end": end.strftime("%Y%m%d")})
            write_json(RAW / "power" / f"recent_{t['id']}.json", {**meta, "retrieved_at": utc_now(), "response": body})
            print(f"recent  {t['id']}: {len(body['properties']['parameter']['T2M'])} days", flush=True)
            time.sleep(PAUSE_S)
        if mode in ("history", "all"):
            body = get({**base, "parameters": ",".join(HISTORY), "start": f"{HISTORY_YEARS[0]}0101", "end": f"{HISTORY_YEARS[1]}1231"})
            write_json(RAW / "power" / f"history_{t['id']}.json", {**meta, "retrieved_at": utc_now(), "response": body})
            print(f"history {t['id']}: {len(body['properties']['parameter']['PRECTOTCORR'])} days", flush=True)
            time.sleep(PAUSE_S)


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "all")
