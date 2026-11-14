"""Clean every raw file and write what the app serves.

    raw/  ->  clean/*.parquet + clean/*.json  ->  snapshots/fields_snapshot.json
              reports/cleaning_report.json

Raw files are never edited. The backend reads only clean/ and snapshots/.

    python pipeline/clean_all.py
"""
import calendar
import json

import pandas as pd

from common import CLEAN, RAW, REPORTS, SNAPSHOTS, cell_key, load_fields, utc_now, write_json

POWER_FILL = [-999.0, -99.0]
RANGES = {
    "T2M": (-10, 50), "T2M_MAX": (-10, 55), "T2M_MIN": (-15, 45),
    "PRECTOTCORR": (0, 500), "RH2M": (0, 100), "WS2M": (0, 40),
    "ALLSKY_SFC_SW_DWN": (0, 45), "GWETTOP": (0, 1), "GWETROOT": (0, 1),
}
MONTHS = ["JAN", "FEB", "MAR", "APR", "MAY", "JUN", "JUL", "AUG", "SEP", "OCT", "NOV", "DEC"]
# Season windows used by the rotation engine (design doc 8.1).
SEASONS = {"monsoon": [5, 6, 7, 8, 9, 10], "winter": [11, 12, 1, 2], "summer": [3, 4]}


def r(value, digits=2):
    return None if value is None or pd.isna(value) else round(float(value), digits)


# ---------------------------------------------------------------- POWER daily
def clean_power_daily(report):
    frames, meta = [], {}
    for path in sorted((RAW / "power").glob("daily_*.json")):
        key = path.stem.replace("daily_", "")
        raw = json.loads(path.read_text(encoding="utf-8"))
        resp = raw["response"]
        df = pd.DataFrame(resp["properties"]["parameter"])
        rows_in = len(df)
        df.index = pd.to_datetime(df.index, format="%Y%m%d")
        fill = int(df.isin(POWER_FILL).sum().sum())
        df = df.mask(df.isin(POWER_FILL))
        out_of_range = 0
        for col, (lo, hi) in RANGES.items():
            if col in df:
                bad = (df[col] < lo) | (df[col] > hi)
                out_of_range += int(bad.sum())
                df.loc[bad, col] = float("nan")
        dead = df["T2M"].isna() & df["PRECTOTCORR"].isna()
        df = df[~dead]
        df["GDD10"] = ((df["T2M_MAX"] + df["T2M_MIN"]) / 2 - 10).clip(lower=0)
        df["rain_7d"] = df["PRECTOTCORR"].rolling(7, min_periods=5).sum()
        df["rain_30d"] = df["PRECTOTCORR"].rolling(30, min_periods=24).sum()
        df = df.reset_index(names="date")
        df["cell"] = key
        df = df.drop_duplicates(subset=["cell", "date"]).sort_values(["cell", "date"])
        frames.append(df)
        header = resp.get("header", {})
        meta[key] = {
            "retrieved_utc": raw["retrieved_utc"],
            "api_version": header.get("api", {}).get("version"),
            "sources": header.get("sources"),
        }
        report["sources"][f"power_daily:{key}"] = {
            "rows_in": rows_in, "rows_out": len(df),
            "fill_values_nulled": fill, "out_of_range_nulled": out_of_range,
            "rows_dropped_no_data": int(dead.sum()),
            "date_range": [str(df["date"].min().date()), str(df["date"].max().date())],
            "note": "Most recent days can be missing until POWER's near-real-time feed catches up.",
        }
    if not frames:
        return None, meta
    daily = pd.concat(frames, ignore_index=True)
    CLEAN.mkdir(parents=True, exist_ok=True)
    daily.to_parquet(CLEAN / "power_daily.parquet", engine="pyarrow", compression="snappy", index=False)
    return daily, meta


