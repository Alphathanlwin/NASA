"""Fetch NASA POWER daily data and 30-year climatology for each POWER grid cell
that holds a demo field. No login needed. Raw responses are saved untouched.

    python pipeline/fetch_power.py
"""
import time
from datetime import date, timedelta

import requests

from common import RAW, USER_AGENT, cell_key, load_fields, utc_now, write_json

BASE = "https://power.larc.nasa.gov/api/temporal"
DAILY_PARAMS = "T2M,T2M_MAX,T2M_MIN,PRECTOTCORR,RH2M,WS2M,ALLSKY_SFC_SW_DWN,GWETTOP,GWETROOT"
CLIM_PARAMS = "T2M,T2M_MAX,T2M_MIN,PRECTOTCORR,RH2M,WS2M,ALLSKY_SFC_SW_DWN"


def get(url, params):
    for attempt in range(3):
        resp = requests.get(url, params=params, timeout=120, headers={"User-Agent": USER_AGENT})
        if resp.status_code in (429, 500, 502, 503, 504):
            time.sleep(2 ** (attempt + 1))
            continue
        resp.raise_for_status()
        return resp.json()
    resp.raise_for_status()


def main():
    cells = {}
    for f in load_fields():
        lat, lon = f["centroid"]
        cells.setdefault(cell_key(lat, lon), (lat, lon))

    end = date.today() - timedelta(days=1)
    start = end - timedelta(days=730)
    out_dir = RAW / "power"

    for key, (lat, lon) in cells.items():
        common = {"community": "AG", "latitude": lat, "longitude": lon, "format": "JSON"}
        daily = get(f"{BASE}/daily/point", {
            **common, "parameters": DAILY_PARAMS,
            "start": start.strftime("%Y%m%d"), "end": end.strftime("%Y%m%d"),
        })
        write_json(out_dir / f"daily_{key}.json", {"retrieved_utc": utc_now(), "response": daily})
        print(f"daily      {key}: {len(daily['properties']['parameter']['T2M'])} days")
        time.sleep(1.5)

        clim = get(f"{BASE}/climatology/point", {**common, "parameters": CLIM_PARAMS})
        write_json(out_dir / f"climatology_{key}.json", {"retrieved_utc": utc_now(), "response": clim})
        print(f"climatology {key}: ok")
        time.sleep(1.5)


if __name__ == "__main__":
    main()
