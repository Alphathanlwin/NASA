"""Extract FAO EcoCrop tolerance ranges for the crops in the rotation engine.

    python pipeline/extract_ecocrop.py <path to EcoCrop_DB.csv>

The CSV is the FAO EcoCrop database as mirrored at
https://github.com/OpenCLIM/ecocrop (EcoCrop_DB.csv).
Output: data/reference/ecocrop_ranges.json
"""
import csv
import sys

from common import DATA, utc_now, write_json

SPECIES = {
    "rice": "Oryza sativa",
    "black_gram": "Vigna mungo",
    "green_gram": "Vigna radiata",
    "chickpea": "Cicer arietinum",
    "pigeon_pea": "Cajanus cajan",
    "sesame": "Sesamum indicum",
    "groundnut": "Arachis hypogaea",
    "maize": "Zea mays",
}
FIELDS = {
    "TOPMN": "temp_opt_min_c", "TOPMX": "temp_opt_max_c", "TMIN": "temp_abs_min_c", "TMAX": "temp_abs_max_c",
    "ROPMN": "rain_opt_min_mm", "ROPMX": "rain_opt_max_mm", "RMIN": "rain_abs_min_mm", "RMAX": "rain_abs_max_mm",
    "PHOPMN": "ph_opt_min", "PHOPMX": "ph_opt_max", "PHMIN": "ph_abs_min", "PHMAX": "ph_abs_max",
    "GMIN": "cycle_min_days", "GMAX": "cycle_max_days",
}


def num(text):
    try:
        return float(text)
    except (TypeError, ValueError):
        return None


def main(path):
    with open(path, newline="", encoding="latin-1") as fh:
        rows = list(csv.DictReader(fh))
    out = {}
    for key, name in SPECIES.items():
        matches = [r for r in rows if r["ScientificName"].strip().lower().startswith(name.lower())]
        exact = [r for r in matches if r["ScientificName"].strip().lower() == name.lower()]
        row = (exact or matches or [None])[0]
        if row is None:
            print(f"{key}: NOT FOUND ({name})")
            continue
        out[key] = {"scientific_name": row["ScientificName"].strip(), "ecoport_code": row["EcoPortCode"],
                    **{new: num(row[old]) for old, new in FIELDS.items()}}
        print(key, out[key])
    write_json(DATA / "reference" / "ecocrop_ranges.json", {
        "source": "FAO EcoCrop database, via https://github.com/OpenCLIM/ecocrop (EcoCrop_DB.csv)",
        "extracted_utc": utc_now(),
        "note": "Rainfall ranges are for the crop's growing cycle. Ranges are global, not Myanmar-specific.",
        "crops": out,
    })


if __name__ == "__main__":
    main(sys.argv[1])