# ---------------------------------------------------------- POWER climatology
def clean_power_climatology(report, daily=None):
    out = {}
    for path in sorted((RAW / "power").glob("climatology_*.json")):
        key = path.stem.replace("climatology_", "")
        raw = json.loads(path.read_text(encoding="utf-8"))
        resp = raw["response"]
        params = resp["properties"]["parameter"]
        header = resp.get("header", {})
        months = []
        for i, name in enumerate(MONTHS, start=1):
            def val(p):
                v = params.get(p, {}).get(name)
                return None if v is None or v in POWER_FILL else float(v)
            rain_rate = val("PRECTOTCORR")  # mm/day, monthly mean
            days = calendar.monthrange(2023, i)[1]
            months.append({
                "month": i,
                "t2m": r(val("T2M")), "t2m_max": r(val("T2M_MAX")), "t2m_min": r(val("T2M_MIN")),
                "rh2m": r(val("RH2M")), "ws2m": r(val("WS2M")), "solar": r(val("ALLSKY_SFC_SW_DWN")),
                "rain_mm": r(None if rain_rate is None else rain_rate * days, 1),
            })
        seasons = {}
        for season, idx in SEASONS.items():
            sel = [m for m in months if m["month"] in idx]
            rains = [m["rain_mm"] for m in sel if m["rain_mm"] is not None]
            temps = [m["t2m"] for m in sel if m["t2m"] is not None]
            seasons[season] = {
                "rain_mm": r(sum(rains), 0) if len(rains) == len(sel) else None,
                "t2m": r(sum(temps) / len(temps), 1) if temps else None,
                # The climatology's T2M_MAX is a period extreme, so the typical daily
                # maximum is taken from the cleaned daily series instead (see below).
                "t2m_max": None,
            }
        if daily is not None:
            cell = daily[daily["cell"] == key]
            for season, idx in SEASONS.items():
                sel_days = cell[cell["date"].dt.month.isin(idx)]["T2M_MAX"].dropna()
                if len(sel_days) >= 30:
                    seasons[season]["t2m_max"] = r(sel_days.mean(), 1)
            seasons["t2m_max_basis"] = (f"mean daily maximum, POWER daily "
                                        f"{cell['date'].min().date()} to {cell['date'].max().date()}")
        out[key] = {
            "months": months, "seasons": seasons,
            "period": header.get("range"),
            "retrieved_utc": raw["retrieved_utc"],
            "api_version": header.get("api", {}).get("version"),
        }
        report["sources"][f"power_climatology:{key}"] = {
            "months": 12, "period": out[key]["period"],
            "months_missing_rain": sum(1 for m in months if m["rain_mm"] is None),
        }
    if out:
        write_json(CLEAN / "power_climatology.json", out)
    return out


# ------------------------------------------------------------------ SoilGrids
def clean_soilgrids(report):
    out = {}
    names = {"phh2o": "ph", "soc": "soc_g_per_kg", "sand": "sand_pct", "silt": "silt_pct",
             "clay": "clay_pct", "cec": "cec_cmol_per_kg"}
    for path in sorted((RAW / "soilgrids").glob("*.json")):
        raw = json.loads(path.read_text(encoding="utf-8"))
        values, missing = {}, []
        for layer in raw["response"]["properties"]["layers"]:
            name = names.get(layer["name"])
            if not name:
                continue
            mean = layer["depths"][0]["values"].get("mean")
            d_factor = layer["unit_measure"]["d_factor"]  # read from the response, never hard-coded
            if mean is None:
                values[name] = None
                missing.append(name)
            else:
                values[name] = round(mean / d_factor, 2)
        if values.get("ph") is not None and not 3 <= values["ph"] <= 10:
            values["ph"] = None
            missing.append("ph (out of range)")
        out[path.stem] = {"values": values, "depth": "0-5 cm", "retrieved_utc": raw["retrieved_utc"]}
        report["sources"][f"soilgrids:{path.stem}"] = {"properties": len(values), "missing": missing}
    if out:
        write_json(CLEAN / "soil.json", out)
    return out


# ------------------------------------------------------------------- AppEEARS
def _find_col(df, *parts):
    for col in df.columns:
        if all(p.lower() in col.lower() for p in parts):
            return col
    return None


