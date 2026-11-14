"""Fetch MODIS MOD13Q1 (NDVI / EVI, 250 m, 16-day) for each demo field from the
NASA ORNL DAAC subset service. No login needed. One 250 m pixel at the field centre.

    python pipeline/fetch_modis_ornl.py
"""
import time
from datetime import date, timedelta

import requests

from common import RAW, USER_AGENT, load_fields, utc_now, write_json

API = "https://modis.ornl.gov/rst/api/v1/MOD13Q1"
HEADERS = {"Accept": "application/json", "User-Agent": USER_AGENT}
BANDS = ["250m_16_days_NDVI", "250m_16_days_EVI", "250m_16_days_pixel_reliability"]
OUT = RAW / "modis_ornl"


def get(url, params=None):
    for attempt in range(4):
        try:
            resp = requests.get(url, params=params, headers=HEADERS, timeout=90)
            if resp.status_code == 200:
                return resp.json()
            print(f"  HTTP {resp.status_code}, retrying", flush=True)
        except requests.RequestException as exc:
            print(f"  {type(exc).__name__}, retrying", flush=True)
        time.sleep(5 * (attempt + 1))
    raise RuntimeError(f"failed: {url}")


def main():
    # Scale factors and fill values come from the service, not from memory.
    bands = {b["band"]: b for b in get(f"{API}/bands")["bands"] if b["band"] in BANDS}
    write_json(OUT / "bands.json", {"retrieved_utc": utc_now(), "bands": bands})

    since = (date.today() - timedelta(days=420)).isoformat()
    for f in load_fields():
        lat, lon = f["centroid"]
        loc = {"latitude": lat, "longitude": lon}
        dates = [d["modis_date"] for d in get(f"{API}/dates", loc)["dates"] if d["calendar_date"] >= since]
        rows = []
        for band in BANDS:
            for i in range(0, len(dates), 10):  # the service allows 10 dates per request
                chunk = dates[i:i + 10]
                data = get(f"{API}/subset", {**loc, "band": band, "startDate": chunk[0], "endDate": chunk[-1],
                                             "kmAboveBelow": 0, "kmLeftRight": 0})
                rows += [{"band": s["band"], "calendar_date": s["calendar_date"], "modis_date": s["modis_date"],
                          "value": s["data"][0]} for s in data["subset"]]
                time.sleep(0.5)
        write_json(OUT / f"{f['id']}.json", {"retrieved_utc": utc_now(), "latitude": lat, "longitude": lon,
                                             "product": "MOD13Q1", "rows": rows})
        print(f"{f['id']}: {len(dates)} composites, {len(rows)} values", flush=True)


if __name__ == "__main__":
    main()
