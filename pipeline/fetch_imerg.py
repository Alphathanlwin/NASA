# AI-assisted: Claude Code
"""Fetch NASA GPM IMERG daily rainfall, LATE run (GPM_3IMERGDL V07), for each reference town.

Uses NASA's OPeNDAP service to download only the four 0.1-degree grid cells, not whole
global files. Needs an Earthdata token in ~/.earthdata_token (or EARTHDATA_TOKEN), and the
account must have accepted the GES DISC data agreement once:
https://urs.earthdata.nasa.gov/approve_app?client_id=e2WVk8Pw6weeLUKZYOxvTQ

The Late run is used because the Final run lags by months. Every row records its run.

    python pipeline/fetch_imerg.py [days]
"""
import os
import sys
import time
from datetime import date, timedelta
from pathlib import Path

import requests

from common import RAW, USER_AGENT, towns, utc_now, write_json

SHORT_NAME, VERSION, RUN = "GPM_3IMERGDL", "07", "Late"
CMR = "https://cmr.earthdata.nasa.gov/search/granules.json"
FILL = -9999.9


def token() -> str:
    tok = os.environ.get("EARTHDATA_TOKEN") or (Path.home() / ".earthdata_token").read_text().strip()
    if not tok:
        sys.exit("No Earthdata token: set EARTHDATA_TOKEN or write it to ~/.earthdata_token")
    return tok


def granules(start: date, end: date) -> list[dict]:
    out, page = [], 1
    while True:
        r = requests.get(CMR, params={"short_name": SHORT_NAME, "version": VERSION, "page_size": 200, "page_num": page,
                                      "temporal": f"{start}T00:00:00Z,{end}T23:59:59Z", "sort_key": "start_date"},
                         headers={"User-Agent": USER_AGENT}, timeout=90)
        r.raise_for_status()
        items = r.json()["feed"]["entry"]
        out += items
        if len(items) < 200:
            return out
        page += 1


def opendap_url(g: dict) -> str:
    for link in g["links"]:
        if "opendap.earthdata.nasa.gov" in link["href"]:
            return link["href"].removesuffix(".html")
    raise RuntimeError(f"no OPeNDAP link for {g['title']}")


def cell(lat: float, lon: float) -> tuple[int, int]:
    """IMERG 0.1-degree grid: lon centres -179.95..179.95, lat centres -89.95..89.95."""
    return round((lon + 179.95) / 0.1), round((lat + 89.95) / 0.1)


def read_values(url: str, headers: dict, idx: list[tuple[int, int]], var: str = "/precipitation") -> list[float | None]:
    """One small box covering every town (Hyrax accepts one slice per variable), then pick each cell."""
    i0, i1 = min(i for i, _ in idx), max(i for i, _ in idx)
    j0, j1 = min(j for _, j in idx), max(j for _, j in idx)
    ce = f"{var}[0][{i0}:{i1}][{j0}:{j1}]"
    for attempt in range(4):
        r = requests.get(f"{url}.dap.csv", params={"dap4.ce": ce}, headers=headers, timeout=120)
        if r.status_code == 200 and not r.text.startswith("Dataset: ERROR") and "Error {" not in r.text[:300]:
            break
        if "EULA" in r.text or r.status_code in (401, 403):
            sys.exit("Access refused: accept the GES DISC agreement for this Earthdata account (see the docstring).")
        time.sleep(3 * (attempt + 1))
    else:
        raise RuntimeError(f"OPeNDAP failed: {r.status_code} {r.text[:200]}")
    # Hyrax CSV: one line per longitude row "/precipitation[0][k], v_lat0, v_lat1, ...".
    grid = {}
    for line in r.text.splitlines():
        if not line.startswith(var + "["):
            continue
        head, *vals = [p.strip() for p in line.split(",")]
        k = int(head.rsplit("[", 1)[1].rstrip("]"))
        grid[k] = [float(v) for v in vals]
    out = []
    for i, j in idx:
        v = grid[i - i0][j - j0]
        out.append(None if v <= FILL + 0.01 or not 0 <= v <= 500 else round(v, 2))
    return out


def main(days: int = 60):
    headers = {"Authorization": f"Bearer {token()}", "User-Agent": USER_AGENT}
    end = date.today() - timedelta(days=1)
    start = end - timedelta(days=days - 1)
    pts = towns()
    idx = [cell(t["lat"], t["lon"]) for t in pts]
    rows = []
    found = granules(start, end)
    print(f"{len(found)} daily files {start} to {end}", flush=True)
    for g in found:
        day = g["time_start"][:10]
        values = read_values(opendap_url(g), headers, idx)
        for t, (i, j), v in zip(pts, idx, values):
            rows.append({"town": t["id"], "date": day, "precip_mm": v, "run": RUN,
                         "product": f"{SHORT_NAME}.{VERSION}", "granule": g["title"].split(":")[-1],
                         "cell_lat": round(-89.95 + j * 0.1, 2), "cell_lon": round(-179.95 + i * 0.1, 2)})
        print(day, values, flush=True)
        time.sleep(0.3)
    write_json(RAW / "imerg" / "daily_late.json", {"retrieved_at": utc_now(), "rows": rows})
    print(f"{len(rows)} rows written")


if __name__ == "__main__":
    main(int(sys.argv[1]) if len(sys.argv) > 1 else 60)
