"""Clean every raw file and write what the app serves.

    raw/  ->  clean/*.parquet + clean/*.json  ->  snapshots/fields_snapshot.json
              reports/cleaning_report.json

Raw files are never edited. The backend reads only clean/ and snapshots/.

    python pipeline/clean_all.py
"""
import calendar
import hashlib
import json
import sys
from pathlib import Path

import pandas as pd

from common import CLEAN, RAW, REPORTS, SNAPSHOTS, cell_key, load_fields, utc_now, write_json
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from backend.app.services.power import normalize_daily, summarize_daily, clean_value

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
        rows, counts = normalize_daily(resp)
        if not rows:
            report["sources"][f"power_daily:{key}"] = {**counts, "status": "INVALID", "rows_out": 0}
            continue
        df = pd.DataFrame(rows).set_index("date")
        df.index = pd.to_datetime(df.index)
        dead = df["T2M"].isna() & df["PRECTOTCORR"].isna()
        df["GDD10"] = ((df["T2M_MAX"] + df["T2M_MIN"]) / 2 - 10).clip(lower=0)
        df["rain_7d"] = df["PRECTOTCORR"].rolling(7, min_periods=7).sum()
        df["rain_30d"] = df["PRECTOTCORR"].rolling(30, min_periods=30).sum()
        df = df.reset_index(names="date")
        df["cell"] = key
        df = df.drop_duplicates(subset=["cell", "date"]).sort_values(["cell", "date"])
        frames.append(df)
        header = resp.get("header", {})
        meta[key] = {
            "retrieved_utc": raw["retrieved_utc"],
            "api_version": header.get("api", {}).get("version"),
            "sources": header.get("sources"),
            "time_standard": header.get("time_standard"),
            "parameters": resp.get("parameters", {}),
            "requested_range": [header.get("start"), header.get("end")],
            "sample_geometry": resp.get("geometry"),
            "request": raw.get("request"),
            "raw_sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
            "transform_version": "power-calendar-v1",
            "summary": summarize_daily(rows),
        }
        report["sources"][f"power_daily:{key}"] = {
            **counts, "rows_out": len(df), "rows_dropped_no_data": 0,
            "calendar_days_without_temperature_or_rain": int(dead.sum()),
            "raw_sha256": meta[key]["raw_sha256"],
            "time_standard": header.get("time_standard"),
            "transform_version": "power-calendar-v1",
            "date_range": [str(df["date"].min().date()), str(df["date"].max().date())],
            "note": "Most recent days can be missing until POWER's near-real-time feed catches up.",
        }
    if not frames:
        return None, meta
    daily = pd.concat(frames, ignore_index=True)
    CLEAN.mkdir(parents=True, exist_ok=True)
    target = CLEAN / "power_daily.parquet"
    temporary = target.with_suffix(".parquet.tmp")
    daily.to_parquet(temporary, engine="pyarrow", compression="snappy", index=False)
    temporary.replace(target)
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
                return clean_value(v, p, header.get("fill_value", -999.0))
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
                "t2m": r(sum(m["t2m"] * calendar.monthrange(2023, m["month"])[1] for m in sel)
                         / sum(calendar.monthrange(2023, m["month"])[1] for m in sel), 1)
                        if len(temps) == len(sel) else None,
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
            "time_standard": header.get("time_standard"),
            "parameters": resp.get("parameters", {}),
            "raw_sha256": hashlib.sha256(path.read_bytes()).hexdigest(),
            "calendar_basis": "non-leap reference year (365 days)",
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
    # AppEEARS normalizes coordinate IDs (lowercase, punctuation stripped), so a
    # submitted 'F-01' comes back as 'f01'. Map returned IDs back to field IDs so
    # the snapshot lookup by field ID finds the series. Unknown IDs pass through
    # unchanged and simply match no field.
    _field_lookup = {"".join(ch for ch in f["id"] if ch.isalnum()).upper(): f["id"]
                     for f in load_fields()}

    def _field_id(raw_id):
        return _field_lookup.get("".join(ch for ch in str(raw_id) if ch.isalnum()).upper(), raw_id)

    folder = RAW / "appeears"
    retrieved = None
    if (folder / "retrieved.json").exists():
        retrieved = json.loads((folder / "retrieved.json").read_text(encoding="utf-8"))["retrieved_utc"]

    modis_in = modis_out = modis_bad_range = modis_bad_quality = 0
    modis_files = 0
    modis_invalid = []
    for path in folder.glob("*MOD13Q1*results.csv"):
        df = pd.read_csv(path)
        rows_in = len(df)
        c_ndvi, c_evi = _find_col(df, "16_days_NDVI"), _find_col(df, "16_days_EVI")
        c_rel = _find_col(df, "pixel_reliability")
        if not c_rel:
            modis_invalid.append({"file": path.name, "rows_in": rows_in})
            continue

        df["date"] = pd.to_datetime(df["Date"])
        # AppEEARS point CSVs are already scaled; anything outside the product's valid
        # NDVI range (-0.2 to 1) is a fill value.
        bad_range = (df[c_ndvi] < -0.2) | (df[c_ndvi] > 1)
        # pixel_reliability: 0 good, 1 marginal, 2 snow/ice, 3 cloud, -1 fill
        bad_quality = ~df[c_rel].isin([0, 1])
        keep = df[~bad_range & ~bad_quality].drop_duplicates(subset=["ID", "date"]).sort_values(["ID", "date"])
        for fid, grp in keep.groupby("ID"):
            ndvi[_field_id(fid)] = [{"date": str(d.date()), "ndvi": round(float(v), 3),
                          "evi": None if c_evi is None or pd.isna(e) else round(float(e), 3),
                          "marginal": bool(q == 1)}
                         for d, v, e, q in zip(grp["date"], grp[c_ndvi],
                                               grp[c_evi] if c_evi else grp[c_ndvi],
                                               grp[c_rel])]
        # Accumulate across files: the report entry is written once after the loop,
        # so staging several AppEEARS CSVs reports cumulative totals instead of
        # only the last file processed.
        modis_in += rows_in
        modis_out += len(keep)
        modis_bad_range += int(bad_range.sum())
        modis_bad_quality += int((bad_quality & ~bad_range).sum())
        modis_files += 1
    if modis_files:
        entry = {
            "rows_in": modis_in, "rows_out": modis_out,
            "dropped_fill_or_out_of_range": modis_bad_range,
            "dropped_cloud_snow_or_fill_quality": modis_bad_quality,
            "retrieved_utc": retrieved,
        }
        if modis_invalid:
            entry["invalid_files"] = modis_invalid
        report["sources"]["modis_mod13q1"] = entry
    elif modis_invalid:
        report["sources"]["modis_mod13q1"] = {
            "status": "INVALID",
            "reason": "Missing pixel_reliability QA column",
            "rows_in": sum(f["rows_in"] for f in modis_invalid),
            "invalid_files": modis_invalid,
            "retrieved_utc": retrieved,
        }

    smap_in = smap_dropped = 0
    smap_files = 0
    for path in folder.glob("*SPL3SMP*results.csv"):
        df = pd.read_csv(path)
        rows_in = len(df)
        df["date"] = pd.to_datetime(df["Date"])
        c_sm = _find_col(df, "soil_moisture")
        c_qf = _find_col(df, "retrieval_qual_flag")
        c_sm_pm = _find_col(df, "soil_moisture_pm")
        c_qf_pm = _find_col(df, "retrieval_qual_flag_pm")

        records = []
        dropped_bad = 0
        for _, row in df.iterrows():
            fid = row["ID"]
            d = row["date"]
            # AM measurement
            if c_sm and pd.notna(row[c_sm]):
                sm_val = float(row[c_sm])
                qf_val = int(row[c_qf]) if c_qf and pd.notna(row[c_qf]) else 0
                if qf_val in (0, 8) and 0 <= sm_val <= 0.6:
                    records.append({"ID": fid, "date": d, "sm": sm_val})
                else:
                    dropped_bad += 1
            # PM measurement
            if c_sm_pm and pd.notna(row[c_sm_pm]):
                sm_val_pm = float(row[c_sm_pm])
                qf_val_pm = int(row[c_qf_pm]) if c_qf_pm and pd.notna(row[c_qf_pm]) else 0
                if qf_val_pm in (0, 8) and 0 <= sm_val_pm <= 0.6:
                    records.append({"ID": fid, "date": d, "sm": sm_val_pm})
                else:
                    dropped_bad += 1

        if records:
            rec_df = pd.DataFrame(records)
            keep = rec_df.groupby(["ID", "date"], as_index=False)["sm"].mean().sort_values(["ID", "date"])
            for fid, grp in keep.groupby("ID"):
                smap[_field_id(fid)] = [{"date": str(d.date()), "sm": round(float(v), 3)} for d, v in zip(grp["date"], grp["sm"])]
        else:
            keep = []

        # Accumulate across files (see MODIS above): field_days_out is counted
        # from the final output so overlapping files cannot double-count a day.
        smap_in += rows_in
        smap_dropped += dropped_bad
        smap_files += 1

    if smap_files:
        report["sources"]["smap_spl3smp_e"] = {
            "rows_in": smap_in,
            "field_days_out": sum(len(v) for v in smap.values()),
            "retrievals_dropped_fill_or_out_of_range": smap_dropped,
            "retrieved_utc": retrieved,
            "note": "9 km cells: district-scale, several fields can share one cell.",
        }

    if ndvi:
        write_json(CLEAN / "ndvi.json", ndvi)
    if smap:
        write_json(CLEAN / "smap.json", smap)
    return ndvi, smap, retrieved