def clean_appeears(report):
    """MODIS NDVI and SMAP soil moisture point samples. Returns ({}, {}) when the
    AppEEARS CSVs are not present, and the app shows those layers as not connected."""
    ndvi, smap = {}, {}
    folder = RAW / "appeears"
    retrieved = None
    if (folder / "retrieved.json").exists():
        retrieved = json.loads((folder / "retrieved.json").read_text(encoding="utf-8"))["retrieved_utc"]

    for path in folder.glob("*MOD13Q1*results.csv"):
        df = pd.read_csv(path)
        rows_in = len(df)
        c_ndvi, c_evi = _find_col(df, "16_days_NDVI"), _find_col(df, "16_days_EVI")
        c_rel = _find_col(df, "pixel_reliability")
        df["date"] = pd.to_datetime(df["Date"])
        # AppEEARS point CSVs are already scaled; anything outside the product's valid
        # NDVI range (-0.2 to 1) is a fill value.
        bad_range = (df[c_ndvi] < -0.2) | (df[c_ndvi] > 1)
        # pixel_reliability: 0 good, 1 marginal, 2 snow/ice, 3 cloud, -1 fill
        bad_quality = ~df[c_rel].isin([0, 1]) if c_rel else pd.Series(False, index=df.index)
        keep = df[~bad_range & ~bad_quality].drop_duplicates(subset=["ID", "date"]).sort_values(["ID", "date"])
        for fid, grp in keep.groupby("ID"):
            ndvi[fid] = [{"date": str(d.date()), "ndvi": round(float(v), 3),
                          "evi": None if c_evi is None or pd.isna(e) else round(float(e), 3),
                          "marginal": bool(q == 1) if c_rel else False}
                         for d, v, e, q in zip(grp["date"], grp[c_ndvi],
                                               grp[c_evi] if c_evi else grp[c_ndvi],
                                               grp[c_rel] if c_rel else grp[c_ndvi])]
        report["sources"]["modis_mod13q1"] = {
            "rows_in": rows_in, "rows_out": len(keep),
            "dropped_fill_or_out_of_range": int(bad_range.sum()),
            "dropped_cloud_snow_or_fill_quality": int((bad_quality & ~bad_range).sum()),
            "retrieved_utc": retrieved,
        }

    for path in folder.glob("*SPL3SMP_E*results.csv"):
        df = pd.read_csv(path)
        rows_in = len(df)
        df["date"] = pd.to_datetime(df["Date"])
        cols = [c for c in df.columns if c.lower().endswith(("soil_moisture", "soil_moisture_pm"))]
        long = df.melt(id_vars=["ID", "date"], value_vars=cols, value_name="sm").dropna(subset=["sm"])
        bad = (long["sm"] < 0) | (long["sm"] > 0.6)  # fill (-9999) and unphysical values
        keep = long[~bad].groupby(["ID", "date"], as_index=False)["sm"].mean().sort_values(["ID", "date"])
        for fid, grp in keep.groupby("ID"):
            smap[fid] = [{"date": str(d.date()), "sm": round(float(v), 3)} for d, v in zip(grp["date"], grp["sm"])]
        report["sources"]["smap_spl3smp_e"] = {
            "rows_in": rows_in, "field_days_out": len(keep),
            "retrievals_dropped_fill_or_out_of_range": int(bad.sum()),
            "retrieved_utc": retrieved,
            "note": "9 km cells: district-scale, several fields can share one cell.",
        }

    if ndvi:
        write_json(CLEAN / "ndvi.json", ndvi)
    if smap:
        write_json(CLEAN / "smap.json", smap)
    return ndvi, smap, retrieved


