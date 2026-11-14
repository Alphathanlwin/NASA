"""Point-sample MODIS NDVI/EVI and SMAP soil moisture for the demo fields through
NASA AppEEARS. Needs an Earthdata login in ~/.netrc (machine urs.earthdata.nasa.gov).

    python pipeline/fetch_appeears.py layers    # list the layer names AppEEARS offers
    python pipeline/fetch_appeears.py submit    # start the task, save its id
    python pipeline/fetch_appeears.py collect   # poll; download the CSVs when done
"""
import netrc
import sys
import time
from datetime import date, timedelta
from pathlib import Path

import json
import requests

from common import RAW, USER_AGENT, load_fields, utc_now, write_json

API = "https://appeears.earthdatacloud.nasa.gov/api"
OUT = RAW / "appeears"
TASK_FILE = OUT / "task.json"
HEADERS = {"User-Agent": USER_AGENT}

MODIS = "MOD13Q1.061"
SMAP = "SPL3SMP_E.006"
MODIS_LAYERS = ["_250m_16_days_NDVI", "_250m_16_days_EVI", "_250m_16_days_pixel_reliability"]


def credentials():
    for name in (".netrc", "_netrc"):
        path = Path.home() / name
        if path.exists():
            auth = netrc.netrc(str(path)).authenticators("urs.earthdata.nasa.gov")
            if auth:
                return auth[0], auth[2]
    sys.exit("No urs.earthdata.nasa.gov entry found in ~/.netrc or ~/_netrc")


def token():
    user, password = credentials()
    resp = requests.post(f"{API}/login", auth=(user, password), headers=HEADERS, timeout=60)
    resp.raise_for_status()
    return resp.json()["token"]


def product_layers(product):
    resp = requests.get(f"{API}/product/{product}", headers=HEADERS, timeout=60)
    resp.raise_for_status()
    return resp.json()


def smap_layers():
    """Pick the AM/PM soil moisture layers plus their retrieval-quality flags by name."""
    names = list(product_layers(SMAP).keys())
    wanted = []
    for n in names:
        low = n.lower()
        if low.endswith("soil_moisture") or low.endswith("soil_moisture_pm"):
            wanted.append(n)
        elif low.endswith(("retrieval_qual_flag", "retrieval_qual_flag_pm")):
            wanted.append(n)
    return wanted


def cmd_layers():
    for product in (MODIS, SMAP):
        print(product)
        for name, meta in product_layers(product).items():
            print(f"  {name}  [{meta.get('Units', '')}] fill={meta.get('FillValue')} scale={meta.get('ScaleFactor')}")
    print("SMAP layers this script would request:", smap_layers())


def cmd_submit():
    end = date.today()
    start = end - timedelta(days=400)
    layers = [{"product": MODIS, "layer": l} for l in MODIS_LAYERS]
    layers += [{"product": SMAP, "layer": l} for l in smap_layers()]
    coords = [{"id": f["id"], "category": "field", "latitude": f["centroid"][0], "longitude": f["centroid"][1]}
              for f in load_fields()]
    task = {
        "task_type": "point",
        "task_name": "fieldshift-demo-fields",
        "params": {
            "dates": [{"startDate": start.strftime("%m-%d-%Y"), "endDate": end.strftime("%m-%d-%Y")}],
            "layers": layers,
            "coordinates": coords,
        },
    }
    resp = requests.post(f"{API}/task", json=task,
                         headers={**HEADERS, "Authorization": f"Bearer {token()}"}, timeout=60)
    if resp.status_code >= 400:
        sys.exit(f"submit failed: HTTP {resp.status_code} {resp.text}")
    info = resp.json()
    write_json(TASK_FILE, {"task_id": info["task_id"], "submitted_utc": utc_now(), "request": task})
    print("submitted task", info["task_id"], info.get("status"))


def cmd_collect(wait_minutes=40):
    task_id = json.loads(TASK_FILE.read_text(encoding="utf-8"))["task_id"]
    auth = {**HEADERS, "Authorization": f"Bearer {token()}"}
    deadline = time.time() + wait_minutes * 60
    while True:
        resp = requests.get(f"{API}/task/{task_id}", headers=auth, timeout=60)
        resp.raise_for_status()
        status = resp.json().get("status")
        print(time.strftime("%H:%M:%S"), "status:", status, flush=True)
        if status == "done":
            break
        if status == "error" or time.time() > deadline:
            sys.exit(f"task not finished (status={status})")
        time.sleep(30)

    bundle = requests.get(f"{API}/bundle/{task_id}", headers=auth, timeout=60)
    bundle.raise_for_status()
    for f in bundle.json()["files"]:
        name = Path(f["file_name"]).name
        dl = requests.get(f"{API}/bundle/{task_id}/{f['file_id']}", headers=auth, timeout=300,
                          allow_redirects=True, stream=True)
        dl.raise_for_status()
        (OUT / name).write_bytes(dl.content)
        print("downloaded", name)
    write_json(OUT / "retrieved.json", {"task_id": task_id, "retrieved_utc": utc_now()})


if __name__ == "__main__":
    cmd = sys.argv[1] if len(sys.argv) > 1 else ""
    {"layers": cmd_layers, "submit": cmd_submit, "collect": cmd_collect}.get(
        cmd, lambda: sys.exit(__doc__))()
