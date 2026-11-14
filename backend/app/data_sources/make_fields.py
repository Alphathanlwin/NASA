# AI-assisted: Claude Code
"""Write data/fields.geojson: one DEMO field per reference town.

Shapes, names, crop history and the irrigation setting are illustrative (DEMO).
The coordinates are real, so the data fetched for them is real.
"""
import math

from common import DATA, config, distance_km, snap_to_power_grid, utc_now, write_json


def rectangle(lat, lon, width_m, height_m, rot_deg):
    m_lat = 111_320.0
    m_lon = 111_320.0 * math.cos(math.radians(lat))
    rot = math.radians(rot_deg)
    ring = []
    for sx, sy in [(-1, -1), (1, -1), (1, 1), (-1, 1), (-1, -1)]:
        x, y = sx * width_m / 2, sy * height_m / 2
        xr = x * math.cos(rot) - y * math.sin(rot)
        yr = x * math.sin(rot) + y * math.cos(rot)
        ring.append([round(lon + xr / m_lon, 6), round(lat + yr / m_lat, 6)])
    return ring


def main():
    cfg = config()
    towns = {t["id"]: t for t in cfg["towns"]}
    features = []
    for f in cfg["demo_fields"]:
        town = towns[f["town"]]
        glat, glon = snap_to_power_grid(town["lat"], town["lon"])
        hectares = f["width_m"] * f["height_m"] / 10_000
        features.append({
            "type": "Feature", "id": f["id"],
            "properties": {
                "id": f["id"], "name": f["name"], "centroid": [f["lat"], f["lon"]],
                "area_acres": round(hectares * 2.471, 1),
                "town_id": town["id"], "town_name": town["name"],
                "town_distance_km": round(distance_km(f["lat"], f["lon"], town["lat"], town["lon"]), 1),
                "power_grid": [glat, glon],
                "crop_history": ["rice", "rice"],  # DEMO: monsoon rice, then dry-season rice (the baseline)
                "irrigation": f["irrigation"],     # DEMO
                "status": "DEMO",
            },
            "geometry": {"type": "Polygon", "coordinates": [rectangle(f["lat"], f["lon"], f["width_m"], f["height_m"], f["rotation_deg"])]},
        })
    write_json(DATA / "fields.geojson", {
        "type": "FeatureCollection", "generated_at": utc_now(),
        "note": "DEMO field layout. Shapes, names, crop history and irrigation settings are illustrative.",
        "features": features,
    })
    print(f"wrote {len(features)} demo fields")


if __name__ == "__main__":
    main()
