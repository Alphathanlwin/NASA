# AI-assisted: Claude Code
"""Extract FAO EcoCrop ranges for the 'other crops and fruits' list (Delta shortlist).

    python pipeline/extract_ecocrop_shortlist.py <path to EcoCrop_DB.csv>

Source: FAO EcoCrop database as mirrored at https://github.com/OpenCLIM/ecocrop (EcoCrop_DB.csv).
Output: data/reference/ecocrop_shortlist.json (the frontend imports this file directly).
Crops without temperature, rainfall or growing-period values in EcoCrop are skipped and listed,
never filled in by hand.
"""
import csv
import sys

from common import DATA, utc_now, write_json

# key -> exact EcoCrop ScientificName
SHORTLIST = {
    "maize": "Zea mays ssp. mays",
    "sesame": "Sesamum indicum",
    "groundnut": "Arachis hypogaea",
    "chickpea": "Cicer arietinum",
    "sunflower": "Helianthus annuus",
    "cowpea": "Vigna unguiculata",
    "pigeon_pea": "Cajanus cajan",
    "sweet_potato": "Ipomoea batatas",
    "chilli": "Capsicum annuum",
    "onion": "Allium cepa var. cepa",
    "tomato": "Lycopersicon esculentum",
    "watermelon": "Citrullus lanatus",
    "sugarcane": "Saccharum officinarum",
    "mango": "Mangifera indica",
    "banana": "Musa sp.",
    "coconut": "Cocos nucifera",
    "papaya": "Carica papaya",
    "pineapple": "Ananas comosus",
    "jackfruit": "Artocarpus heterophyllus",
    "lime": "Citrus aurantifolia",
    "betel_nut": "Areca catechu",
}
FIELDS = {
    "TMIN": "t_min", "TOPMN": "t_opt_min", "TOPMX": "t_opt_max", "TMAX": "t_max",
    "RMIN": "r_min", "ROPMN": "r_opt_min", "ROPMX": "r_opt_max", "RMAX": "r_max",
    "PHMIN": "ph_min", "PHOPMN": "ph_opt_min", "PHOPMX": "ph_opt_max", "PHMAX": "ph_max",
    "GMIN": "cycle_min_days", "GMAX": "cycle_max_days",
}
FRUIT = {"mango", "banana", "coconut", "papaya", "pineapple", "jackfruit", "lime", "betel_nut"}


def num(text):
    try:
        v = float(text)
        return v
    except (TypeError, ValueError):
        return None


def main(path):
    rows = {r["ScientificName"].strip(): r for r in csv.DictReader(open(path, newline="", encoding="latin-1"))}
    crops, skipped = {}, {}
    for key, name in SHORTLIST.items():
        r = rows.get(name)
        if r is None:
            skipped[key] = f"{name} not in EcoCrop"
            continue
        v = {new: num(r[old]) for old, new in FIELDS.items()}
        span = r["LISPA"].lower()
        perennial = "perennial" in span and "annual" not in span
        need = ["t_min", "t_opt_min", "t_opt_max", "t_max", "r_min", "r_opt_min", "r_opt_max", "r_max"]
        if any(v[k] is None for k in need):
            skipped[key] = "EcoCrop has no temperature or rainfall range"
            continue
        if not perennial and not (v["cycle_min_days"] and v["cycle_max_days"]):
            skipped[key] = "EcoCrop has no growing-period length for this annual crop"
            continue
        crops[key] = {"scientific_name": name, "ecoport_code": r["EcoPortCode"], "perennial": perennial,
                      "fruit": key in FRUIT, "life_form": f"{r['LIFO'].strip()} {r['LISPA'].strip()}".strip(), **v}
    out = {
        "source": "FAO EcoCrop database, via https://github.com/OpenCLIM/ecocrop (EcoCrop_DB.csv)",
        "extracted_utc": utc_now(),
        "note": "Global ranges, not Myanmar-specific. Annual crops: rainfall range is for the growing cycle; "
                "perennials: for the year.",
        "crops": crops,
        "skipped": skipped,
    }
    write_json(DATA / "reference" / "ecocrop_shortlist.json", out)
    print(len(crops), "crops;", "skipped:", skipped)


if __name__ == "__main__":
    main(sys.argv[1])
