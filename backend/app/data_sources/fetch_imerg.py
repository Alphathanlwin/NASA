# AI-assisted: Claude Code
"""Fetch NASA GPM IMERG daily rainfall, LATE run (GPM_3IMERGDL V07), for each reference town.

NOT YET RUN: it needs an Earthdata login in ~/.netrc and `pip install earthaccess xarray h5netcdf`.
The team's login was rejected (HTTP 401) on 14 Nov 2026, so the app shows IMERG as UNAVAILABLE.
The Late run is used because the Final run lags by months. Every row records its run.

    python backend/app/data_sources/fetch_imerg.py [days]
"""
import sys
from datetime import date, timedelta

from common import RAW, towns, utc_now, write_json

SHORT_NAME, VERSION, RUN = "GPM_3IMERGDL", "07", "Late"


def main(days: int = 60):
    import earthaccess
    import xarray as xr

    earthaccess.login(strategy="netrc")
    end = date.today() - timedelta(days=1)
    start = end - timedelta(days=days)
    pts = towns()
    lats, lons = [t["lat"] for t in pts], [t["lon"] for t in pts]
    granules = earthaccess.search_data(short_name=SHORT_NAME, version=VERSION, temporal=(str(start), str(end)),
                                       bounding_box=(min(lons) - 0.2, min(lats) - 0.2, max(lons) + 0.2, max(lats) + 0.2))
    rows = []
    for handle in earthaccess.open(granules):
        ds = xr.open_dataset(handle)
        fill = ds["precipitation"].attrs.get("_FillValue")
        for t in pts:
            v = float(ds["precipitation"].sel(lat=t["lat"], lon=t["lon"], method="nearest").values.squeeze())
            missing = v != v or (fill is not None and v == fill) or not 0 <= v <= 500
            rows.append({"town": t["id"], "date": str(ds["time"].values[0])[:10],
                         "precip_mm": None if missing else round(v, 2), "run": RUN, "product": f"{SHORT_NAME}.{VERSION}"})
    write_json(RAW / "imerg" / "daily_late.json", {"retrieved_at": utc_now(), "rows": rows})
    print(f"{len(rows)} rows")


if __name__ == "__main__":
    main(int(sys.argv[1]) if len(sys.argv) > 1 else 60)
