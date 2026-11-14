# AI-assisted: Claude Code
"""Clean every raw file and write what the app serves.

    data/raw/  ->  data/clean/*.parquet|json
               ->  data/snapshots/fields_snapshot.json   (field profiles + climatology)
               ->  data/reports/cleaning_report.json     (rows in/out, drops, date ranges)
               ->  data/sources.json + data/SOURCES.md   (source catalogue)

Raw files are never edited. Missing sources are reported as UNAVAILABLE, never filled in.

    python backend/app/data_sources/clean_all.py
"""
import json
from datetime import date

import pandas as pd

from common import CLEAN, DATA, POWER_FILL, RAW, REPORTS, SNAPSHOTS, load_fields, read_json, towns, utc_now, write_json

RANGES = {  # physical range checks; values outside are set to missing and counted
    "T2M": (-10, 50), "T2M_MAX": (-10, 55), "T2M_MIN": (-15, 45), "PRECTOTCORR": (0, 500),
    "RH2M": (0, 100), "WS2M": (0, 40), "ALLSKY_SFC_SW_DWN": (0, 45), "GWETTOP": (0, 1), "GWETROOT": (0, 1),
}
POWER_RES = "0.5 x 0.625 degree grid cell (about 55 x 67 km)"


def r(value, digits=2):
    return None if value is None or pd.isna(value) else round(float(value), digits)


def power_frame(raw: dict):
    df = pd.DataFrame(raw["response"]["properties"]["parameter"])
    rows_in = len(df)
    df.index = pd.to_datetime(df.index, format="%Y%m%d")
    fills = int(df.isin(POWER_FILL).sum().sum())
    df = df.mask(df.isin(POWER_FILL))
    out_of_range = 0
    for col, (lo, hi) in RANGES.items():
        if col in df:
            bad = (df[col] < lo) | (df[col] > hi)
            out_of_range += int(bad.sum())
            df.loc[bad, col] = float("nan")
    empty = df.isna().all(axis=1)
    df = df[~empty]
    df = df[~df.index.duplicated()].sort_index()
    stats = {"rows_in": rows_in, "rows_out": len(df),
             "dropped": [{"reason": "all variables missing (POWER fill value)", "rows": int(empty.sum())}],
             "values_set_missing": [{"reason": "POWER fill value -999 / -99", "values": fills},
                                    {"reason": "outside physical range", "values": out_of_range}],
             "date_range": [str(df.index.min().date()), str(df.index.max().date())] if len(df) else None,
             "retrieved_at": raw["retrieved_at"],
             "api_version": raw["response"].get("header", {}).get("api", {}).get("version")}
    return df, stats


def clean_power_recent(report):
    frames, meta = [], {}
    for t in towns():
        raw = read_json(RAW / "power" / f"recent_{t['id']}.json")
        if not raw:
            continue
        df, stats = power_frame(raw)
        df["rain_7d"] = df["PRECTOTCORR"].rolling(7, min_periods=5).sum()
        df["rain_30d"] = df["PRECTOTCORR"].rolling(30, min_periods=24).sum()
        df = df.reset_index(names="date")
        df.insert(0, "town", t["id"])
        frames.append(df)
        meta[t["id"]] = stats
        report["sources"][f"power_recent:{t['id']}"] = stats
    if not frames:
        return None, meta
    out = pd.concat(frames, ignore_index=True)
    CLEAN.mkdir(parents=True, exist_ok=True)
    out.to_parquet(CLEAN / "power_recent.parquet", index=False)
    return out, meta


