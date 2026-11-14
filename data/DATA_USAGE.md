# Data usage

What data the app actually holds, where it comes from, how far back it goes and
which columns exist. Provenance per file: `data/SOURCES.md`. Cleaning numbers:
`data/reports/cleaning_report.json`.

## At a glance

| # | Source | What is used | Period | Granularity | Rows / size | Status |
|---|---|---|---|---|---|---|
| 1 | NASA POWER Daily API (MERRA-2/GEOS/SYN1DEG, community AG) | weather + wetness, 9 variables | 2024-11-13 → 2026-11-10 (730 days requested, 728 kept) | daily, 2 grid cells (0.5 × 0.625°) | 1,456 rows → `clean/power_daily.parquet` (71 KB) | cached; refetched live (last 45 days) at runtime |
| 2 | NASA POWER Climatology API | monthly means, 7 variables | Jan 2001 → Dec 2025 (25 years) | monthly × 12 months × 2 cells | 24 month-records → `clean/power_climatology.json` | cached only |
| 3 | ISRIC SoilGrids v2.0 (not NASA) | topsoil, 6 properties | static (modelled) | 0–5 cm mean, 250 m, 1 value per field | 6 fields → `clean/soil.json` | cached only |
| 4 | FAO EcoCrop | crop tolerances, 16 fields × 8 crops | static | global ranges | `reference/ecocrop_ranges.json` | cached only |
| 5 | NASA AppEEARS — MODIS MOD13Q1.061 (NDVI/EVI) | vegetation index | planned: last 400 days | 250 m, 16-day | no files | **NOT CONNECTED** (needs Earthdata login) |
| 6 | NASA AppEEARS — SMAP SPL3SMP_E.006 | soil moisture | planned: last 400 days | 9 km, AM/PM | no files | **NOT CONNECTED** (needs Earthdata login) |
| 7 | `fields.geojson` | field shapes, names, crop history, irrigation | n/a | hand-made blocks at real coordinates | 6 features | **DEMO** |
| 8 | Map tiles (CARTO/OSM, Esri World Imagery) | basemap + satellite | live | tiles | not stored | live only |

Everything under `data/raw/` is the untouched source response wrapped with
`retrieved_utc`; only `pipeline/clean_all.py` writes `data/clean/`,
`data/snapshots/fields_snapshot.json` and the cleaning report.

## 1. NASA POWER daily — `clean/power_daily.parquet`

- Endpoint: `https://power.larc.nasa.gov/api/temporal/daily/point`,
  `community=AG`, API v2.10.3, fill value `-999`.
- Window: `today - 1 day` back 730 days (`pipeline/fetch_power.py:35`).
  Actual range after cleaning: **2024-11-13 → 2026-11-10**; the 3 newest days
  per cell are dropped (near-real-time feed lag).
- 2 grid cells cover all 6 fields: `16.500_95.625`, `16.500_96.250`.

| Column | Unit | Origin |
|---|---|---|
| `date` | date | API day key (LST) |
| `T2M` | °C | POWER |
| `T2M_MAX` | °C | POWER |
| `T2M_MIN` | °C | POWER |
| `PRECTOTCORR` | mm/day | POWER (corrected precipitation) |
| `RH2M` | % | POWER |
| `WS2M` | m/s | POWER |
| `ALLSKY_SFC_SW_DWN` | MJ/m²/day | POWER |
| `GWETTOP` | 0–1 fraction | POWER (surface soil wetness) |
| `GWETROOT` | 0–1 fraction | POWER (root-zone soil wetness) |
| `GDD10` | °C·day | derived: `max((T2M_MAX+T2M_MIN)/2 − 10, 0)` |
| `rain_7d` | mm | derived: 7-day rolling `PRECTOTCORR` (min 5 days) |
| `rain_30d` | mm | derived: 30-day rolling `PRECTOTCORR` (min 24 days) |
| `cell` | string | POWER grid cell key |

Cleaning: `-999/-99` nulled (28 values per cell), physical range checks
(`clean_all.py:18`), rows with no temperature and no rain dropped (3 per cell).
No out-of-range values found in the current files.