# ------------------------------------------------------------------- snapshot
def _runs(mask):
    """Consecutive True runs in a boolean list: [(start_idx, end_idx), ...]."""
    runs, start = [], None
    for i, v in enumerate(mask):
        if v and start is None:
            start = i
        elif not v and start is not None:
            runs.append((start, i - 1))
            start = None
    if start is not None:
        runs.append((start, len(mask) - 1))
    return runs


def detect_time_context(cell, clim_months, ndvi_series):
    """Past events + present state for one field's POWER cell.

    Past: dry spells (GWETROOT < 0.5 for >= 7 days), wet spells (GWETROOT
    >= 0.9 for >= 7 days), NDVI drops (>= 0.10 between consecutive composites).
    Present: latest valid day values, stress flags, and 30-day rain vs the
    climatological month normal. The present is the main decision input; the
    past is dated evidence. Thresholds 0.5 / 0.7 / 0.9 match the rules
    engine's water-budget thresholds; they are team parameters, not measurements.
    """
    cell = cell.sort_values("date")
    dates = [str(d.date()) for d in cell["date"]]
    gwet = cell["GWETROOT"].tolist()
    events = []
    for s, e in _runs([v == v and v < 0.5 for v in gwet]):
        if e - s + 1 >= 7:
            vals = [v for v in gwet[s:e + 1] if v == v]
            events.append({"type": "dry_spell", "start": dates[s], "end": dates[e],
                           "days": e - s + 1, "min_gwetroot": round(min(vals), 3)})
    for s, e in _runs([v == v and v >= 0.9 for v in gwet]):
        if e - s + 1 >= 7:
            vals = [v for v in gwet[s:e + 1] if v == v]
            events.append({"type": "wet_spell", "start": dates[s], "end": dates[e],
                           "days": e - s + 1, "max_gwetroot": round(max(vals), 3)})
    series = sorted(ndvi_series or [], key=lambda p: p["date"])
    for prev, cur in zip(series, series[1:]):
        drop = round(prev["ndvi"] - cur["ndvi"], 3)
        if drop >= 0.10:
            events.append({"type": "ndvi_drop", "date": cur["date"], "change": -drop,
                           "from": prev["ndvi"], "to": cur["ndvi"]})
    events.sort(key=lambda ev: ev.get("start") or ev.get("date"), reverse=True)
    events = events[:10]

    present = None
    valid = cell.dropna(subset=["T2M"])
    if len(valid):
        last = valid.iloc[-1]
        last30 = valid.tail(30)
        month = int(last["date"].month)
        clim_m = next((m for m in (clim_months or []) if m["month"] == month), None)
        rain_30d = r(last["rain_30d"], 1)
        clim_rain = (clim_m or {}).get("rain_mm")
        gwetroot = r(last["GWETROOT"], 3)
        gwettop = r(last["GWETTOP"], 3)
        trailing_dry = trailing_wet = 0
        for v in reversed(gwet):
            if v == v and v < 0.5:
                trailing_dry += 1
            else:
                break
        for v in reversed(gwet):
            if v == v and v >= 0.9:
                trailing_wet += 1
            else:
                break
        stress = []
        if trailing_dry >= 7:
            stress.append("in_dry_spell")
        elif gwetroot is not None and gwetroot < 0.5:
            stress.append("root_zone_dry")
        if trailing_wet >= 7:
            stress.append("in_wet_spell")
        elif gwettop is not None and gwettop >= 0.9:
            stress.append("surface_waterlogged")
        if gwetroot is not None and gwetroot >= 0.7:
            stress.append("root_zone_wet")
        present = {
            "as_of": str(last["date"].date()),
            "gwetroot": gwetroot, "gwettop": gwettop,
            "rain_7d": r(last["rain_7d"], 1), "rain_30d": rain_30d,
            "rain_30d_vs_climatology_mm": None if (rain_30d is None or clim_rain is None) else round(rain_30d - clim_rain, 1),
            "t2m_30d_mean": r(last30["T2M"].mean(), 1),
            "stress": stress,
        }
    return {"past": events, "present": present}