def clean_power_climatology(report):
    """Day-of-year means from about 30 years of daily data. Index 1-366 on a leap-year calendar."""
    frames, meta = [], {}
    for t in towns():
        raw = read_json(RAW / "power" / f"history_{t['id']}.json")
        if not raw:
            continue
        df, stats = power_frame(raw)
        # Homogeneity check on rainfall. In this region POWER's PRECTOTCORR has years whose
        # annual total is a small fraction of the recent level (a break around 2008). Years
        # below 40% of the median of the last 10 years are left out of the rainfall means
        # and listed in the report. Temperature and humidity keep every year.
        annual = df["PRECTOTCORR"].groupby(df.index.year).sum()
        reference = annual.tail(10).median()
        excluded = [int(y) for y, total in annual.items() if total < 0.4 * reference]
        rain = df.loc[~df.index.year.isin(excluded), "PRECTOTCORR"]
        doy = pd.Series([date(2000, d.month, d.day).timetuple().tm_yday for d in df.index], index=df.index)
        g = df.groupby(doy)
        rg = rain.groupby(doy[rain.index])
        clim = pd.DataFrame({
            "rain_mm": rg.mean(), "t2m_max": g["T2M_MAX"].mean(),
            "t2m_min": g["T2M_MIN"].mean(), "rh2m": g["RH2M"].mean(), "n_years_rain": rg.count(),
        }).reset_index(names="doy")
        stats["rain_years_excluded"] = excluded
        stats["rain_years_used"] = [int(y) for y in annual.index if int(y) not in excluded]
        stats["rain_annual_totals_mm"] = {int(y): round(float(v)) for y, v in annual.items()}
        stats["dropped"].append({"reason": "rainfall only: years with an annual total under 40% of the recent median (inhomogeneous series)",
                                 "rows": int(df.index.year.isin(excluded).sum())})
        clim.insert(0, "town", t["id"])
        frames.append(clim)
        stats["years"] = [int(df.index.min().year), int(df.index.max().year)]
        stats["output"] = "366 day-of-year means"
        meta[t["id"]] = stats
        report["sources"][f"power_history:{t['id']}"] = stats
    if not frames:
        return None, meta
    out = pd.concat(frames, ignore_index=True)
    CLEAN.mkdir(parents=True, exist_ok=True)
    out.to_parquet(CLEAN / "power_doy_climatology.parquet", index=False)
    return out, meta


def clean_soilgrids(report):
    names = {"phh2o": "ph", "soc": "soc_g_per_kg", "sand": "sand_pct", "silt": "silt_pct", "clay": "clay_pct", "cec": "cec_cmol_per_kg"}
    out = {}
    for path in sorted((RAW / "soilgrids").glob("F-*.json")):
        raw = json.loads(path.read_text(encoding="utf-8"))
        values, missing = {}, []
        for layer in raw["response"]["properties"]["layers"]:
            name = names.get(layer["name"])
            if not name:
                continue
            mean = layer["depths"][0]["values"].get("mean")
            factor = layer["unit_measure"]["d_factor"]  # conversion factor read from the response
            values[name] = None if mean is None else round(mean / factor, 2)
            if mean is None:
                missing.append(name)
        if values.get("ph") is not None and not 3 <= values["ph"] <= 10:
            values["ph"] = None
            missing.append("ph (outside 3-10)")
        out[path.stem] = {"values": values, "retrieved_at": raw["retrieved_at"]}
        report["sources"][f"soilgrids:{path.stem}"] = {
            "rows_in": 6, "rows_out": 6 - len([m for m in missing if "outside" not in m]),
            "dropped": [{"reason": "no value at this pixel", "rows": len(missing)}] if missing else [],
            "retrieved_at": raw["retrieved_at"]}
    if out:
        write_json(CLEAN / "soil.json", out)
    return out