# ------------------------------------------------------------- MODIS via ORNL
def clean_modis_ornl(report):
    """MOD13Q1 values from the ORNL DAAC subset service: raw integers, one 250 m pixel per field."""
    folder = RAW / "modis_ornl"
    if not (folder / "bands.json").exists():
        return {}, None
    bands = json.loads((folder / "bands.json").read_text(encoding="utf-8"))["bands"]

    def meta(name):
        b = bands[name]
        lo, hi = (float(x) for x in b["valid_range"].split(" to "))
        return float(b.get("scale_factor") or 1), float(b["fill_value"]), lo, hi

    ndvi, retrieved = {}, None
    rows_in = dropped_fill = dropped_quality = 0
    for path in sorted(folder.glob("F-*.json")):
        raw = json.loads(path.read_text(encoding="utf-8"))
        retrieved = raw["retrieved_utc"]
        by_date = {}
        for row in raw["rows"]:
            by_date.setdefault(row["calendar_date"], {})[row["band"]] = row["value"]
        series = []
        for day in sorted(by_date):
            rec = by_date[day]
            rows_in += 1
            scale, fill, lo, hi = meta("250m_16_days_NDVI")
            v = rec.get("250m_16_days_NDVI")
            if v is None or v == fill or not lo <= v <= hi:
                dropped_fill += 1
                continue
            # pixel_reliability: 0 good, 1 marginal, 2 snow/ice, 3 cloudy, -1 fill
            rel = rec.get("250m_16_days_pixel_reliability")
            if rel not in (0, 1):
                dropped_quality += 1
                continue
            e_scale, e_fill, e_lo, e_hi = meta("250m_16_days_EVI")
            e = rec.get("250m_16_days_EVI")
            evi = round(e * e_scale, 3) if e is not None and e != e_fill and e_lo <= e <= e_hi else None
            series.append({"date": day, "ndvi": round(v * scale, 3), "evi": evi, "marginal": rel == 1})
        if series:
            ndvi[path.stem] = series
    report["sources"]["modis_mod13q1"] = {
        "via": "NASA ORNL DAAC subset service (no login)", "composites_in": rows_in,
        "composites_out": sum(len(s) for s in ndvi.values()),
        "dropped_fill_or_out_of_range": dropped_fill, "dropped_cloud_snow_or_fill_quality": dropped_quality,
        "retrieved_utc": retrieved,
        "note": "One 250 m pixel at each field centre. Dates are the start of each 16-day composite.",
    }
    return ndvi, retrieved