def build_snapshot(daily, power_meta, clim, soil, ndvi, smap, appeears_retrieved):
    fields = {}
    for f in load_fields():
        lat, lon = f["centroid"]
        key = cell_key(lat, lon)
        rec = {**f, "power_cell": key, "weather": None, "wetness": None, "soil": None,
               "ndvi": None, "smap": None, "time_context": None,
               "climatology": clim.get(key), "provenance": {}}

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

            # Time context: what happened (dated events) + what is happening now
            # (present state, the main decision input). The future projection
            # lives in the analysis service, not the snapshot.
            tc = detect_time_context(cell, (clim.get(key) or {}).get("months", []),
                                     ndvi.get(f["id"]))
            rec["time_context"] = tc
            rec["provenance"]["time_context"] = {
                "source": "NASA POWER daily + MODIS/SMAP when connected",
                "detail": "Detected dry/wet spells and NDVI drops from the cleaned series; thresholds are team parameters",
                "as_of": (tc.get("present") or {}).get("as_of"),
                "status": "CACHED",
            }

            # Reuse the exact live summary; calendar gaps must behave identically offline.
            summary = power_meta.get(key, {}).get("summary")
            if summary:
                rec["weather"] = {**summary["weather"], "clim_month": (rec["weather"] or {}).get("clim_month")}
                rec["wetness"] = summary["wetness"]
                for layer in ("weather", "wetness"):
                    if layer in rec["provenance"]:
                        rec["provenance"][layer].update({name: value for name, value in power_meta[key].items()
                                                        if name not in ("summary", "retrieved_utc", "api_version")})

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
                "source": "MODIS Terra MOD13Q1", "detail": "250 m, 16-day composite, cloud/snow pixels removed",
                "version": "061", "as_of": last["date"], "retrieved_utc": appeears_retrieved, "status": "CACHED",
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
    return {"generated_utc": utc_now(), "transform_version": "power-calendar-v1", "fields": fields}


def main():
    report = {"generated_utc": utc_now(), "sources": {}}
    daily, power_meta = clean_power_daily(report)
    clim = clean_power_climatology(report, daily)
    soil = clean_soilgrids(report)
    ndvi, smap, appeears_retrieved = clean_appeears(report)
    for name, present in (("modis_mod13q1", bool(ndvi)), ("smap_spl3smp_e", bool(smap))):
        if not present:
            report["sources"][name] = {"status": "NOT_CONNECTED", "note": "No raw files in data/raw/appeears."}
    snapshot = build_snapshot(daily, power_meta, clim, soil, ndvi, smap, appeears_retrieved)
    write_json(SNAPSHOTS / "fields_snapshot.json", snapshot)
    write_json(REPORTS / "cleaning_report.json", report)
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