def clean_modis(report):
    folder = RAW / "modis_ornl"
    bands = (read_json(folder / "bands.json") or {}).get("bands")
    if not bands:
        return {}, None

    def meta(name):
        b = bands[name]
        lo, hi = (float(x) for x in b["valid_range"].split(" to "))
        return float(b.get("scale_factor") or 1), float(b["fill_value"]), lo, hi

    out, retrieved = {}, None
    rows_in = fill = cloudy = 0
    first = last = None
    for path in sorted(folder.glob("F-*.json")):
        raw = json.loads(path.read_text(encoding="utf-8"))
        retrieved = raw["retrieved_at"]
        by_date = {}
        for row in raw["rows"]:
            by_date.setdefault(row["calendar_date"], {})[row["band"]] = row["value"]
        series = []
        for day in sorted(by_date):
            rows_in += 1
            rec = by_date[day]
            scale, fv, lo, hi = meta("250m_16_days_NDVI")
            v = rec.get("250m_16_days_NDVI")
            if v is None or v == fv or not lo <= v <= hi:
                fill += 1
                continue
            rel = rec.get("250m_16_days_pixel_reliability")  # 0 good, 1 marginal, 2 snow/ice, 3 cloudy, -1 fill
            if rel not in (0, 1):
                cloudy += 1
                continue
            series.append({"date": day, "ndvi": round(v * scale, 3), "marginal": rel == 1})
            first = day if first is None or day < first else first
            last = day if last is None or day > last else last
        if series:
            out[path.stem] = series
    report["sources"]["modis_mod13q1"] = {
        "rows_in": rows_in, "rows_out": sum(len(s) for s in out.values()),
        "dropped": [{"reason": "fill value or outside valid range", "rows": fill},
                    {"reason": "pixel reliability flag: cloud, snow or fill", "rows": cloudy}],
        "date_range": [first, last], "retrieved_at": retrieved}
    if out:
        write_json(CLEAN / "ndvi.json", out)
    return out, retrieved


def obs(value, unit, variable, period, source, digits=2):
    return {"value": r(value, digits), "unit": unit, "variable": variable, "period": period, "source": source}


