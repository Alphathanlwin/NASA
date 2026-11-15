# AI-assisted: Claude Code
"""Fetch NASA GPM IMERG monthly rainfall, Final run (GPM_3IMERGM V07), 2001-2025, for each
reference town's 0.1-degree cell, and build a monthly rainfall climatology.

Why: NASA POWER's corrected precipitation (MERRA-2 based) at the western Delta cells averages
600-1,100 mm a year at Pathein and Myaungmya, far below the 2,500-3,000 mm the Delta receives.
IMERG is NASA's satellite rainfall product and is used for the long-term rain averages (clean_all.py).

Same OPeNDAP access as fetch_imerg.py (Earthdata token, GES DISC agreement accepted).

    python pipeline/fetch_imerg_monthly.py
"""
import calendar
import time
from datetime import date

import requests

from common import DATA, RAW, USER_AGENT, towns, utc_now, write_json
from fetch_imerg import CMR, cell, opendap_url, read_values, token

SHORT_NAME, VERSION, RUN = "GPM_3IMERGM", "07", "Final"
YEARS = (2001, 2025)


def granules() -> list[dict]:
    out, page = [], 1
    while True:
        r = requests.get(CMR, params={"short_name": SHORT_NAME, "version": VERSION, "page_size": 200, "page_num": page,
                                      "temporal": f"{YEARS[0]}-01-01T00:00:00Z,{YEARS[1]}-12-31T23:59:59Z",
                                      "sort_key": "start_date"}, headers={"User-Agent": USER_AGENT}, timeout=90)
        r.raise_for_status()
        items = r.json()["feed"]["entry"]
        out += items
        if len(items) < 200:
            return out
        page += 1


def main():
    headers = {"Authorization": f"Bearer {token()}", "User-Agent": USER_AGENT}
    pts = towns()
    idx = [cell(t["lat"], t["lon"]) for t in pts]
    found = granules()
    print(f"{len(found)} monthly files", flush=True)
    rows = []
    for g in found:
        y, m = int(g["time_start"][:4]), int(g["time_start"][5:7])
        hours = calendar.monthrange(y, m)[1] * 24
        rates = read_values(opendap_url(g), headers, idx, var="/Grid/precipitation")  # mm/hr, monthly mean rate
        for t, (i, j), v in zip(pts, idx, rates):
            rows.append({"town": t["id"], "year": y, "month": m, "rate_mm_hr": v,
                         "precip_mm": None if v is None else round(v * hours, 1),
                         "cell_lat": round(-89.95 + j * 0.1, 2), "cell_lon": round(-179.95 + i * 0.1, 2),
                         "granule": g["title"].split(":")[-1]})
        print(y, m, [r["precip_mm"] for r in rows[-len(pts):]], flush=True)
        time.sleep(0.2)
    write_json(RAW / "imerg" / "monthly_final.json", {"retrieved_at": utc_now(), "product": f"{SHORT_NAME}.{VERSION}",
                                                      "run": RUN, "rows": rows})

    # climatology: mean monthly total per town over the years with a value
    clim = {}
    for t in pts:
        months = []
        for m in range(1, 13):
            vals = [r["precip_mm"] for r in rows if r["town"] == t["id"] and r["month"] == m and r["precip_mm"] is not None]
            months.append(round(sum(vals) / len(vals), 1) if vals else None)
        clim[t["id"]] = {"rain_mm_month": months, "years": [YEARS[0], YEARS[1]],
                         "annual_mm": round(sum(v for v in months if v is not None), 0)}
        print(t["id"], clim[t["id"]]["annual_mm"], "mm/yr", months)
    write_json(DATA / "clean" / "imerg_monthly_climatology.json", {
        "retrieved_at": utc_now(), "product": f"{SHORT_NAME}.{VERSION} ({RUN} run), 0.1 degree",
        "period": f"{YEARS[0]}-{YEARS[1]}", "towns": clim})


if __name__ == "__main__":
    main()
