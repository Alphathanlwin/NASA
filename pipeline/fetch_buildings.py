# AI-assisted: Claude Code
"""Fetch houses, buildings and village areas from OpenStreetMap around the four reference towns
through the public Overpass API (© OpenStreetMap contributors, ODbL). No login needed.

The app uses them to say that no crop can be planted where a drawn field has a house or building
inside it, or is mostly a village. Buildings are kept as their centre point only (enough to tell
"inside this field or not" and small enough to ship with the app); village areas keep their outline.
Asking the live service while a farmer draws took 25-45 s, so the data are fetched once here.

    python pipeline/fetch_buildings.py
"""
import time

import requests

from common import CLEAN, DATA, USER_AGENT, read_json, utc_now, write_json

API = "https://overpass-api.de/api/interpreter"
HALF = 0.12  # degrees either side of each town, about 13 km


def query(q: str):
    for attempt in range(5):
        try:
            r = requests.post(API, data={"data": q}, headers={"User-Agent": USER_AGENT}, timeout=400)
            if r.status_code == 200:
                return r.json()
            print(f"  HTTP {r.status_code}, retrying", flush=True)
        except requests.RequestException as exc:
            print(f"  {type(exc).__name__}, retrying", flush=True)
        time.sleep(20 * (attempt + 1))
    raise RuntimeError("Overpass did not answer")


def main():
    towns = read_json(DATA / "reference" / "towns.json")["towns"]
    seen, buildings, villages, boxes = set(), [], [], []
    for t in towns:
        s, w, n, e = t["lat"] - HALF, t["lon"] - HALF, t["lat"] + HALF, t["lon"] + HALF
        box = f"{s:.4f},{w:.4f},{n:.4f},{e:.4f}"
        boxes.append({"town": t["id"], "south": s, "west": w, "north": n, "east": e})
        b = query(f'[out:json][timeout:300];way["building"]({box});out center;')
        for el in b.get("elements", []):
            c = el.get("center")
            if c and el["id"] not in seen:
                seen.add(el["id"])
                buildings.append([round(c["lat"], 5), round(c["lon"], 5)])
        v = query(f'[out:json][timeout:300];way["landuse"="residential"]({box});out geom;')
        for el in v.get("elements", []):
            g = el.get("geometry") or []
            if len(g) >= 3 and el["id"] not in seen:
                seen.add(el["id"])
                villages.append([[round(p["lat"], 5), round(p["lon"], 5)] for p in g])
        print(f"{t['id']}: {len(buildings)} buildings, {len(villages)} village areas so far", flush=True)
        time.sleep(5)

    write_json(CLEAN / "buildings.json", {
        "retrieved_at": utc_now(), "source": "OpenStreetMap via Overpass API (© OpenStreetMap contributors, ODbL)",
        "note": "Buildings as centre points; residential landuse as outlines. Boxes are 0.24 degrees around each town.",
        "boxes": boxes, "buildings": buildings, "villages": villages,
    })
    print(f"wrote buildings.json: {len(buildings)} buildings, {len(villages)} village areas", flush=True)


if __name__ == "__main__":
    main()