## 2. NASA POWER climatology — `clean/power_climatology.json`

- Endpoint: `.../temporal/climatology/point`, API v2.10.1.
- Period in the file: **January 2001 – December 2025** (25-year monthly &
  solar climatology), 12 months per cell.
- Requested variables: `T2M, T2M_MAX, T2M_MIN, PRECTOTCORR, RH2M, WS2M,
  ALLSKY_SFC_SW_DWN`.
- Per month: `month, t2m, t2m_max, t2m_min, rh2m, ws2m, solar, rain_mm`
  (`PRECTOTCORR` is mm/day in the API, converted to mm/month here).
- Also stored per cell: `seasons` (monsoon May–Oct, winter Nov–Feb, summer
  Mar–Apr rain totals and mean temps; `t2m_max` taken from the daily series,
  not the climatology extreme), `period`, `retrieved_utc`, `api_version`.

## 3. ISRIC SoilGrids — `clean/soil.json`

One record per field (F-01…F-06), depth **0–5 cm mean**, 250 m grid:

`ph`, `sand_pct`, `silt_pct`, `clay_pct`, `cec_cmol_per_kg`, `soc_g_per_kg`
plus `depth` and `retrieved_utc`. Raw layers requested: `phh2o, soc, sand,
silt, clay, cec` (`pipeline/fetch_soilgrids.py:13`); scaling factor read from
the response. pH outside 3–10 is nulled. No missing values in the current files.

## 4. FAO EcoCrop — `reference/ecocrop_ranges.json`

8 crops × 16 fields: `temp_opt/abs_min/max_c`, `rain_opt/abs_min/max_mm`,
`ph_opt/abs_min/max`, `cycle_min_days`, `cycle_max_days`, plus
`scientific_name` and `ecoport_code`.
Crops: rice, black_gram, green_gram, chickpea, pigeon_pea, sesame, groundnut,
maize. Global ranges, not Myanmar-specific. The ranking engine holds 10 crops
(`backend/app/engine/crops.py`) — summer rice and fallow have no EcoCrop row.

## 5–6. AppEEARS (planned, not connected)

`pipeline/fetch_appeears.py` would point-sample the 6 field centroids over the
last 400 days:

- MODIS MOD13Q1.061: `_250m_16_days_NDVI`, `_250m_16_days_EVI`,
  `_250m_16_days_pixel_reliability` (quality 0/1 kept, cloud/snow/fill dropped).
- SMAP SPL3SMP_E.006: `soil_moisture` + `soil_moisture_pm` + retrieval quality
  flags; values outside 0–0.6 dropped; AM/PM averaged.

No `data/raw/appeears/` exists, so `ndvi` and `smap` are `null` in the snapshot
and the UI shows `NOT CONNECTED`.

## Snapshot served by the backend — `snapshots/fields_snapshot.json`

6 fields; per field: `id, name, centroid, area_ha, crop_history, irrigated,
status, power_cell, weather, wetness, soil, ndvi, smap, climatology,
provenance`.

- `weather`: latest day (`as_of` 2026-11-10) `t2m, t2m_max, t2m_min, rh2m,
  ws2m, solar, rain_1d, rain_7d, rain_30d, t2m_30d_mean, clim_month`.
- `wetness`: `gwettop, gwetroot, gwetroot_7d_change`.
- `provenance`: source, detail, version, `retrieved_utc`, status per layer
  (`CACHED` / `LIVE` / `NOT_CONNECTED` / `DEMO`).

## Runtime data use

- The only live call is `backend/app/services/power.py`: POWER daily for the
  last **45 days**, 5 s timeout, 10 min cache per cell; failure falls back to
  the snapshot. Disabled with `FIELDSHIFT_OFFLINE=1`.
- The backend reads only `data/clean/` and `data/snapshots/`; raw files are
  never edited or served.

## Rebuilding

```bash
python pipeline/fetch_power.py        # POWER daily (730 d) + climatology
python pipeline/fetch_soilgrids.py    # SoilGrids
python pipeline/clean_all.py          # clean parquet/json + snapshot + report
```