# ------------------------------------------------------------------- snapshot
def build_snapshot(daily, power_meta, clim, soil, ndvi, smap, appeears_retrieved, ndvi_retrieved=None):
    fields = {}
    for f in load_fields():
        lat, lon = f["centroid"]
        key = cell_key(lat, lon)
        rec = {**f, "power_cell": key, "weather": None, "wetness": None, "soil": None,
               "ndvi": None, "smap": None, "climatology": clim.get(key), "provenance": {}}

        if daily is not None:
            cell = daily[daily["cell"] == key]
            valid = cell.dropna(subset=["T2M"])
            if len(valid):
                last = valid.iloc[-1]
                last30 = valid.tail(30)
                month = int(last["date"].month)
                clim_m = next((m for m in (clim.get(key) or {}).get("months", []) if m["month"] == month), None)
                rec["weather"] = {
                    "as_of": str(last["date"].date()),
                    "t2m": r(last["T2M"], 1), "t2m_max": r(last["T2M_MAX"], 1), "t2m_min": r(last["T2M_MIN"], 1),
                    "rh2m": r(last["RH2M"], 0), "ws2m": r(last["WS2M"], 1), "solar": r(last["ALLSKY_SFC_SW_DWN"], 1),
                    "rain_1d": r(last["PRECTOTCORR"], 1), "rain_7d": r(last["rain_7d"], 1),
                    "rain_30d": r(last["rain_30d"], 1), "t2m_30d_mean": r(last30["T2M"].mean(), 1),
                    "clim_month": clim_m,
                }
                rec["provenance"]["weather"] = {
                    "source": "NASA POWER", "detail": "modelled weather (MERRA-2 / GEOS), 0.5 x 0.625 deg grid cell",
                    "version": power_meta.get(key, {}).get("api_version"),
                    "as_of": rec["weather"]["as_of"], "retrieved_utc": power_meta.get(key, {}).get("retrieved_utc"),
                    "status": "CACHED",
                }
            wet = cell.dropna(subset=["GWETROOT"])
            if len(wet):
                w = wet.iloc[-1]
                week_ago = wet[wet["date"] <= w["date"] - pd.Timedelta(days=7)]
                rec["wetness"] = {
                    "as_of": str(w["date"].date()),
                    "gwettop": r(w["GWETTOP"]), "gwetroot": r(w["GWETROOT"]),
                    "gwetroot_7d_change": r(w["GWETROOT"] - week_ago.iloc[-1]["GWETROOT"]) if len(week_ago) else None,
                }
                rec["provenance"]["wetness"] = {
                    "source": "NASA POWER", "detail": "modelled soil wetness fraction (0 = dry, 1 = saturated), grid-cell scale, not a field measurement",
                    "version": power_meta.get(key, {}).get("api_version"),
                    "as_of": rec["wetness"]["as_of"], "retrieved_utc": power_meta.get(key, {}).get("retrieved_utc"),
                    "status": "CACHED",
                }

        if f["id"] in soil:
            rec["soil"] = soil[f["id"]]["values"]
            rec["provenance"]["soil"] = {
                "source": "ISRIC SoilGrids", "detail": "0-5 cm mean, 250 m grid (not a NASA product)",
                "version": "v2.0", "as_of": None, "retrieved_utc": soil[f["id"]]["retrieved_utc"], "status": "CACHED",
            }

        if ndvi.get(f["id"]):
            series = ndvi[f["id"]]
            last = series[-1]
            prev = series[-3]["ndvi"] if len(series) >= 3 else None
            rec["ndvi"] = {"as_of": last["date"], "value": last["ndvi"], "series": series[-24:],
                           "change_vs_2_composites_ago": None if prev is None else round(last["ndvi"] - prev, 3)}
            rec["provenance"]["ndvi"] = {
                "source": "MODIS Terra MOD13Q1",
                "detail": "250 m pixel at the field centre, 16-day composite, cloud/snow composites removed",
                "version": "061", "as_of": last["date"], "retrieved_utc": ndvi_retrieved, "status": "CACHED",
            }
        else:
            rec["provenance"]["ndvi"] = {"source": "MODIS Terra MOD13Q1", "version": "061", "status": "NOT_CONNECTED",
                                         "detail": "No data pulled yet (needs Earthdata login)."}

        if smap.get(f["id"]):
            series = smap[f["id"]]
            last = series[-1]
            rec["smap"] = {"as_of": last["date"], "value": last["sm"], "series": series[-60:]}
            rec["provenance"]["smap"] = {
                "source": "SMAP SPL3SMP_E", "detail": "district-scale surface soil moisture (9 km cell, top 5 cm)",
                "version": "006", "as_of": last["date"], "retrieved_utc": appeears_retrieved, "status": "CACHED",
            }
        else:
            rec["provenance"]["smap"] = {"source": "SMAP SPL3SMP_E", "version": "006", "status": "NOT_CONNECTED",
                                         "detail": "No data pulled yet (needs Earthdata login)."}

        rec["provenance"]["field"] = {"source": "Illustrative layout", "status": "DEMO",
                                      "detail": "Field shape, name, crop history and irrigation flag are demo values."}
        fields[f["id"]] = rec
    return {"generated_utc": utc_now(), "fields": fields}


def main():
    report = {"generated_utc": utc_now(), "sources": {}}
    daily, power_meta = clean_power_daily(report)
    clim = clean_power_climatology(report, daily)
    soil = clean_soilgrids(report)
    ndvi, smap, appeears_retrieved = clean_appeears(report)
    ndvi_retrieved = appeears_retrieved
    if not ndvi:
        ndvi, ndvi_retrieved = clean_modis_ornl(report)
        if ndvi:
            write_json(CLEAN / "ndvi.json", ndvi)
    for name, present in (("modis_mod13q1", bool(ndvi)), ("smap_spl3smp_e", bool(smap))):
        if not present:
            report["sources"][name] = {"status": "NOT_CONNECTED", "note": "No raw files in data/raw/appeears."}
    snapshot = build_snapshot(daily, power_meta, clim, soil, ndvi, smap, appeears_retrieved, ndvi_retrieved)
    write_json(SNAPSHOTS / "fields_snapshot.json", snapshot)
    write_json(REPORTS / "cleaning_report.json", report)
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