def build_snapshot(recent, recent_meta, clim, clim_meta, soil, ndvi, ndvi_retrieved):
    fields, climatology = {}, {}
    if clim is not None:
        for town, g in clim.groupby("town"):
            g = g.sort_values("doy")
            climatology[town] = {
                "years": clim_meta[town]["years"], "rain_years": [min(clim_meta[town]["rain_years_used"]), max(clim_meta[town]["rain_years_used"])],
                "rain_years_excluded": clim_meta[town]["rain_years_excluded"], "retrieved_at": clim_meta[town]["retrieved_at"],
                "rain_mm": [r(v) for v in g["rain_mm"]], "t2m_max": [r(v, 1) for v in g["t2m_max"]],
                "t2m_min": [r(v, 1) for v in g["t2m_min"]], "rh2m": [r(v, 1) for v in g["rh2m"]],
            }
    for f in load_fields():
        town = f["town_id"]
        prov = {
            "field": {"dataset": "Illustrative demo layout", "product": "hand-made polygon", "spatial_resolution": "n/a",
                      "retrieved_at": None, "status": "DEMO", "scale": "Shape, crop history and irrigation setting are examples."},
            "smap": {"dataset": "NASA SMAP", "product": "SPL3SMP_E v006", "spatial_resolution": "9 km grid cell",
                     "retrieved_at": None, "status": "UNAVAILABLE", "scale": "Not retrieved: needs an Earthdata login."},
            "imerg": {"dataset": "NASA GPM IMERG", "product": "GPM_3IMERGDL V07 (Late run)", "spatial_resolution": "0.1 degree grid cell",
                      "retrieved_at": None, "status": "UNAVAILABLE", "scale": "Not retrieved: needs an Earthdata login."},
        }
        values = {"smap_soil_moisture": obs(None, "m3/m3", "soil_moisture", None, "smap"),
                  "imerg_rain_30d": obs(None, "mm", "precipitation", None, "imerg")}
        ref = f"Nearest reference: {f['town_name']}, {f['town_distance_km']} km. Grid-cell value, not a field measurement."

        cell = recent[recent["town"] == town] if recent is not None else None
        if cell is not None and len(cell.dropna(subset=["T2M"])):
            valid = cell.dropna(subset=["T2M"])
            last = valid.iloc[-1]
            day = str(last["date"].date())
            prov["power_recent"] = {"dataset": "NASA POWER", "product": f"Daily API {recent_meta[town]['api_version']}, community AG (MERRA-2 / GEOS, modelled)",
                                    "spatial_resolution": POWER_RES, "retrieved_at": recent_meta[town]["retrieved_at"], "status": "CACHED", "scale": ref}
            values.update({
                "t2m": obs(last["T2M"], "C", "T2M", day, "power_recent", 1),
                "t2m_max": obs(last["T2M_MAX"], "C", "T2M_MAX", day, "power_recent", 1),
                "t2m_min": obs(last["T2M_MIN"], "C", "T2M_MIN", day, "power_recent", 1),
                "rh2m": obs(last["RH2M"], "%", "RH2M", day, "power_recent", 0),
                "rain_7d": obs(last["rain_7d"], "mm", "PRECTOTCORR", f"7 days to {day}", "power_recent", 1),
                "rain_30d": obs(last["rain_30d"], "mm", "PRECTOTCORR", f"30 days to {day}", "power_recent", 1),
            })
            wet = cell.dropna(subset=["GWETROOT"])
            if len(wet):
                w = wet.iloc[-1]
                values["gwetroot"] = obs(w["GWETROOT"], "fraction 0-1", "GWETROOT", str(w["date"].date()), "power_recent")
            if town in climatology:
                c = clim[clim["town"] == town].set_index("doy")
                days = [date(2000, d.month, d.day).timetuple().tm_yday for d in pd.date_range(end=last["date"], periods=30)]
                values["rain_30d_normal"] = obs(c.loc[days, "rain_mm"].sum(), "mm", "PRECTOTCORR",
                                                f"same 30 calendar days, mean of {len(clim_meta[town]['rain_years_used'])} years in {min(clim_meta[town]['rain_years_used'])}-{max(clim_meta[town]['rain_years_used'])}", "power_clim", 1)
        if town in climatology:
            y = [min(clim_meta[town]["rain_years_used"]), max(clim_meta[town]["rain_years_used"])]
            prov["power_clim"] = {"dataset": "NASA POWER", "product": f"Daily API {clim_meta[town]['api_version']}, day-of-year means computed by this project",
                                  "spatial_resolution": POWER_RES, "retrieved_at": clim_meta[town]["retrieved_at"], "status": "CACHED",
                                  "scale": ref + " Historical average, not a forecast. Modelled rainfall: totals here are well below what is usually reported for the Delta, so treat them as indicative."}
            c = clim[clim["town"] == town]
            dry = c[(c["doy"] >= 306) | (c["doy"] <= 121)]["rain_mm"].sum()   # 1 Nov - 30 Apr
            wetsum = c[(c["doy"] > 121) & (c["doy"] < 306)]["rain_mm"].sum()  # 1 May - 31 Oct
            values["dry_season_rain_normal"] = obs(dry, "mm", "PRECTOTCORR", f"1 Nov - 30 Apr, mean of {y[0]}-{y[1]}", "power_clim", 0)
            values["monsoon_rain_normal"] = obs(wetsum, "mm", "PRECTOTCORR", f"1 May - 31 Oct, mean of {y[0]}-{y[1]}", "power_clim", 0)

        if f["id"] in soil:
            s = soil[f["id"]]
            prov["soilgrids"] = {"dataset": "ISRIC SoilGrids (not NASA)", "product": "v2.0, 0-5 cm mean", "spatial_resolution": "250 m grid cell",
                                 "retrieved_at": s["retrieved_at"], "status": "CACHED", "scale": "Predicted soil map value at the field centre, not a soil test."}
            v = s["values"]
            values.update({"soil_ph": obs(v.get("ph"), "pH", "phh2o", "static map", "soilgrids", 1),
                           "clay_pct": obs(v.get("clay_pct"), "%", "clay", "static map", "soilgrids", 1),
                           "silt_pct": obs(v.get("silt_pct"), "%", "silt", "static map", "soilgrids", 1),
                           "sand_pct": obs(v.get("sand_pct"), "%", "sand", "static map", "soilgrids", 1)})
        series = ndvi.get(f["id"])
        if series:
            prov["modis"] = {"dataset": "NASA MODIS Terra", "product": "MOD13Q1 v061 (via ORNL DAAC subset service)", "spatial_resolution": "250 m pixel",
                             "retrieved_at": ndvi_retrieved, "status": "CACHED", "scale": "One 250 m pixel at the field centre; it can include neighbouring land."}
            values["ndvi"] = obs(series[-1]["ndvi"], "index -1 to 1", "250m_16_days_NDVI", f"16-day composite from {series[-1]['date']}", "modis", 3)
        fields[f["id"]] = {**f, "values": values, "provenance": prov, "ndvi_series": (series or [])[-24:]}
    return {"generated_at": utc_now(), "fields": fields, "climatology": climatology}


