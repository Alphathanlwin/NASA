# AI-assisted: Claude Code
"""Fetch NASA MODIS MCD12Q1 land cover (IGBP classes, 500 m, yearly) over the Ayeyarwady Delta from
the NASA ORNL DAAC subset service. No login needed.

The app uses it to tell farmland from places where no crop can be planted: rivers and other open
water, forested hills, towns. One request covers up to 100 km either side of a centre, so the Delta
is fetched as a few tiles in MODIS's own sinusoidal grid; the frontend converts a tapped point into
that grid and looks the class up.

    python pipeline/fetch_landcover.py
"""
import time

import requests

from common import CLEAN, RAW, USER_AGENT, utc_now, write_json

API = "https://modis.ornl.gov/rst/api/v1/MCD12Q1"
HEADERS = {"Accept": "application/json", "User-Agent": USER_AGENT}
BAND = "LC_Type1"  # IGBP classification
# Tile centres covering the Delta and the hills on its western edge (lat 15.6-18.2, lon 94.2-96.4).
CENTRES = [(16.35, 94.85), (16.35, 95.75), (17.45, 94.85), (17.45, 95.75)]
KM = 100


def get(url, params=None):
    for attempt in range(5):
        try:
            resp = requests.get(url, params=params, headers=HEADERS, timeout=600)
            if resp.status_code == 200:
                return resp.json()
            print(f"  HTTP {resp.status_code}, retrying", flush=True)
        except requests.RequestException as exc:
            print(f"  {type(exc).__name__}, retrying", flush=True)
        time.sleep(10 * (attempt + 1))
    raise RuntimeError(f"failed: {url}")


def main():
    lat0, lon0 = CENTRES[0]
    dates = get(f"{API}/dates", {"latitude": lat0, "longitude": lon0})["dates"]
    latest = dates[-1]
    print(f"latest year: {latest['calendar_date']}", flush=True)
    tiles = []
    for lat, lon in CENTRES:
        data = get(f"{API}/subset", {"latitude": lat, "longitude": lon, "band": BAND,
                                     "startDate": latest["modis_date"], "endDate": latest["modis_date"],
                                     "kmAboveBelow": KM, "kmLeftRight": KM})
        sub = data["subset"][0]
        tile = {k: data[k] for k in ("xllcorner", "yllcorner", "cellsize", "nrows", "ncols")}
        tile["xllcorner"], tile["yllcorner"] = float(tile["xllcorner"]), float(tile["yllcorner"])
        # one character per pixel ('A' + class), rows from the top
        tile["classes"] = "".join(chr(65 + int(v)) for v in sub["data"])
        tiles.append(tile)
        print(f"tile {lat},{lon}: {tile['nrows']}x{tile['ncols']}", flush=True)
        time.sleep(2)

    meta = {"retrieved_at": utc_now(), "product": "MCD12Q1", "band": BAND, "year": latest["calendar_date"][:4],
            "source": "NASA MODIS MCD12Q1 v061 via ORNL DAAC MODIS web service", "resolution_m": 500,
            "grid": "MODIS sinusoidal, sphere radius 6371007.181 m; rows run north to south",
            "encoding": "one character per pixel: chr(65 + IGBP class); 17 = water, 12/14 = cropland, 13 = urban"}
    write_json(RAW / "modis_ornl" / "landcover_raw_meta.json", meta)
    write_json(CLEAN / "landcover.json", {**meta, "tiles": tiles})
    print("wrote landcover.json", flush=True)


if __name__ == "__main__":
    main()
