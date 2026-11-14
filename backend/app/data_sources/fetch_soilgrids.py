# AI-assisted: Claude Code
"""Fetch ISRIC SoilGrids v2 topsoil properties (0-5 cm mean) per demo field.
SoilGrids is not a NASA product; it is the soil complement. No login needed.

    python backend/app/data_sources/fetch_soilgrids.py
"""
import time

import requests

from common import RAW, USER_AGENT, load_fields, utc_now, write_json

URL = "https://rest.isric.org/soilgrids/v2.0/properties/query"
PROPS = ["phh2o", "soc", "sand", "silt", "clay", "cec"]


def main():
    for f in load_fields():
        lat, lon = f["centroid"]
        params = [("lon", lon), ("lat", lat), ("depth", "0-5cm"), ("value", "mean")]
        params += [("property", p) for p in PROPS]
        if (RAW / "soilgrids" / f"{f['id']}.json").exists():
            print(f"{f['id']}: already fetched")
            continue
        data = None
        for attempt in range(4):
            try:
                resp = requests.get(URL, params=params, timeout=90, headers={"User-Agent": USER_AGENT})
            except requests.RequestException as exc:
                print(f"  {f['id']}: {type(exc).__name__}, retrying", flush=True)
                time.sleep(15 * (attempt + 1))
                continue
            if resp.status_code == 200:
                data = resp.json()
                break
            print(f"  {f['id']}: HTTP {resp.status_code}, retrying", flush=True)
            time.sleep(15 * (attempt + 1))
        if data is None:
            print(f"{f['id']}: FAILED, no file written")
            continue
        write_json(RAW / "soilgrids" / f"{f['id']}.json", {"retrieved_at": utc_now(), "response": data})
        print(f"{f['id']}: ok")
        time.sleep(13)  # SoilGrids fair-use limit is about 5 calls per minute


if __name__ == "__main__":
    main()