def source_catalogue(report):
    def latest(prefix):
        times = [v.get("retrieved_at") for k, v in report["sources"].items() if k.startswith(prefix) and v.get("retrieved_at")]
        return max(times) if times else None

    cat = [
        {"id": "power_recent", "name": "NASA POWER daily (recent)", "nasa": True, "product": "POWER Daily API, community AG", "version": "v2 API; MERRA-2 / GEOS",
         "variables": "T2M, T2M_MAX, T2M_MIN, PRECTOTCORR, RH2M, WS2M, ALLSKY_SFC_SW_DWN, GWETTOP, GWETROOT", "spatial_resolution": POWER_RES,
         "period": "last 400 days", "url": "https://power.larc.nasa.gov/api/temporal/daily/point", "files": "data/raw/power/recent_<town>.json",
         "licence": "NASA open data; cite the NASA POWER project", "retrieved_at": latest("power_recent"), "used_for": "current weather and soil wetness per reference town"},
        {"id": "power_history", "name": "NASA POWER daily (history)", "nasa": True, "product": "POWER Daily API, community AG", "version": "v2 API; MERRA-2",
         "variables": "PRECTOTCORR, T2M_MAX, T2M_MIN, RH2M", "spatial_resolution": POWER_RES, "period": "1996-2025",
         "url": "https://power.larc.nasa.gov/api/temporal/daily/point", "files": "data/raw/power/history_<town>.json",
         "licence": "NASA open data; cite the NASA POWER project", "retrieved_at": latest("power_history"), "used_for": "day-of-year climatology for planting-window checks"},
        {"id": "modis", "name": "NASA MODIS Terra vegetation indices", "nasa": True, "product": "MOD13Q1", "version": "061",
         "variables": "250m_16_days_NDVI, pixel_reliability", "spatial_resolution": "250 m, 16-day composite", "period": "last 420 days",
         "url": "https://modis.ornl.gov/rst/api/v1/MOD13Q1", "files": "data/raw/modis_ornl/F-*.json",
         "licence": "NASA open data (LP DAAC / ORNL DAAC)", "retrieved_at": latest("modis"), "used_for": "vegetation index shown in the field profile"},
        {"id": "gibs", "name": "NASA GIBS imagery", "nasa": True, "product": "MODIS_Terra_CorrectedReflectance_TrueColor", "version": "WMTS epsg3857, best",
         "variables": "true-colour imagery", "spatial_resolution": "250 m (tile level 9)", "period": "one fixed date",
         "url": "https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/", "files": "not stored (loaded by the map)", "licence": "NASA open data; acknowledge NASA GIBS",
         "retrieved_at": None, "used_for": "optional satellite layer on the map"},
        {"id": "imerg", "name": "NASA GPM IMERG (Late run)", "nasa": True, "product": "GPM_3IMERGDL", "version": "V07",
         "variables": "precipitation", "spatial_resolution": "0.1 degree, daily", "period": "not retrieved", "url": "https://disc.gsfc.nasa.gov/",
         "files": "none", "licence": "NASA open data", "retrieved_at": None, "used_for": "UNAVAILABLE: needs an Earthdata login"},
        {"id": "smap", "name": "NASA SMAP soil moisture", "nasa": True, "product": "SPL3SMP_E", "version": "006",
         "variables": "soil_moisture", "spatial_resolution": "9 km, daily", "period": "not retrieved", "url": "https://appeears.earthdatacloud.nasa.gov/",
         "files": "none", "licence": "NASA open data", "retrieved_at": None, "used_for": "UNAVAILABLE: needs an Earthdata login"},
        {"id": "soilgrids", "name": "ISRIC SoilGrids", "nasa": False, "product": "SoilGrids", "version": "2.0",
         "variables": "phh2o, soc, sand, silt, clay, cec (0-5 cm mean)", "spatial_resolution": "250 m", "period": "static map",
         "url": "https://rest.isric.org/soilgrids/v2.0/properties/query", "files": "data/raw/soilgrids/F-*.json", "licence": "CC BY 4.0",
         "retrieved_at": latest("soilgrids"), "used_for": "topsoil pH and texture"},
        {"id": "ecocrop", "name": "FAO EcoCrop", "nasa": False, "product": "EcoCrop database", "version": "mirror at github.com/OpenCLIM/ecocrop",
         "variables": "crop cycle, pH, temperature, texture and drainage ranges", "spatial_resolution": "n/a (global crop table)", "period": "n/a",
         "url": "https://github.com/OpenCLIM/ecocrop", "files": "data/reference/ecocrop_ranges.json", "licence": "FAO; see the mirror repository",
         "retrieved_at": (read_json(DATA / "reference" / "ecocrop_ranges.json") or {}).get("extracted_utc"), "used_for": "crop tolerance ranges in the rotation rules"},
        {"id": "osm", "name": "OpenStreetMap tiles", "nasa": False, "product": "Standard tile layer", "version": "live",
         "variables": "base map", "spatial_resolution": "zoom 14", "period": "live", "url": "https://tile.openstreetmap.org/",
         "files": "not stored", "licence": "ODbL, (c) OpenStreetMap contributors", "retrieved_at": None, "used_for": "base map"},
        {"id": "fields", "name": "Demo fields", "nasa": False, "product": "hand-made polygons", "version": "n/a", "variables": "shape, crop history, irrigation",
         "spatial_resolution": "n/a", "period": "n/a", "url": "n/a", "files": "data/fields.geojson, data/reference/towns.json", "licence": "project team",
         "retrieved_at": None, "used_for": "DEMO: illustrative fields, one per reference town"},
    ]
    write_json(DATA / "sources.json", cat)
    lines = ["# Data sources", "", "Generated by `backend/app/data_sources/clean_all.py`. Raw files under `data/raw/` are the untouched",
             "responses, each wrapped with its `retrieved_at` time (UTC).", "",
             "| Source | NASA? | Product / version | Variables | Resolution | Period | URL | Files | Retrieved (UTC) | Licence / notes |",
             "|---|---|---|---|---|---|---|---|---|---|"]
    for c in cat:
        lines.append(f"| {c['name']} | {'yes' if c['nasa'] else 'no'} | {c['product']} / {c['version']} | {c['variables']} | {c['spatial_resolution']} | "
                     f"{c['period']} | {c['url']} | `{c['files']}` | {c['retrieved_at'] or '-'} | {c['licence']}. {c['used_for']} |")
    (DATA / "SOURCES.md").write_text("\n".join(lines) + "\n", encoding="utf-8")
    return cat


def main():
    report = {"generated_at": utc_now(), "sources": {}}
    recent, recent_meta = clean_power_recent(report)
    clim, clim_meta = clean_power_climatology(report)
    soil = clean_soilgrids(report)
    ndvi, ndvi_retrieved = clean_modis(report)
    for name in ("gpm_imerg_late", "smap_spl3smp_e"):
        report["sources"][name] = {"status": "UNAVAILABLE", "rows_in": 0, "rows_out": 0, "dropped": [],
                                   "note": "Not retrieved: needs an Earthdata login.", "retrieved_at": None}
    write_json(SNAPSHOTS / "fields_snapshot.json", build_snapshot(recent, recent_meta, clim, clim_meta, soil, ndvi, ndvi_retrieved))
    write_json(REPORTS / "cleaning_report.json", report)
    source_catalogue(report)
    for k, v in report["sources"].items():
        print(k, v.get("rows_in"), "->", v.get("rows_out"), v.get("date_range"))


if __name__ == "__main__":
    main()
