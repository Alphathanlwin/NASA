"""Write data/fields.geojson: six DEMO field blocks near Twante, Yangon Region.

The shapes, names, crop history and irrigation flags are illustrative (DEMO).
Only the coordinates are real, so the NASA values fetched for them are real.
"""
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]

# id, name, centre lat, centre lon, width m, height m, rotation deg,
# usual rotation as [monsoon crop, dry-season crop], irrigated
FIELDS = [
    ("F-01", "Twante North Block", 16.7352, 95.9548, 460, 340, 12, ["monsoon_rice", "black_gram"], False),
    ("F-02", "Canal Side Block", 16.7120, 95.9880, 520, 300, -8, ["monsoon_rice", "summer_rice"], True),
    ("F-03", "Kyaung Su Block", 16.7015, 95.9402, 420, 380, 25, ["monsoon_rice", "fallow"], False),
    ("F-04", "Htan Pin Block", 16.6893, 95.9715, 480, 320, 4, ["monsoon_rice", "green_gram"], False),
    ("F-05", "River Bend Block", 16.7246, 95.9221, 400, 360, -20, ["monsoon_rice", "maize"], True),
    ("F-06", "South Embankment Block", 16.6761, 95.9489, 540, 310, 15, ["monsoon_rice", "black_gram"], False),
]

# DEMO start point for the agent (not a real office location).
BASE = {"name": "Agent base (DEMO)", "lat": 16.7090, "lon": 95.9560}


def rectangle(lat, lon, width_m, height_m, rot_deg):
    m_per_deg_lat = 111_320.0
    m_per_deg_lon = 111_320.0 * math.cos(math.radians(lat))
    rot = math.radians(rot_deg)
    corners = [(-1, -1), (1, -1), (1, 1), (-1, 1), (-1, -1)]
    ring = []
    for sx, sy in corners:
        x, y = sx * width_m / 2, sy * height_m / 2
        xr = x * math.cos(rot) - y * math.sin(rot)
        yr = x * math.sin(rot) + y * math.cos(rot)
        ring.append([round(lon + xr / m_per_deg_lon, 6), round(lat + yr / m_per_deg_lat, 6)])
    return ring


def main():
    features = []
    for fid, name, lat, lon, w, h, rot, history, irrigated in FIELDS:
        features.append({
            "type": "Feature",
            "id": fid,
            "properties": {
                "id": fid,
                "name": name,
                "centroid": [lat, lon],
                "area_ha": round(w * h / 10_000, 1),
                "crop_history": history,
                "irrigated": irrigated,
                "status": "DEMO",
            },
            "geometry": {"type": "Polygon", "coordinates": [rectangle(lat, lon, w, h, rot)]},
        })
    out = {
        "type": "FeatureCollection",
        "note": "DEMO field layout. Shapes, names, crop history and irrigation flags are illustrative.",
        "agent_base": BASE,
        "features": features,
    }
    path = ROOT / "data" / "fields.geojson"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(out, indent=2), encoding="utf-8")
    print(f"wrote {path} ({len(features)} fields)")


if __name__ == "__main__":
    main()
