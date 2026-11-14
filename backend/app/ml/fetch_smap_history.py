# AI-assisted: Claude Code
"""Request the full SMAP history (31 Mar 2015 - today) for the soil-moisture model through NASA
AppEEARS, at the 13 existing sites plus a 0.25 degree grid over the Ayeyarwady Delta.
Needs an Earthdata login in ~/.netrc. Sea points simply return no valid readings.

    python -m app.ml.fetch_smap_history submit
    python -m app.ml.fetch_smap_history collect
"""
import json
import sys
import time
from datetime import date
from pathlib import Path

import numpy as np
import pandas as pd
import requests

sys.path.insert(0, str(Path(__file__).resolve().parents[1] / "data_sources"))
from fetch_appeears import API, HEADERS, SMAP, smap_layers, token  # noqa: E402

from app.ml.soil_moisture import ROOT, SMAP_FILES  # noqa: E402

OUT = ROOT / "data" / "raw" / "appeears" / "ml_history"
TASK = OUT / "task.json"
SMAP_START = "03-31-2015"  # first day of SPL3SMP_E
# Delta farmland box, roughly Hinthada to the coast and Pathein to Yangon
LAT = (15.9, 17.8)
LON = (94.6, 96.3)


def sites() -> list[dict]:
    pts = []
    for f in SMAP_FILES:
        d = pd.read_csv(f, usecols=["ID", "Latitude", "Longitude"]).drop_duplicates("ID")
        pts += [{"id": r.ID, "category": "site", "latitude": float(r.Latitude), "longitude": float(r.Longitude)}
                for r in d.itertuples()]
    for lat in np.arange(LAT[0], LAT[1] + 1e-9, 0.25):
        for lon in np.arange(LON[0], LON[1] + 1e-9, 0.25):
            pts.append({"id": f"g{lat:.2f}_{lon:.2f}", "category": "grid", "latitude": round(float(lat), 3),
                        "longitude": round(float(lon), 3)})
    return pts


def submit():
    OUT.mkdir(parents=True, exist_ok=True)
    coords = sites()
    task = {"task_type": "point", "task_name": "fieldshift-smap-history",
            "params": {"dates": [{"startDate": SMAP_START, "endDate": date.today().strftime("%m-%d-%Y")}],
                       "layers": [{"product": SMAP, "layer": l} for l in smap_layers()],
                       "coordinates": coords}}
    r = requests.post(f"{API}/task", json=task, headers={**HEADERS, "Authorization": f"Bearer {token()}"}, timeout=60)
    if r.status_code >= 400:
        sys.exit(f"submit failed: HTTP {r.status_code} {r.text}")
    TASK.write_text(json.dumps({"task_id": r.json()["task_id"], "points": len(coords),
                                "submitted": time.strftime("%Y-%m-%dT%H:%M:%S")}, indent=2), encoding="utf-8")
    print("submitted", r.json()["task_id"], "points:", len(coords))


def collect(wait_minutes=180):
    task_id = json.loads(TASK.read_text(encoding="utf-8"))["task_id"]
    auth = {**HEADERS, "Authorization": f"Bearer {token()}"}
    deadline = time.time() + wait_minutes * 60
    while True:
        s = requests.get(f"{API}/task/{task_id}", headers=auth, timeout=60).json().get("status")
        print(time.strftime("%H:%M:%S"), "status:", s, flush=True)
        if s == "done":
            break
        if s == "error" or time.time() > deadline:
            sys.exit(f"task not finished (status={s})")
        time.sleep(60)
    for f in requests.get(f"{API}/bundle/{task_id}", headers=auth, timeout=60).json()["files"]:
        if not f["file_name"].endswith(".csv"):
            continue
        dl = requests.get(f"{API}/bundle/{task_id}/{f['file_id']}", headers=auth, timeout=600, allow_redirects=True)
        dl.raise_for_status()
        (OUT / Path(f["file_name"]).name).write_bytes(dl.content)
        print("downloaded", Path(f["file_name"]).name, len(dl.content) // 1024, "KB")


if __name__ == "__main__":
    {"submit": submit, "collect": collect}.get(sys.argv[1] if len(sys.argv) > 1 else "", lambda: sys.exit(__doc__))()
