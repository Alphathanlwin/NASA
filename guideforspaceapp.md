# guideforspaceapp.md — Field Shift: Adapting Farms with NASA Data

**NASA Space Apps Challenge 2026 — Yangon, 14–15 Nov 2026. Challenge 07 (CH-07), Intermediate/Advanced.**
**Venue:** University of Information Technology (UIT), Multi-Purpose Hall. (One older poster says MICT Park — UIT is the better-supported venue; confirm on arrival.)
**Team stack:** React/TypeScript frontend + Python FastAPI backend (your AgroGuard stack). **Companion doc:** `field-shift-design.md` in this same folder — the full 14-section architecture + 1-day build plan. This guide is the master file: everything in one place.

> **How this was built (13 Nov 2026):** the official challenge page was read live (Resources tab, all 26 links captured verbatim), judging criteria + Yangon logistics verified against official mirrors, and every dataset access route verified against its own docs. Anything not verified is flagged UNVERIFIED. There is no "tinyfish" tool in this environment — the same browse was run with the browser + three research agents.

## 0. DO TONIGHT (13 Nov) — before the venue

1. **Earthdata account:** create one free account at https://urs.earthdata.nasa.gov/ and authorize these apps in the profile: GES DISC, LP DAAC Data Pool, NSIDC, AppEEARS. Every dataset except POWER needs it — account setup will eat your first hour tomorrow if you leave it.
2. **Login file:** write `~/.netrc` with `machine urs.earthdata.nasa.gov login <USER> password <PASS>` and `chmod 600 ~/.netrc`.
3. **Install:** `pip install earthaccess pystac-client rasterio xarray netCDF4 pandas dask pyarrow`
4. **Pre-download for your demo farms** (bbox around Yangon, e.g. 95.0–96.5E, 16.0–17.5N) and bundle the cleaned snapshots in the repo — **venue Wi-Fi is the single biggest risk; the demo must not depend on live APIs.** Only NASA POWER stays live (no auth, one curl).
5. **Register + team table:** NASA official registration + Yangon Team Table Reservation Form (already done per the practice rounds — verify your team is on the list).

## 1. The challenge — what the judges actually want

**"Field Shift: Adapting Farms with NASA Data."** Farmers face shifting temperatures, changing rainfall, water shortages, extreme weather and declining soil health. Build a **decision-support tool** using NASA Earth observations + local soil info + crop characteristics + farmer priorities, so farmers can explore rotation strategies that strengthen soil health and adapt to changing conditions.

**The hard requirement (from the challenge text):** the tool must compare **at least 3 rotation strategies, including the farmer's existing rotation**, and for each explain **why it was suggested, the supporting evidence, the benefits, the information gaps, and the risks needing local review.** It is supportive only — it does not replace farmer judgment or local expertise.

**Also score:** analysing temperature, heat stress, rainfall, soil moisture, evaporation, frost risk, extreme precipitation, vegetation stress and long-term water trends; highlighting bare-field periods, vulnerable seasons, and opportunities to interrupt pest cycles, reduce water demand, improve infiltration, or add income.

**Accepted solution shapes** (official briefing): "compare rotations, reveal tradeoffs, understand risk, build an SI model, create an interactive map, or invent something new." Your GIS farm map with click-to-inspect fields is squarely inside the brief.

**Your concept (one line):** a GIS farm twin — click a field on the map, an agent runs to it, scans it with NASA data, and returns seasonal rotation plans + pre-harvest suggestions.

## 2. Resources — the 26 links, and the PDF correction

**Correction: there are NO PDFs on the Resources tab.** The live page (read 13 Nov 2026) lists 26 links — every one a dataset or data portal, grouped as "NASA Data & Resources" (24) and "Partner Data" (2). Do not waste time hunting for PDFs to download. The job is pulling **live data through APIs** — §4 gives the exact commands. (The design doc's §6.3 flagged this as an open gap; it is now closed by the live read.)

### NASA Data & Resources
1. SMAP — https://www.earthdata.nasa.gov/data/platforms/space-based-platforms/smap — soil moisture, freeze-thaw, root-zone moisture
2. GPM — https://gpm.nasa.gov/data — rainfall, IMERG products
3. Landsat — https://earthexplorer.usgs.gov/ — multispectral imagery, NDVI, land change
4. MODIS — https://lpdaac.usgs.gov/products/ — vegetation, land-surface temperature, land cover
5. VIIRS — https://search.earthdata.nasa.gov/search?q=VIIRS — VIIRS imagery/data via Earthdata Search
6. NASA POWER — https://power.larc.nasa.gov/ — solar + meteorological data, temperature, precipitation, evapotranspiration
7. SRTM — https://www.earthdata.nasa.gov/data/instruments/srtm — near-global elevation/topography
8. ECOSTRESS — https://ecostress.jpl.nasa.gov/data — land-surface temperature, evapotranspiration, plant water stress
9. USDA Ag Data Commons — https://www.nal.usda.gov/services/agdatacommons — USDA agricultural datasets
10. Web Soil Survey — https://websoilsurvey.nrcs.usda.gov/app/ — interactive USDA soil maps + properties
11. Cropland Data Layer / CropScape — https://nassgeodata.gmu.edu/CropScape/ — annual U.S. crop-type maps
12. PRISM — https://prism.oregonstate.edu — gridded climate data (temperature, precipitation)
13. SSURGO — https://www.nrcs.usda.gov/resources/data-and-reports/soils — detailed U.S. soil-survey data
14. NAIP — https://naip-usdaonline.hub.arcgis.com/ — high-resolution aerial imagery of U.S. farmland
15. NLCD — https://www.usgs.gov/centers/eros/science/national-land-cover-database — U.S. land-cover data
16. NLDAS / GLDAS — https://www.earthdata.nasa.gov/ — modelled land-surface data (soil moisture, ET, runoff)
17. FAO GAEZ — https://gaez.fao.org — global agro-ecological zones + crop suitability
18. CoCoRaHS — https://www.cocorahs.org/Maps — volunteer rain/snow/hail observations
19. NWIS — https://waterdata.usgs.gov/nwis — USGS streamflow, groundwater, water quality
20. AMS Market News — https://www.ams.usda.gov/market-news — USDA crop prices + market reports
21. USDA NASS QuickStats — https://quickstats.nass.usda.gov/ — U.S. crop production, yield, acreage
22. OpenET — https://openetdata.org/explorer — satellite-based evapotranspiration for irrigation
23. LANDFIRE — https://landfire.gov — vegetation, fuel, fire, topography
24. GEDI — https://www.earthdata.nasa.gov/ — spaceborne lidar, canopy height, biomass

### Partner Data
25. Sentinel-2 — https://dataspace.copernicus.eu/explore-data/data-collections/sentinel-data/sentinel-2 — ESA 10-m multispectral imagery
26. ERA5 — https://cds.climate.copernicus.eu/datasets/reanalysis-era5-single-levels?tab=overview — Copernicus hourly climate reanalysis

**Which of these matter for Myanmar:** POWER, SMAP, MODIS, Landsat, GPM, ECOSTRESS, SRTM, GEDI, FAO GAEZ, Sentinel-2, ERA5. The U.S.-only ones (CDL, SSURGO, NAIP, NLCD, PRISM, NWIS, CoCoRaHS, QuickStats, AMS) do **not** cover Myanmar — do not build on them; cite them only as "not applicable to Myanmar" if a judge asks.

**Data sources named in the challenge description itself:** SMAP, ECOSTRESS, GPM, Landsat, MODIS, NASA POWER, GRACE / GRACE-FO, SRTM, GEDI. (GRACE is named but not linked on the Resources tab.)

## 3. Judging — how you win

**The five official criteria** (each scored 1–5 at every judging level; **no numeric weights are officially published** — do not trust any percentage grid online; one Costa Rica local grid (30/20/20/20/10) is a local-event grid, not the global rubric):
1. **Impact** — how well it addresses a real problem, and the difference it could make
2. **Creativity** — how new, inventive and original the approach is
3. **Validity** — whether it is scientifically and technically sound, and could really be built
4. **Relevance** — how closely it answers the chosen challenge
5. **Presentation** — how clearly and effectively the team presents its idea, solution and results

**Yangon-local emphasis** (from the local framing): feasibility and sustainability on top of the official five — so the demo must **actually work with real data**, not mockups.

**Judging funnel:** Local judges → Global Nominees (~1 in 10) → NASA/SME experts → 45 Global Finalists → executive committee → 10 Global Awards. **NASA data use is required for Global Awards eligibility.**

**Submission window:** opens **Sat 14 Nov 2026, 9:00 AM** Yangon time; closes **Sun 15 Nov 2026, 11:59 PM** Yangon time. Submit on your project page on spaceappschallenge.org.
**Demo:** a **7-slide presentation OR a 30-second video** (one public link — YouTube / Drive / GitHub). 30-sec video structure from the official walkthrough: 0:00 introduce, 0:02 lead-in, 0:05 name the solution, 0:10 idea + NASA data use, 0:20 future impact, 0:30 end.
**Also required in the submission:** high-level summary; final project link (public GitHub/Drive); how it works, tools used, goals; how you used AI and NASA/partner data; full list of external sources, data, tools, open-source materials.
**Rules:** team ≤ 6, all registered for the same local event; no work on the challenge before the event; AI tools permitted **with disclosure**; NASA branding must not be modified; generated media needs watermarks; demo must not show anyone under 18.

**Closest existing analogue (your differentiation risk):** Farmyza (Team Solven, Dhaka) built click-a-field-map → ML rotation recommendation + AI agent for this same challenge. **Your differentiators:** Myanmar-specific crops/soils, live NASA data actually wired in (not sample values), and the pre-harvest suggestion layer they don't have. RotaShift (Bangladesh) warns explicitly that its figures are sample values, not agronomic recommendations — never present sample values as real advice.

## 4. NASA datasets — what to use, how to get it (verified 13 Nov 2026)

| Dataset | What it measures | Resolution | Access (verified) | Auth | Feeds which feature |
|---|---|---|---|---|---|
| **NASA POWER** | Daily temp (T2M, T2M_MAX/MIN), precipitation (PRECTOTCORR), humidity (RH2M), solar (ALLSKY_SFC_SW_DWN), wind (WS2M) — agroclimatology | 0.5° (~55 km); daily/hourly/monthly/climatology; 1981–near-real-time | REST API `https://power.larc.nasa.gov/api/temporal/daily/point` (also `/hourly/point`, `/monthly/point`, `/regional`); plain `requests` in Python | **None — no key, no login** | **Backbone for everything weather-driven:** rotation timing (growing-degree days, rain onset, dry-season window), irrigation scheduling, pre-harvest weather windows, climate baseline per field |
| **SMAP** SPL3SMP_E v006 | Surface soil moisture, top ~5 cm, volumetric water content | 9 km, daily composite; 2015-03-31–present | NSIDC DAAC via CMR `C2938664763-NSIDC_CPRD`; direct HTTPS `https://n5eil01u.ecs.nsidc.org/SMAP/SPL3SMP_E.006/`; AppEEARS; Python `earthaccess` (`short_name="SPL3SMP_E", version="006"`). DOI 10.5067/M20OXIZHY3RJ | Earthdata login | Irrigation trigger (is the field actually dry?), rotation timing, field-health moisture layer |
| **MODIS** MOD13Q1 v061 | NDVI + EVI (crop greenness/vigour), 16-day best pixel | 250 m, 16-day; 2000-02-18–present | LP DAAC via CMR `C1748066515-LPCLOUD`; AppEEARS API `https://appeears.earthdatacloud.nasa.gov/api/`; Python `earthaccess`; S3 `data.lpdaac.earthdatacloud.nasa.gov`. DOI 10.5067/MODIS/MOD13Q1.061 | Earthdata login | Field health (NDVI trend per field), phenology (emergence → peak → senescence → harvest date), pre-harvest vigour check |
| **Landsat 8/9** Collection 2 Level-2 | 11 bands: visible/NIR/SWIR (30 m), thermal (100 m, delivered 30 m); compute NDVI/NDWI per field | 30 m; 16-day per satellite, **8-day combined** | USGS STAC `https://landsatlook.usgs.gov/stac-server`, collection `landsat-c2l2-sr`; Python `pystac-client`; COGs on AWS S3 (`usgs-landsat`, requester-pays) | Search: none. Download: S3 requester-pays — fallback Element84 Earth Search `https://earth-search.aws.element84.com/v1` (no-auth COGs) or Microsoft Planetary Computer | **The GIS farm-map layer:** 30 m field boundaries, per-field NDVI/NDWI, true-colour basemap for the click-a-field view; pre-harvest field-level health |
| **GPM IMERG** V07 | Precipitation rate/accumulation (satellite + gauge-adjusted) | 0.1° (~10 km); half-hourly/daily/monthly; 2000-06-01–present | GES DISC; collections `GPM_3IMERGDF.07` (daily Final), `GPM_3IMERGDL.07` (daily Late), `GPM_3IMERGHH.07` (half-hourly Final); Python `earthaccess` (`short_name="GPM_3IMERGDL"`, `version="07"`) or `pip install imergpy` | Earthdata login (authorize GES DISC) | Irrigation (actual rain per field, not modelled), monsoon onset/withdrawal, pre-harvest (rain in the 10-day harvest window = delay harvest) |
| **ECOSTRESS** ECO_L3T_JET v002 + ECO_L4T_ESI v003 | Actual evapotranspiration (ET, mm/day) and Evaporative Stress Index (ESI = ET/PET); land surface temperature | **70 m**; irregular revisit ~1–7 days (ISS orbit), 52°N–52°S (Myanmar inside) | LP DAAC via CMR; AppEEARS point/area extraction (best route per field); Python `earthaccess` (`short_name="ECO_L4T_ESI", version="003"`). DOIs: 10.5067/ECOSTRESS/ECO_L3T_JET.002 | Earthdata login | **The "agent checks the field" stress layer:** ESI < 1 = plant water-stressed → irrigate now; ET = actual water use → irrigation volume; pre-harvest stress flag |
| **SRTM** SRTMGL1 v003 | Elevation (DEM) → slope, aspect, flow accumulation / flood-prone lowland | 30 m, **static** (flown Feb 2000, void-filled) | LP DAAC Data Pool `https://e4ftl01.cr.usgs.gov/MEASURES/SRTMGL1.003/2000.02.11/` (`.hgt.zip` tiles, e.g. `N16E096.SRTMGL1.hgt.zip` for Yangon); AppEEARS; S3 `data.lpdaac.earthdatacloud.nasa.gov/lp-prod-public/SRTMGL1.003/`. DOI 10.5067/MEaSUREs/SRTM/SRTMGL1.003 | Earthdata login + LP DAAC Data Pool authorized in profile | GIS terrain layer: elevation/slope per field, drainage + waterlogging risk for paddy (low flat = good for rice, bad for drainage) |
| **NASA Harvest / GEOGLAM Crop Monitor** | Monthly expert + EO assessment of rice/wheat/maize/soybean conditions by country/region; El Niño outlooks | Country/region scale; **monthly bulletin** (latest No. 144, Nov 2026, assessed 28 Oct 2026) | **No public machine-readable API — UNVERIFIED as an API.** PDF bulletins at `https://www.cropmonitor.org/s/Global_CropMonitor_202611.pdf` | None (public PDF) | Regional context for advice text: current rice conditions in Asia + Jun 2026 special report (strong El Niño expected to peak Nov 2026–Jan 2027; El Niño years typically cut rice yields ~1.0–1.5% below trend) — cite in pre-harvest suggestions, never as per-field data |
| **FAO GAEZ** | Global agro-ecological zones + crop suitability | Global, per-crop suitability maps | https://gaez.fao.org | None for browsing | Crop suitability check per field (which crops the zone supports) |
| **Sentinel-2** (partner) | 10-m multispectral imagery, NDVI | 10 m; ~5-day revisit | https://dataspace.copernicus.eu/explore-data/data-collections/sentinel-data/sentinel-2 | Copernicus account (free) | Field-scale NDVI complement to Landsat (cloud gaps in monsoon) |

### Retrieval commands — run these first (fastest path, first hour)

**POWER (no auth — start here, it always works):**
```bash
curl -s "https://power.larc.nasa.gov/api/temporal/daily/point?parameters=T2M,T2M_MAX,T2M_MIN,PRECTOTCORR,RH2M,ALLSKY_SFC_SW_DWN,WS2M&community=AG&longitude=96.15&latitude=16.80&start=20250101&end=20251113&format=JSON" -o power_yangon.json
# Rotation climatology: same call with /monthly/point and start=19950101 for a 30-yr baseline. Max 20 params per point request.
```

**SMAP (earthaccess):**
```python
import earthaccess
earthaccess.login()  # reads .netrc
res = earthaccess.search_data(short_name="SPL3SMP_E", version="006",
    temporal=("2026-10-01","2026-11-13"), bounding_box=(92.2, 9.8, 101.2, 28.5))
earthaccess.download(res, "data/smap")
# Variable: Soil_Moisture_Retrieval_Data_AM/PM (m3/m3). One 9-km value per field point.
```

**MODIS NDVI (AppEEARS point task — one request returns a CSV time series per clicked field):**
```bash
curl -s -X POST -u "$ED_USER:$ED_PASS" "https://appeears.earthdatacloud.nasa.gov/api/login"  # returns Bearer token
# Then POST a task JSON to https://appeears.earthdatacloud.nasa.gov/api/task with
# task_type "point", product MOD13Q1.061, layers _250m_16_days_NDVI (+EVI), your lat/lons, dates.
# Field names: verify against the API docs at https://appeears.earthdatacloud.nasa.gov/api/
# (UNVERIFIED exact JSON schema — the /login and /task endpoints and base URL are verified).
# No-code fallback that always works: AppEEARS web UI -> Extract -> Point Sample -> upload CSV of field coordinates -> MOD13Q1 NDVI -> download CSV.
```

**Landsat 8/9 (STAC, no auth for search):**
```bash
pip install pystac-client
stac-client search --url https://landsatlook.usgs.gov/stac-server -c landsat-c2l2-sr \
  --bbox 95.0 16.0 96.5 17.5 --datetime 2026-09-01/2026-11-13
# Download the red (SR_B4) + NIR (SR_B5) COG hrefs from the returned items; NDVI = (B5-B4)/(B5+B4).
# If S3 links 403 (requester-pays bucket), re-run the same search against https://earth-search.aws.element84.com/v1.
```

**GPM IMERG (use Late run for current rain):**
```python
import earthaccess
earthaccess.login()
res = earthaccess.search_data(short_name="GPM_3IMERGDL", version="07",
    temporal=("2026-10-01","2026-11-13"), bounding_box=(92.2, 9.8, 101.2, 28.5))
earthaccess.download(res, "data/imerg")
# Alternative: pip install imergpy -> imergpy.get_precipitation(lat, lon, start_datetime="2026-10-01", run_type="late")
# Variable: precipitation (mm/day). Daily Late file = GPM_3IMERGDL.07.
```

**ECOSTRESS (AppEEARS point task, same pattern as MODIS):** product `ECO_L4T_ESI.003`, layer ESI; or `earthaccess.search_data(short_name="ECO_L4T_ESI", version="003", ...)`. One ESI value per field = the water-stress flag. Expect missing dates (ISS revisit + cloud) — treat as "no observation", never as zero stress.

**SRTM (direct tile download):**
```bash
curl -O -b ~/.urs_cookies -c ~/.urs_cookies -L -n \
  "https://e4ftl01.cr.usgs.gov/MEASURES/SRTMGL1.003/2000.02.11/N16E096.SRTMGL1.hgt.zip"
# Repeat per 1-degree tile covering the demo farms; unzip, then gdal_translate to GeoTIFF
# and derive slope/aspect with gdaldem. Or pull SRTMGL1 via one AppEEARS area task.
```

**Crop Monitor (PDF, 1 minute):**
```bash
curl -sL -o cropmonitor_202611.pdf "https://www.cropmonitor.org/s/Global_CropMonitor_202611.pdf"
# Quote the rice-condition paragraph + El Nino outlook in the app's advice panel, cited as GEOGLAM/NASA Harvest.
```

### First-hour order (14 Nov)
1. **POWER first** (0 auth, 1 curl) → working weather/rotation engine in minutes; the demo backbone if anything else fails.
2. **AppEEARS point task** (MODIS NDVI + ECOSTRESS ESI + SRTM elevation in one request) → the click-a-field agent's data, as CSVs.
3. **SMAP + IMERG via earthaccess** → irrigation numbers.
4. **Landsat STAC** → the 30 m map + per-field NDVI.
5. **Crop Monitor PDF** → regional advice text.
6. **Pre-download tonight (13 Nov)** for the demo bbox and bundle the GeoTIFFs/CSVs in the repo.

### NASA API orchestration — the decision tree (from `nasaapi.md`, uploaded 13 Nov)

The user uploaded a "NASA Data Orchestration Bible" (`workspace/user/files/nasaapi.md`) — a full NASA API reference. The parts that matter for this project, and the parts to ignore:

**Routing decision tree (use this before every API call):**
- Earth surface climate (temp, rain, solar, wind, humidity) → **NASA POWER API**
- Satellite imagery / science data (MODIS, Landsat, SMAP, GPM) → **Earthdata CMR + `earthaccess`** (search → download, or stream into xarray with `earthaccess.open()`)
- Map tiles for the web map → **GIBS WMTS**
- Active fires / field burning → **FIRMS API** (free map key, ~10 req/min) — new hazard-layer source for Myanmar
- Floods, storms, drought, cyclones → **EONET API** (categories include floods, severe storms, drought) — new hazard-layer source; EONET has no key
- Everything else in that file (exoplanets, MAST/JWST, PDS, GeneLab, TechPort, NeoWs, Mars photos, APOD, DONKI) is **irrelevant to farms — do not touch it**.

**POWER constraints (verified in nasaapi.md — these are the numbers the retrieval code must respect):**
- Max params: **15 (hourly), 20 (daily/monthly)** — chunk parameter lists with `chunk_params()`
- Regional bbox max: **4.5° × 4.5°** — tile larger bboxes with `tile_bbox()` (4° sub-boxes)
- Concurrency: **≤ 5 simultaneous, 1–2s sleep between requests** — POWER has no published limit but **will block your IP** if abused
- Native grid: **0.5° × 0.625° (met), 1° × 1° (solar)** — snap coordinates with `snap_to_power_grid()`; requesting at 0.01° makes 2,500× redundant calls
- Fill values: **-999.0 and -99.0** — always filter (see §5.2, updated)
- Climate-quality lag: **2–3 months** after real-time — recent months are provisional, say so
- Rate limits elsewhere: `api.nasa.gov` key = 1,000/hr, `DEMO_KEY` = 30/hr + 50/day; FIRMS ~10 req/min; GIBS unlimited (tile CDN)

**New parameters + sources from nasaapi.md (add to the build):**
- **`ALLSKY_SFC_PAR`** (Photosynthetically Active Radiation, W/m²) — the sunlight crops actually use for photosynthesis; add to the POWER parameter list for the crop-growth reasoning
- **`HLSS30`** (Harmonized Landsat Sentinel-2, 30 m, ~5-day revisit) — harmonized Landsat + Sentinel-2 NDVI; fills Landsat cloud gaps and beats Landsat's 8-day combined revisit. Use for the per-field NDVI layer alongside Landsat
- **FIRMS** (fire) — field-burning risk + dry-season fire alerts for the hazard layer; `GET https://firms.modaps.eosdis.nasa.gov/api/area/{MAP_KEY}/{SOURCE}/{BBOX}/{DAYS}`, sources `MODIS_NRT`, `VIIRS_SNPP_NRT`, `VIIRS_NOAA20_NRT`, `VIIRS_NOAA21_NRT`, days 1–10
- **EONET** (disasters) — `GET https://eonet.gsfc.nasa.gov/api/v3/events` with `category` + `bbox`; flood + severe-storm + drought events for the Myanmar hazard layer and the pre-harvest risk panel

**Call-reduction strategies (this is how the "large data" stays fast):**
- Snap to native grid → deduplicate snapped coordinates (often 10–50× fewer calls)
- Use **regional** endpoints instead of point loops (100–1,000× fewer calls)
- Use **climatology** for normals (365× fewer calls than daily for a year)
- Chunk params ≤20; cache everything by `(source, params, location, dates)` hash; pre-aggregate monthly before injecting into any LLM/agent context (monthly ~12 rows vs daily ~365)
- Estimate total calls before starting: `unique_locations × param_chunks × date_chunks` — if >1,000, batch + cache
- Production pattern (from nasaapi.md §14): `nasa_fetch()` with retry + exponential backoff on 429/5xx + file cache; bulk POWER downloader with a throttled pool of 5 workers, dedup, grid-snap, 1s sleep

**What NOT to use from nasaapi.md:** BigQuery pipelines + AI.FORECAST/DETECT_ANOMALIES (§15–16) — too heavy for a 1-day build; **DuckDB + Parquet (§5, §13 Layer 2) is the right-scale equivalent** (same star-schema thinking, zero cloud setup). The astro APIs (§8–12) are irrelevant to farms.

## 5. LARGE DATA CLEANING — the pipeline (new requirement, 13 Nov)

NASA data is big, messy, and full of traps. The judges will ask how you handled it — this section is your answer, and it is also a real module you build tomorrow morning. **Rule zero: subset FIRST (bbox + time window) before downloading or processing anything. Never pull a global grid.**

### 5.1 Pipeline architecture

```
raw/  (exactly what NASA returned, untouched — never edit raw files)
  -> ingest   (download + checksum + file inventory)
  -> validate (schema, ranges, units, coverage — reject or quarantine bad files)
  -> clean    (fill values, scaling, cloud/quality masks, dedup, sort)
  -> transform (indices: NDVI, GDD, rain totals, ESI flags, slope)
  -> store    (parquet for tables, Cloud-Optimized GeoTIFF for rasters, JSON snapshots for the UI)
  -> serve    (FastAPI reads ONLY the cleaned store — the demo never touches raw data)
```

Directory layout:
```
data/
  raw/            # power/, smap/, modis/, landsat/, imerg/, ecostress/, srtm/
  clean/          # power_daily.parquet, smap_daily.parquet, ndvi_timeseries.parquet,
                  # fields.geojson, elevation.tif, ndvi_latest.tif
  snapshots/      # fields_snapshot.json  (what the frontend loads — precomputed, offline-safe)
  reports/        # cleaning_report.json  (per-source row counts, dropped rows, reasons)
cleaning/
  common.py       # range checks, fill-value handling, bbox clip, parquet write
  power.py  smap.py  modis.py  landsat.py  imerg.py  ecostress.py  srtm.py
  clean_all.py    # orchestrator: runs every cleaner, writes the report
```

### 5.2 Per-dataset cleaning rules (the traps, per source)

| Source | Raw format | Cleaning rules (do these, in this order) |
|---|---|---|
| **POWER** (JSON) | Daily/hourly JSON, one row per day | 1. Replace missing values **-999.0 and -99.0** with NaN (documented POWER missing codes, per nasaapi.md). 2. Parse dates to `YYYY-MM-DD`. 3. Drop rows where T2M is missing AND PRECTOTCORR is missing (dead station-days). 4. Range-check: T2M -10–50 °C, PRECTOTCORR 0–500 mm/day, RH2M 0–100, WS2M 0–40 m/s — out-of-range → NaN + log it. 5. Derive: growing-degree days `GDD = max(0, (T2M_MAX+T2M_MIN)/2 - 10)` (base 10 °C for rice), 7-day and 30-day rain totals. 6. Sort by date, dedup on date. |
| **SMAP** SPL3SMP_E (HDF5) | Gridded HDF5, 9 km | 1. Read the file's own `_FillValue` and scale attributes — never hardcode them. 2. Apply scale/offset, then range-check soil moisture **0–0.6 m³/m³** (values above 0.6 are unphysical → NaN). 3. Mask by the retrieval quality flag (low-quality retrievals → NaN). 4. Extract per field centroid (nearest 9-km cell) — one value per field per day. 5. **Honesty rule:** one 9-km cell covers ~81 km² — label the UI value "district-scale moisture", never "field moisture". |
| **MODIS** MOD13Q1 (HDF) | 16-day composite, 250 m | 1. NDVI stored as int16: **NDVI = DN × 0.0001**; fill value **-3000** → NaN (documented MOD13 scaling). Valid range -2000–10000 DN. 2. Parse the **VI Quality** band per the MOD13 User Guide — drop pixels flagged cloud / low quality. 3. Composite date = the 16-day window start; use the window midpoint for time series. 4. Extract per field polygon (mean of pixels inside, count of valid pixels — if <50% valid, mark the observation "low confidence"). |
| **Landsat 8/9** C2 L2 (COG GeoTIFF) | 30 m, per-band COGs | 1. Surface reflectance = **DN × 0.0000275 − 0.2** (documented C2 scaling). 2. **Cloud mask with QA_PIXEL** — mask cloud, cloud shadow and snow bits (verify the exact bit numbers against the Collection 2 QA_PIXEL documentation when you write the mask; do not guess them). 3. NDVI = (SR_B5 − SR_B4) / (SR_B5 + SR_B4); NDWI = (SR_B3 − SR_B5) / (SR_B3 + SR_B5). 4. Keep only scenes with <20% cloud over the demo bbox. 5. If the USGS S3 link 403s (requester-pays), re-fetch the same scene from Element84 Earth Search. |
| **GPM IMERG** (NetCDF/HDF5) | Half-hourly / daily, 0.1° | 1. Read `_FillValue` from the file. 2. **Use the Late run (`GPM_3IMERGDL.07`) for current rain — Final ended 30 Sep 2025.** 3. Aggregate half-hourly → daily sums (mm/day); range-check 0–500 mm/day. 4. Monsoon onset = first 5-day window with ≥20 mm total after 1 May (state the rule in the UI; it is a rule, not a measurement). |
| **ECOSTRESS** (GeoTIFF) | 70 m, irregular revisit | 1. ESI is a standardized index — **below 0 = stressed relative to normal**; use it as a **flag**, not a measurement. 2. **Missing date = "no observation", never zero stress.** 3. Expect gaps (ISS orbit, cloud) — fall back to POWER-based ET when ESI is missing. 4. Extract per field centroid. |
| **SRTM** (.hgt, int16) | 30 m DEM, static | 1. Void value **-32768** → NaN (v003 is void-filled, so few voids remain). 2. Convert to GeoTIFF, derive slope + aspect with `gdaldem`. 3. Static — clean once, cache forever. |

### 5.3 Large-data handling (what makes this "large data" capable)

- **Chunked processing with xarray + dask:** open rasters lazy (`xr.open_dataset(..., chunks={"time": 1})`), compute only at write time. Never load a full time series into memory.
- **Tabular data → Parquet, not CSV:** columnar, compressed, typed. Anything over ~100k rows goes to Parquet. CSV only for the tiny AppEEARS point extracts.
- **Rasters → Cloud-Optimized GeoTIFF** (tiled, with overviews) so the map can stream tiles instead of loading whole images.
- **Dtype discipline:** float32 (not float64) for rasters; int16 where the product uses it; categorical for quality flags. This halves memory.
- **Dedup + sort:** enforce one row per (field, timestamp) after every clean step; sort by (field, time).
- **Snapshot the demo:** after cleaning, write `snapshots/fields_snapshot.json` — one precomputed record per field with every number the UI needs. The frontend loads this file, not the raw data. This is what makes the demo survive dead venue Wi-Fi.
- **Cleaning report:** `clean_all.py` writes `reports/cleaning_report.json` — per source: rows in, rows out, rows dropped + reason, date range, bbox. The UI reads this for the provenance badges (LIVE / CACHED / DEMO) and the judges can open it.

### 5.4 Validation rules (the checks that run on every clean)

| Variable | Valid range | Out-of-range action |
|---|---|---|
| Temperature (T2M) | -10 to 50 °C | → NaN + log |
| Precipitation (daily) | 0 to 500 mm | → NaN + log |
| Relative humidity | 0 to 100 % | → NaN + log |
| Soil moisture (SMAP) | 0 to 0.6 m³/m³ | → NaN + log |
| NDVI | -1 to 1 | → NaN + log |
| ESI | -3 to 3 (standardized) | → NaN + log |
| Elevation (SRTM) | -100 to 8,000 m | → NaN + log |
| Dates | within the product's record (e.g. SMAP ≥ 2015-03-31) | drop row |

### 5.5 Code pattern (the module you write tomorrow morning)

```python
# cleaning/common.py
import pandas as pd

RANGES = {"T2M": (-10, 50), "PRECTOTCORR": (0, 500), "RH2M": (0, 100),
          "soil_moisture": (0, 0.6), "NDVI": (-1, 1), "ESI": (-3, 3)}

def range_check(df, col, lo, hi, report):
    bad = (df[col] < lo) | (df[col] > hi)
    report["dropped_out_of_range"] += int(bad.sum())
    df.loc[bad, col] = float("nan")
    return df

def dedup_sort(df, keys=("field_id", "date")):
    return df.drop_duplicates(subset=list(keys)).sort_values(list(keys))

def write_parquet(df, path):
    df.to_parquet(path, engine="pyarrow", compression="snappy", index=False)
```

```python
# cleaning/power.py  (the pattern every cleaner follows)
import json, pandas as pd
from common import range_check, dedup_sort, write_parquet

def clean_power(raw_json, out_path, report):
    raw = json.load(open(raw_json))["properties"]["parameter"]
    df = pd.DataFrame(raw)
    df.index = pd.to_datetime(df.index, format="%Y%m%d")
    df = df.replace([-999, -99.0], float("nan"))  # POWER missing codes
    for col, (lo, hi) in [("T2M", (-10, 50)), ("PRECTOTCORR", (0, 500)),
                          ("RH2M", (0, 100)), ("WS2M", (0, 40))]:
        df = range_check(df, col, lo, hi, report)
    df["GDD10"] = ((df["T2M_MAX"] + df["T2M_MIN"]) / 2 - 10).clip(lower=0)
    df["rain_7d"] = df["PRECTOTCORR"].rolling(7).sum()
    df["rain_30d"] = df["PRECTOTCORR"].rolling(30).sum()
    df = df.reset_index(names=["date"])
    df = dedup_sort(df, keys=("date",))
    write_parquet(df, out_path)
    return df
```

```python
# cleaning/clean_all.py  (orchestrator — run once tonight, once at the venue)
import json
from power import clean_power
# ... import the other cleaners
report = {"dropped_out_of_range": 0, "sources": {}}
# clean_power("data/raw/power/power_yangon.json", "data/clean/power_daily.parquet", report)
# ... same pattern per source, then:
json.dump(report, open("data/reports/cleaning_report.json", "w"), indent=2)
print("cleaning done:", report)
```

**What "supports large data cleaning" means for the judges:** you can say, honestly: "We ingest 9 NASA sources, clean them through a validated pipeline (fill-value handling, documented scaling, cloud/quality masking, range checks, dedup), store as Parquet + Cloud-Optimized GeoTIFF, and serve precomputed snapshots — the pipeline handles the full Myanmar bbox, and the demo runs off the cleaned snapshot so it works offline." That sentence scores Validity and Impact at once.

### 5.6 Critical warnings (verified — would waste the day if missed)
- **VIIRS VNP13A1 is dead for new data:** Suomi NPP VIIRS science-product delivery **ceased 2 Nov 2026** (NASA Earthdata notice). Use MODIS MOD13Q1 or successor VJ213A1. Do not build the demo on VNP13A1.
- **IMERG V07 Final ends 30 Sep 2025:** for Oct–Nov 2026 rain use the **Late** (or Early) run, not Final.
- **ECOSTRESS is irregular** (ISS orbit, 1–7 day revisit, cloud gaps): use it as a stress *flag*, with POWER-based ET as fallback — never as the only water layer.
- **SMAP is 9 km:** one value covers ~81 km² — district-scale, not per-field. Say so in the UI.
- **POWER is modelled (MERRA-2), ~55 km:** label it "modelled weather"; IMERG is the observed rain.
- **Earthdata login is the bottleneck:** every dataset except POWER and Landsat-search needs it; create the account tonight.
- **Landsat S3 is requester-pays:** keep the Element84 Earth Search fallback in the retrieval script.

## 6. App architecture (summary — full detail in `field-shift-design.md`)

**Stack:** React/TypeScript + Leaflet frontend, Python FastAPI backend. **Leaflet over MapLibre** for the 1-day build (simpler, fewer failure modes). **Robustness decision:** pre-fetched JSON snapshots for everything except NASA POWER, so the demo survives dead venue Wi-Fi.

**Frontend components (15, P0 first):** map, field layer, animated agent marker, sim clock + event log, field detail panel, gauges (moisture / NDVI / stress), farmer-priority sliders, rotation cards (≥3), pre-harvest card, provenance badges (LIVE / CACHED / DEMO), offline/demo banners.

**Backend endpoints (9, FastAPI):** field list, field detail (cleaned snapshot per field), rotation plan (runs the planner), pre-harvest suggestions, weather (POWER live proxy), NDVI time series, sensor ingest (LoRaWAN pattern reused from AgroGuard — pattern only, no repo access claimed), cleaning report, health check. Full request/response shapes in `field-shift-design.md` §5.

**Data flow:** NASA sources → `cleaning/` (§5) → `data/clean/` (Parquet + COG) → `data/snapshots/fields_snapshot.json` → FastAPI → Leaflet map + panels. The frontend never touches raw data.

## 7. Crop-rotation planning logic (rules-based only — no invented agronomy)

**Myanmar crop table (verified):** monsoon rice May–Jun → Oct–Nov; rice–black gram and rice–green gram are the most common rotations in farmer surveys; pulses 90–120 days, green gram 75–90 days, pigeon pea ~200 days; pulses use ≈20% of paddy water.

**The 8 rules (each rule = one function + one reason string the UI shows):**
1. **Season fit** — crop's sowing window must fit the season (monsoon / dry / pre-monsoon) from POWER climatology.
2. **Legume nitrogen credit** — a pulse after rice earns a qualitative bonus (no fabricated kg-N/ha number — never invent a number).
3. **Paddy–pulse cycle** — rice followed by a pulse, never rice after rice on the same field two seasons running.
4. **Pest break** — a rotation must break the pest cycle of the previous crop (different family).
5. **Water budget** — total water demand of the rotation must fit POWER rain + SMAP moisture + IMERG observed rain.
6. **Soil fit** — crop must suit the field's soil (FAO GAEZ suitability + SRTM slope/drainage).
7. **Farmer-priority sliders** — income vs water-saving vs soil health, set by the farmer, re-ranks the plans live.
8. **Diversity** — at least 2 crop families across the rotation.

**The planner (deterministic, explainable):** scores every candidate rotation 0–100 from the rules, returns the top 3 **plus the farmer's existing rotation**, each with reasons **for** and **against**, evidence (which NASA values drove it), benefits, information gaps, and risks needing local review. **No yield prediction anywhere** — predicting yield from these inputs would be fabrication; the planner ranks strategies, it does not promise tonnes.

**Pre-harvest suggestions (for the current crop):** harvest window from MODIS NDVI senescence + POWER 10-day rain outlook (rain in the window = delay harvest); ESI stress flag; SMAP moisture (field dry enough for machines?); El Niño context from the Crop Monitor bulletin (strong El Niño peaking Nov 2026–Jan 2027 — cite it, don't present it as per-field data).

## 8. The "agent runs to the farm" simulation

Click a field → an agent marker animates along a route to the field (route animation on the map) → sim clock advances → event log narrates each step ("Agent dispatched…", "Reading SMAP moisture…", "NDVI trend: declining…") → a scan pulse rings the field → the field panel opens with gauges → rotation cards reveal staggered, one by one. The agent is a **visualisation of the data pipeline**, not a separate AI — the "running" makes the invisible work (fetch → clean → score) visible to the judge. That is the Creativity score.

## 9. Build order — one day (~10 h, 14 Nov)

| Hour | Build | Cut if short on time (in this order) |
|---|---|---|
| 0–1 | POWER live call + cleaning pipeline (§5) + snapshot writer | — (never cut: this is the demo backbone) |
| 1–3 | FastAPI endpoints + cleaned snapshots for 3–5 demo fields | sensor ingest, GIBS tiles |
| 3–5 | Leaflet map + field layer + click → field panel | MapLibre, OSRM routing |
| 5–7 | Agent animation + event log + rotation cards (≥3 + existing) | ECOSTRESS layer |
| 7–8 | Pre-harvest card + provenance badges + offline banner | pre-harvest card (keep if possible — it is a differentiator) |
| 8–9 | 30-sec video OR 7-slide deck + submission page draft | video (slides are faster to fix) |
| 9–10 | Rehearse the 3-min walkthrough + submit before 23:59 Sun | — |

**Never cut:** map loop, agent run, rotation engine, provenance badges, cleaned snapshot. **Cut first:** ECOSTRESS, OSRM, sensor ingest, MapLibre, GIBS.

**3-minute judge walkthrough (rehearse, don't improvise):** 0:00 the problem (a Myanmar farmer choosing a rotation with shifting rain) → 0:30 click a field, agent runs, scan → 1:00 the field's real NASA numbers (POWER rain, SMAP moisture, NDVI trend) → 1:30 three rotation plans compared, existing rotation included, with reasons for/against → 2:15 pre-harvest suggestions → 2:45 what is real vs demo + what's next. Full script in `field-shift-design.md` §2.2.

## 10. Submission checklist (before Sun 15 Nov, 23:59 Yangon time)

- [ ] Project page on spaceappschallenge.org, summary written
- [ ] Demo: 7 slides **or** 30-sec video (one public link)
- [ ] Public project link (GitHub repo public, or Drive)
- [ ] "How you used AI and NASA data" section written (disclose AI use)
- [ ] Full list of external sources, data, tools, open-source materials
- [ ] NASA data visibly used (required for Global Awards eligibility)
- [ ] No modified NASA branding; generated media watermarked; no one under 18 in the demo
- [ ] `data/reports/cleaning_report.json` in the repo (proves the cleaning pipeline is real)
- [ ] README with the LIVE / CACHED / DEMO honesty table

## 11. Honesty rules (the judges will respect these — breaking them kills Validity)

- **POWER is modelled weather** (MERRA-2, ~55 km) — label it so; IMERG is the observed rain.
- **SMAP is district-scale** (9 km) — never "field moisture".
- **Missing ECOSTRESS date = no observation**, never zero stress.
- **No yield prediction.** The planner ranks strategies; it does not promise tonnes.
- **Demo data is badged DEMO** in the UI and the README. Sample values are never presented as agronomic recommendations.
- **Every number in the UI carries its source** (dataset + product version + retrieval date) via the provenance badge.

## 12. How we stand out — differentiation with deep reasoning

**The competitive landscape (verified, 13 Nov 2026):**
- **Farmyza — Team Solven, Dhaka, Bangladesh** — a 5-person **student hackathon team** (Tahmid Hasan Tasin, Team Leader; AS Ayman, Dev Coordinator; Shahed Rahman, ML & Algorithm Engineer; Khalid Bin Imtiaz Labib, Creative Designer & Videographer; Zunaira Zahin Zara, Agronomy Researcher), built for this year's NASA Space Apps "Field Shift" challenge. **Not a company** — their video calls Farmyza a "SaaS platform", but that is positioning language; there is no evidence of a registered business, funding, or app-store listing. Their demo video was posted **17 Oct 2026**, a month before the event weekend — a pre-event demo/promo. They compete in the **Dhaka** local event, not Yangon, so you do not face them in local judging — the comparison matters at **global** judging, where both projects could land. Their shape: click-a-field map → ML rotation recommendation + plain-language AI agent, POWER API, SMAP L4, Landsat 8/9, ECOSTRESS, GIBS. **UNVERIFIED:** their full feature set beyond the public reel/description — never claim they lack a feature unless it is absent from their public demo; say "not visible in their public demo".
- **RotaShift (Bangladesh haor basin)** — 22 years of NASA rainfall, growing-window shift, rotation survival test. README is explicit: all figures are **sample values, not agronomic recommendations**.
- **AgriTwin (Team DevTech)** — live NASA POWER API calls, SMAP L3/L4 + ECOSTRESS plug-in.

**The 10 differentiators — each maps to a judging criterion and is hard to copy in a day:**

1. **Myanmar-first, not Myanmar-flavoured (Relevance + Impact).** Real Delta + Dry Zone crops (monsoon rice, black gram, green gram, pigeon pea, sesame, groundnut), real sowing windows, real hazards: monsoon flood timing, May cyclone season, Dry Zone drought, delta salt intrusion. Farmyza and RotaShift are Bangladesh haor — different country, different monsoon, different crops. A judge in Yangon can tell the difference in one glance.
2. **Burmese-language farmer interface (Impact).** The end user is a Myanmar farmer; an English-only tool excludes them. Ship Burmese field labels, advice summaries and key buttons — plus local units (acres, baskets, viss) instead of hectares/tonnes. No known project for this challenge ships a Burmese farmer-facing UI.
3. **The data-cleaning pipeline as a Validity moat (Validity).** 9 sources through a validated pipeline (§5: documented scaling, cloud/quality masking, range checks, dedup, `cleaning_report.json` in the repo). Farmyza's public shape is "calls the POWER API" — no cleaning layer visible. A cleaning report is checkable evidence, not a claim.
4. **Pre-harvest engine — a second engine, not a feature (Creativity + Impact).** Harvest window from NDVI senescence + 10-day rain outlook + ESI stress + SMAP dryness + El Niño context. Farmyza's known shape is rotation recommendation + explanation. This extends the product from "what to plant" to "when to harvest" — full-season coverage.
5. **Climate futures (Relevance).** NEX-GDDP-CMIP6 projections (2015–2100) via POWER's high-resolution toggle — "what will the season look like". The challenge is about *adapting to changing conditions*; a future-climate view answers the brief's core word ("adapting") more directly than current-data-only tools. Verify the toggle serves NEX-GDDP at build time.
6. **Space + ground fusion (Validity).** LoRaWAN field sensors (AgroGuard pattern) fused with SMAP satellite moisture. Satellite-only tools cannot validate their moisture numbers; this one can — even one sensor, or a clearly-labelled DEMO sensor feed. Ground truth is the difference between a demo and a system.
7. **Offline-first for Myanmar's reality (Impact + Validity).** Cleaned snapshots; the demo works with dead venue Wi-Fi. Rural Myanmar connectivity is the reality for the end user — a tool that needs live internet fails where farmers are. A live-API-only shape fails offline.
8. **Provenance / honesty system (Validity).** Every number carries source + product version + retrieval date; LIVE / CACHED / DEMO badges; the "what is real vs demo" table. In a field where teams demo sample values, verifiable real data is a differentiator.
9. **The agent as simulation, not chatbot (Creativity).** Farmyza's agent explains; this agent *shows the work happening* (route, sim clock, event log, scan pulse, staggered reveal). And the rotation rules are an auditable rules engine (`.agri` DSL pattern) — an agronomist can read the rules, unlike a black-box ML recommendation. The challenge itself demands "why it was suggested" + evidence; a rules engine answers that natively, while ML needs an explanation layer bolted on.
10. **Farmer priorities as the control surface (Relevance).** The challenge text names "farmer priorities" as an input — most tools ignore it. Here income / soil-health / water-saving sliders re-rank plans live, and income uses **farmer-entered prices** (their own numbers, never invented data) + water cost (pulses ≈20% of paddy water, verified). Plus a field-calendar view for bare-field periods and pest-break windows — explicitly requested by the challenge text and skipped by most teams.

**Why this combination wins (the deep reasoning):** no single item above is unbeatable on its own — any team can add a Burmese label or a pre-harvest card. The moat is the **stack**: Myanmar specificity + cleaning pipeline + provenance + offline-first + sensor fusion + pre-harvest + climate futures. Each layer is cheap alone; together they mean the project is *verifiably real* (every number sourced), *usable where farmers are* (offline, Burmese, local units), and *complete across the season* (plant + harvest + future). A team copying the shape in a day can copy one layer, not all seven — and the judges can check every layer in the repo (cleaning report, snapshots, provenance badges) in under a minute.

**Judge Q&A prep (rehearse these answers):**
- *"Isn't this just Farmyza for Myanmar?"* → Same challenge, different product: Myanmar crops/soils/hazards, Burmese UI, pre-harvest engine, cleaning pipeline + provenance, offline-first, sensor fusion. Farmyza is a rotation recommender; this is a full-season farm twin.
- *"SMAP is 9 km — that's not field-scale. Is your field data fake?"* → Honest labelling: SMAP is district-scale and the UI says so; field-scale comes from Landsat 30 m + ECOSTRESS 70 m. Turning the weakness into a Validity win.
- *"How do you know the rotation advice is right?"* → Rules-based, each rule cites its source (farmer surveys for rice–pulse rotations, FAO GAEZ suitability, NASA data for timing); every recommendation shows reasons for/against + gaps + risks; and the tool supports, never replaces, farmer judgment — the challenge's own words.
- *"Why not ML like Farmyza?"* → ML needs Myanmar training data we don't have in a day; rules are explainable and auditable. ML without Myanmar training data would be guessing.
- *"What if there's no internet?"* → Cleaned snapshots; POWER is the only live call and degrades to cached climatology.
- *"What about El Niño?"* → Crop Monitor No. 144 + Jun 2026 special report: strong El Niño peaking Nov 2026–Jan 2027, cited in the pre-harvest panel.

**What NOT to claim (honesty guardrails for the pitch):**
- Never claim field-scale soil moisture from SMAP; never claim yield predictions.
- Never claim Farmyza lacks a feature you have not verified — say "not visible in their public demo".
- Never present the Costa Rica 30/20/20/20/10 grid as the global rubric (it is a local grid).
- Never claim PDFs from the resources tab (there are none).

## 13. The stack — best stack for differentiation (deep reasoning)

**Core principle: keep the foundation, add differentiation layers.** The foundation stays React + TypeScript (Vite) + Python FastAPI — the team's existing stack (AgroGuard, Petey Plant). A hackathon is won on execution speed, and a stack change the night before costs hours: every hour learning a new framework is an hour not spent on the differentiators. Farmyza's stack is presumably a similar web stack — the stack itself is not the moat; **what the stack enables is**. So the "best stack" is the familiar foundation **plus 6 layers no other team in this challenge is shipping**. Each layer maps to a moat from §12 and to a judging criterion.

### 13.1 The 6 differentiation layers

**Layer 1 — Local-first PWA (the biggest stack differentiator).**
- *What:* `vite-plugin-pwa` + service worker (Workbox); app shell + demo-bbox map tiles + snapshots cached at install; IndexedDB (via `idb-keyval` or Dexie) for field data + farmer priorities; fully offline after first load; installable on Android ("Add to Home Screen").
- *Why it differentiates:* Farmyza is a SaaS platform (needs internet); RotaShift is a repo/demo. A PWA that installs on a farmer's cheap Android phone and works in a field with no signal is a **product, not a demo**. Judges in Yangon understand Myanmar's connectivity. Scores Impact + Validity.
- *Why feasible in a day:* one plugin + a manifest + precache config; the snapshots already exist (§5); the demo-bbox tiles are a few MB. Risk: service-worker caching bugs — mitigate by testing the offline path explicitly (airplane mode, reload, click a field).
- *Trade-off vs a native app:* native (Kotlin/Swift) would be better on a phone but is impossible in a day; PWA is the 80% answer in 30 minutes.

**Layer 2 — DuckDB + Parquet data engine (the "large data" story made executable).**
- *What:* DuckDB (in-process analytical database) querying the Parquet files from §5 directly — `SELECT ... FROM 'data/clean/power_daily.parquet'`; FastAPI uses DuckDB for aggregations (rain totals, GDD sums, NDVI trends) instead of loading whole frames into pandas.
- *Why it differentiates:* it is the honest answer to "how do you handle large NASA data" — SQL over NASA data, no database server, millisecond aggregations over millions of rows. Judges who know data recognise DuckDB + Parquet as the modern stack. Scores Validity.
- *Why not pandas-only:* pandas loads whole frames into memory; DuckDB is lazy/columnar and handles the full Myanmar bbox without memory blowups. *Why not Postgres/PostGIS:* a server is another failure mode at a venue; DuckDB is a file.
- *Your edge:* you already know embedded SQL — SQLite (WAL + FTS5) from your own stack. DuckDB is the same mental model (embedded, SQL, zero servers). **Split the job:** DuckDB for *analytics* (querying NASA Parquet), SQLite for *app state* (fields, farmer priorities, sensor readings). Two embedded databases, each doing what it is best at, zero servers.
- *Fallback:* if DuckDB fails, read Parquet with pandas — the snapshots already exist.

**Layer 3 — The `.agri` DSL rules engine (AgroGuard pattern).**
- *What:* rotation rules expressed in the team's own `.agri` DSL format, executed by a small Python rules module — each rule is a named, inspectable function with a reason string; the planner is deterministic; rules are versioned and shown in the UI ("Rule 4: pest break — rice → black gram breaks the stem-borer cycle").
- *Why it differentiates:* explainability is the challenge's explicit demand ("why it was suggested"); an ML model needs an explanation layer bolted on, a rules engine **is** the explanation. An agronomist judge can read the rules. Scores Validity + Creativity (a custom DSL is a genuine technical artifact).
- *Trade-off:* building a full DSL parser in a day is risky — the pragmatic version is a Python rules module with the DSL *syntax* as the documented format, and the parser as a stretch goal. Be honest in the README: "DSL as documented format + Python rules module; full parser is a stretch goal, not a dependency."

**Layer 4 — WebSocket agent stream (the simulation, live).**
- *What:* FastAPI WebSocket endpoint `/ws/agent/{field_id}` — when the user clicks a field, the backend streams agent events as JSON messages (dispatched → arrived → reading SMAP → NDVI trend → scoring → plan ready); the frontend renders them into the event log and drives the marker animation; the sim clock is server-driven.
- *Why it differentiates:* it turns a static panel into a live simulation — the judge watches the work happen. It is also architecturally honest: the agent's "run" **is** the data pipeline executing, streamed live. Scores Creativity + Presentation.
- *Fallback:* if the socket fails, the frontend replays the same events from a precomputed script — the events are deterministic (same data, same log), so live and replayed look identical.

**Layer 5 — Burmese i18n + local units (the user-facing layer).**
- *What:* every user-facing string goes through a `t()` function from the start; a typed Burmese (`my`) dictionary for field labels, advice summaries and buttons; units in acres, baskets, viss. (A tiny hand-rolled dictionary is less risky in a day than full i18next config — use i18next only if it is already familiar.)
- *Why it differentiates:* §12 moat #2. And the stack point matters: i18n is a *layer*, not a rewrite — because strings go through `t()` from the first commit, adding Burmese is a dictionary, not a refactor. If time runs short, ship Burmese for the 20 most-seen strings and English for the rest — partial i18n still differentiates.
- *Translation quality:* the team speaks Burmese natively, so translations are native, not machine-translated — say that in the pitch.

**Layer 6 — Leaflet + pre-cached tiles + GIBS (keep Leaflet, add offline tiles).**
- *What:* Leaflet (P0, known, works) + GIBS WMTS true-colour as the satellite layer + CARTO/OSM fallback + service-worker precache of the demo-bbox tiles (zoom 10–14, a few MB) so the map works offline.
- *Why not MapLibre:* vector tiles + mbtiles would be more powerful (offline vector map, 3D terrain) but MapLibre is a new API to learn the night before; Leaflet + precached raster tiles gets 90% of the offline-map story in 10% of the time. **Deep reasoning: the differentiator is *offline maps*, not the map library — choose the library that delivers the differentiator fastest.**
- *Stretch:* deck.gl for a 3D terrain view of the fields (SRTM elevation) — only if time remains; a Presentation wow-factor, not a core feature.

### 13.2 Full stack diagram

```
┌──────────────────────────────────────────────────────────────────────┐
│  PWA (Vite + vite-plugin-pwa + service worker + IndexedDB)           │
│  React + TypeScript · Leaflet map · agent marker · field panel ·     │
│  rotation cards · pre-harvest card · provenance badges · t() i18n    │
│  Offline: app shell + bbox tiles + snapshots cached at install       │
└───────────────┬──────────────────────────────────────────────────────┘
                │ REST / JSON + WebSocket /ws/agent/{field_id}
┌───────────────┴──────────────────────────────────────────────────────┐
│  FastAPI (Python 3.11+, Pydantic v2)                                 │
│  /fields · /fields/{id} · /plan · /preharvest · /timeseries           │
│  Rules engine (.agri DSL format + Python rules module) — deterministic│
│  DuckDB (analytics over Parquet) · SQLite (app state: fields,         │
│  priorities, sensor readings) · NASA client (POWER live)              │
│  LoRaWAN sensor ingest (AgroGuard pattern, optional override)         │
└───────────────┬──────────────────────────────────────────────────────┘
                │ fetch at build time (tonight, not at the venue)
┌───────────────┴──────────────────────────────────────────────────────┐
│  cleaning/ pipeline (§5) → data/clean/ (Parquet + COG) →             │
│  data/snapshots/fields_snapshot.json (what the UI loads)              │
│  NASA POWER (live, no key) · SMAP · MODIS · Landsat · GPM ·          │
│  ECOSTRESS · SRTM · FAO GAEZ · Sentinel-2 · Crop Monitor PDF          │
└──────────────────────────────────────────────────────────────────────┘
```

### 13.3 Decision table — what was considered and rejected, and why

| Choice | Chosen | Rejected alternative | Why rejected (deep reason) |
|---|---|---|---|
| Frontend framework | React + TypeScript (Vite) | Svelte, Vue, vanilla JS | Team already ships React/TS; a new framework costs hours and the differentiators live in the layers, not the framework |
| Map library | Leaflet + precached tiles | MapLibre + mbtiles | MapLibre is more powerful but a new API the night before; the moat is *offline maps*, Leaflet delivers it fastest |
| Backend | FastAPI + Pydantic v2 | Django, Express, Flask | FastAPI is the team's stack; async + WebSocket + Pydantic validation in one framework; Django is heavier, Express splits the language |
| Analytics DB | DuckDB over Parquet | pandas-only, Postgres/PostGIS | pandas loads whole frames into memory; Postgres is a server (another venue failure mode); DuckDB is a file with SQL |
| App-state DB | SQLite (WAL) | Postgres, Firebase | Zero servers; the team already knows SQLite WAL; Firebase needs internet (kills offline-first) |
| Rotation engine | Rules engine (.agri DSL format) | ML model (like Farmyza) | No Myanmar training data in a day; ML without it is guessing; rules are explainable and the challenge demands "why" + evidence |
| Agent delivery | WebSocket live stream + replay fallback | Static panel, chatbot | A static panel hides the work; a chatbot is Farmyza's shape; the stream *shows* the pipeline executing |
| Language layer | Typed Burmese dictionary via `t()` | Full i18next config, English-only | Hand-rolled dictionary is less risky in a day; English-only excludes the actual user (a Myanmar farmer) |
| App distribution | PWA (installable, offline) | Native app, plain website | Native is impossible in a day; a plain website needs internet; PWA is installable + offline in 30 minutes |
| Map tiles | GIBS WMTS + CARTO/OSM fallback + precache | Live tiles only | Live tiles die with venue Wi-Fi; precached bbox tiles are a few MB and make the map offline-proof |

### 13.4 Workflows (the reasoning behind the order)

**Build workflow (tomorrow, 10 h — dependency order, not preference order):**
1. **Hour 0–1: data pipeline + PWA shell.** `cleaning/` (§5) runs first because *everything* downstream needs cleaned data; PWA config (manifest + precache) goes in the same hour because it is 30 minutes and touches nothing else. Nothing else can start until the snapshot exists.
2. **Hour 1–3: backend.** FastAPI endpoints + DuckDB queries + rules engine + WebSocket. The rules engine is pure functions on the cleaned snapshot — testable without the frontend.
3. **Hour 3–5: map + field panel.** Leaflet + field polygons + click → panel. The map reads the snapshot, so it works the moment the backend does.
4. **Hour 5–7: agent stream + rotation cards.** WebSocket events drive the marker + event log; rotation cards render the planner output. This is the demo's heart — it gets the most hours.
5. **Hour 7–8: i18n pass + pre-harvest card + provenance badges.** i18n last because it is a dictionary pass over strings that already exist; badges are a rendering of the cleaning report.
6. **Hour 8–9: demo (7 slides OR 30-sec video) + submission draft.**
7. **Hour 9–10: rehearse the walkthrough + submit.** Never compress the rehearsal — the pitch is 10% of the score and it is the only part the judges definitely see.

**Data workflow (NASA → clean → store → serve → UI):** §5 pipeline → Parquet + COG → DuckDB queries → precomputed `fields_snapshot.json` → FastAPI → Leaflet + panels. The frontend never touches raw data; the cleaning report travels with the data so provenance is never lost.

**Agent workflow (click → dispatch → scan → score → reveal):** click field → `GET /fields/{id}` + open `/ws/agent/{id}` → events stream in order: `dispatched` → `arrived` → `reading_smap` → `reading_ndvi` → `reading_power` → `scoring` → `plan_ready` → rotation cards reveal staggered, one by one. Each event carries its source + timestamp, so the event log *is* the provenance trail. If the socket drops, the frontend replays the identical precomputed event list.

**Offline workflow (no internet, mid-demo):** service worker serves the app shell + precached tiles + snapshot; POWER call fails → backend serves cached climatology and the badge flips `LIVE` → `CACHED`; WebSocket fails → event replay; the demo continues with zero visible breakage except the badges. **Rehearse this path explicitly** — turn Wi-Fi off and run the whole walkthrough.

**Judge workflow (what the judge sees, in order):** 0:00 the problem, in one sentence, with a real Delta field on screen → 0:30 install the PWA (one tap — shows it is a real product) → 1:00 click a field, watch the agent run live → 1:45 the field's real NASA numbers, every one sourced → 2:15 three rotation plans compared, sliders re-rank live → 2:45 pre-harvest card + the Burmese toggle (flip the UI to Burmese mid-demo — the moment the judges remember) → 3:00 "what is real vs demo" + what's next. The Burmese toggle is the demo's most memorable 5 seconds — place it last so it lands.

**Team workflow (hats, not people — team ≤ 6):** Data hat (pipeline + DuckDB + snapshots) → Backend hat (FastAPI + WebSocket + rules engine) → Frontend hat (map + agent UI + i18n) → Demo hat (slides/video + Q&A prep + submission). The data hat finishes first and then helps the frontend; the demo hat starts at hour 8 and owns nothing else. One rule: **nobody touches the data pipeline after hour 1** — it is frozen so the demo data never changes under the frontend.

### 13.5 Risks + fallbacks per layer

| Layer | What can fail | Fallback (demo survives) |
|---|---|---|
| PWA / service worker | Caching bug, stale shell | Ship the plain website too — same build, no service worker; PWA is additive, never a dependency |
| DuckDB | Query error, missing file | pandas reads the same Parquet files; snapshots already exist |
| WebSocket | Venue Wi-Fi drops the socket | Precomputed event replay (identical log) |
| i18n | Incomplete Burmese strings | English fallback per string; partial Burmese still differentiates |
| Leaflet tiles | GIBS down | CARTO/OSM fallback, then precached tiles |
| Rules engine | A rule's data missing | Rule degrades to "insufficient data" with the gap stated — which is itself a challenge requirement (information gaps) |

## 14. Farmyza head-to-head — looks similar, we do better in every way

**The similarity trap:** to a judge skimming, both projects are "click a field on a map, get a crop rotation plan". That is the danger — if the judge sees the same shape, they score it as the same project. The whole point of this section is to make the difference **unmissable in 30 seconds**. Every row below follows the same pattern: *surface similarity → what Farmyza shows publicly → what we do deeper → the criterion it scores → the evidence in our build.*

**Honesty note (read this before the pitch):** this comparison is against what Farmyza shows in their **public demo** (Facebook reel, 17 Oct 2026) and public description. Their full feature set is UNVERIFIED — they may have features we cannot see. Never say "Farmyza doesn't have X" on stage. Say **"what Farmyza shows publicly is X; what we ship is Y — and here is the evidence"**. That phrasing is both true and unanswerable.

### 14.1 The head-to-head table

| # | Looks similar… | Farmyza (public demo) | We do better — deeper, with evidence | Criterion | Evidence in our build |
|---|---|---|---|---|---|
| 1 | Click a field on a map | Click → ML recommendation appears | Click → **agent runs to the field** (route animation, sim clock, event log narrating each step, scan pulse, staggered plan reveal). The interaction is a field visit, not a form. | Creativity | §8, §13.4 agent workflow, WebSocket event stream |
| 2 | Rotation recommendation | Custom ML model generates "ideal rotations" | **Rules engine**: ≥3 rotations **plus the farmer's existing rotation**, each with reasons **for and against**, evidence, benefits, information gaps, risks needing local review — the challenge's explicit requirement. ML is a black box; rules are auditable by an agronomist. | Validity, Relevance | §7 (8 rules), §12 moat #9, `.agri` DSL format |
| 3 | AI agent | Plain-language Q&A agent ("How can I optimize yield for 2025?") | **Simulation agent that shows the work**: the event stream *is* the pipeline executing (dispatched → reading SMAP → NDVI trend → scoring → plan ready). The explanation is the rules themselves, not a chatbot answer. | Creativity | §8, §13 Layer 4 |
| 4 | NASA data (POWER, SMAP, Landsat, ECOSTRESS) | API calls to POWER, SMAP L4, Landsat 8/9, ECOSTRESS, GIBS | **9 sources through a validated cleaning pipeline** (§5): documented scaling, cloud/quality masking, range checks, dedup, `cleaning_report.json` in the repo. **Plus** GPM IMERG (observed rain, not modelled), SRTM terrain, FAO GAEZ suitability, Sentinel-2 10 m, Crop Monitor El Niño context, NEX-GDDP climate futures. Broader, cleaned, provenanced. | Validity | §5, §4, cleaning report |
| 5 | Water / irrigation advice | Recommends pulses "to cut irrigation needs" | **Actual irrigation numbers**: SMAP moisture trigger + IMERG observed rain + ECOSTRESS ESI stress flag + POWER ET → *when* to irrigate and *how much*; water budget per rotation; pulses ≈20% of paddy water (verified). | Validity, Impact | §7 rules 5, §4 ECOSTRESS/SMAP rows |
| 6 | Pre-harvest | Not visible in public demo | **Full pre-harvest engine**: harvest window from NDVI senescence + 10-day rain outlook + ESI stress + SMAP dryness + El Niño context. A second engine, not a feature — "when to harvest", not just "what to plant". | Creativity, Impact | §7 pre-harvest, §12 moat #4 |
| 7 | Farmer language | English UI + English plain-language agent (per public demo) | **Burmese UI + local units** (acres, baskets, viss) — the actual user is a Myanmar farmer. Flip the UI to Burmese mid-demo; it is the most memorable 5 seconds of the pitch. | Impact | §13 Layer 5, §12 moat #2 |
| 8 | Works as a product | "SaaS platform" — needs internet | **Local-first PWA**: installable on a cheap Android phone, fully offline after first load (app shell + tiles + snapshots cached). Works in a field with no signal — where farmers are. | Impact, Validity | §13 Layer 1, offline workflow §13.4 |
| 9 | Ground truth | Satellite-only (per public demo) | **Space + ground fusion**: LoRaWAN field sensors (AgroGuard pattern) fused with SMAP satellite moisture. Satellite-only tools cannot validate their moisture numbers; this one can — even one sensor, or a clearly-labelled DEMO feed. | Validity | §6, §12 moat #6 |
| 10 | Adapting to change | Current-conditions data (per public demo) | **Climate futures**: NEX-GDDP-CMIP6 projections 2015–2100 via POWER's high-resolution toggle — "what will the season look like". The challenge is about *adapting to changing conditions*; this answers the brief's core word directly. | Relevance | §12 moat #5, §4 |
| 11 | Data honesty | Unknown — no cleaning report or provenance visible | **Provenance system**: every number carries source + product version + retrieval date; LIVE / CACHED / DEMO badges; "what is real vs demo" table; cleaning report in the repo. In a field where teams demo sample values (RotaShift's README says so explicitly), verifiable real data is a differentiator. | Validity | §5.3, §11, design doc §6.4 |
| 12 | Farmer priorities | Model "evaluates the field's micro-history" — no priority input visible | **Farmer priorities as the control surface**: income / soil-health / water-saving sliders re-rank plans live; income from **farmer-entered prices** (their own numbers, never invented). The challenge text names farmer priorities as an input — most tools ignore it. | Relevance | §7 rules 7, §12 moat #10 |
| 13 | Field calendar / pest breaks | Not visible in public demo | **Field-calendar view**: bare-field periods, vulnerable seasons, pest-break windows — explicitly requested by the challenge text and skipped by most teams. | Relevance | §7, §12 moat #10 |
| 14 | Local context | Bangladesh haor, rice + maize, farmer Rahim Mia | **Myanmar Delta + Dry Zone**: monsoon rice, black gram, green gram, pigeon pea, sesame, groundnut; real sowing windows; Myanmar hazards (May cyclone season, Dry Zone drought, delta salt intrusion). A Yangon judge can tell the difference in one glance. | Relevance, Impact | §7 crop table, §12 moat #1 |
| 15 | Submission proof | Video demo | **Video/slides + cleaning report + README honesty table + public repo.** The judges can verify the pipeline in under a minute without running anything. | Validity, Presentation | §10, §5.3 |

### 14.2 The 30-second differentiation demo (make the difference unmissable)

If a judge has 30 seconds, show these five moments in order — each one is something Farmyza's public demo does not show:
1. **(0–5s) Install the PWA** — one tap, "Add to Home Screen". It is a product on a phone, not a website.
2. **(5–10s) Go offline** — turn Wi-Fi off, reload, click a field. Everything still works. Say: "This works in a field with no signal."
3. **(10–18s) Click a field, watch the agent run** — the event log narrates each data check live. Say: "You are watching the pipeline work, not a loading spinner."
4. **(18–25s) Flip to Burmese** — the whole UI switches language mid-demo. Say: "This is for the farmer, not for us."
5. **(25–30s) Point at a provenance badge** — one number, its source, product version, retrieval date. Say: "Every number shows where it came from."

### 14.3 Why the stack wins (the one-paragraph version for the pitch)

"Farmyza is a rotation recommender. This is a full-season farm twin: it plans what to plant, tells you when to harvest, shows you the future climate, speaks the farmer's language, works with no internet, and proves every number it shows. Same challenge, different product — and you can verify all of it in the repo in under a minute."

## 15. UI design — merging FieldShift (farmer) × TERRA (analyst)

**The two directions (from the screenshots, 13 Nov 2026):**
- **Friend's picks — FieldShift (4 desktop screens + mobile):** 01 Overview ("Mingalaba, U Aung Myint", Myaungmya Plot 4, rainfall 142 mm / soil moisture 0.31 m³/m³ / temperature 31.4 °C cards, field satellite image), 04 Crop Rotation Comparison ("Which crop should you plant next?", Rice → Rice vs Rice → Mung Bean, environmental-fit bars, planting window, "Why this option does/doesn't work", "Check locally" risks, recommendation banner), 05 Scenario Simulator ("What if conditions change?", rainfall −20%, planting delay 2 weeks, irrigation on/off, "what changed and why"), 06 Decision Report ("Your Seasonal Decision Report", comparison table, reasoning, next steps), plus Mobile 1–4 (Overview / Comparison / Simulator / Decision Card, bottom nav: Home, Compare, Simulate, Report).
- **Your best picks — TERRA Earth Systems (4 screens):** 01 Mission overview (monitored area 124,860 ha, vegetation index 0.72, soil moisture 24.8%, fields at risk 06, priority fields table, attention queue, data sources table with Connected status), 02 Field intelligence (North 12, IA-012, Story County Iowa, vegetation index 0.54 chart, root-zone soil moisture 16.6%, precipitation 4.2 mm, analyst assessment, observation history with source/NDVI/cloud/quality), 03 NASA data (import a data batch, drop observation files, assign to field, annotation setup with label schema, imported batches table with status), 04 Map intelligence (satellite map, field boundary, NDVI 0.54, selected-field panel, map layer toggles, observation timeline with play + compare dates).

**The deep reasoning — why merging them wins:** neither direction alone is enough. FieldShift alone is a farmer app with no visible data machinery — a judge cannot see *how* the numbers were made, so Validity rests on trust. TERRA alone is an analyst console with no farmer — a judge cannot see *who* it serves, so Impact rests on assertion. **Merged, each direction proves the other:** the farmer flow proves the tool serves a real person; the analyst console proves the numbers are real, cleaned, and traceable. Farmyza has one mode (a SaaS dashboard); this has two, and the analyst mode is where the cleaning pipeline (§5), provenance (§11) and NASA data use become *visible* — which is exactly what scores Validity. The merge is the differentiation, not a compromise.

### 15.1 Two modes, one app

| | Farmer Mode (FieldShift) | Analyst Mode (TERRA) |
|---|---|---|
| **Who** | The Myanmar farmer (and the judge role-playing one) | The analyst / judge checking the system |
| **Language** | Burmese-first, warm greeting ("Mingalaba, U …"), local units (acres, baskets, viss) | English, operations language ("Mission overview", "Field intelligence", "Attention queue") |
| **Skin** | Deep forest-green sidebar, cream/off-white background, white cards, green accent buttons, rounded corners, big cards, mobile-first | Black sidebar, white background, lime-green accent, black stat cards, dense tables, desktop console |
| **Job** | Decide what to plant, what to do next | Verify the data, triage fields, audit the pipeline |
| **Navigation** | Decision workflow: Overview → My Farm → Environmental Intelligence → Crop Comparison → Scenario Simulator → Decision Reports | Operations: Mission overview → Field intelligence → NASA data → Map intelligence |
| **Mode switch** | One toggle in the sidebar ("Farmer / Analyst") — flipping it mid-demo is a pitch moment | Same toggle; the data underneath is identical, only the presentation changes |

**One design token system, two skins.** Same spacing scale, same radii, same type scale (the premium-UI rule: ratios and geometries are mandatory, no arbitrary pixel values — every measurement traces to the scale tokens). The skins differ only in color tokens and density. Exact hex values: sample them from the screenshots at build time; do not invent them here.

### 15.2 Screen map (merged — 10 screens)

**Farmer Mode — the decision workflow (maps to the challenge's demand):**
- **F1 Overview** — greeting + farm profile + the three cards (Rainfall / Soil moisture / Temperature, each with source + "vs 30-yr mean" delta) + selected-field satellite image + "Start Crop Analysis" button. *Maps to:* field panel + gauges (§6, design doc §4).
- **F2 My Farm** — field list, farm profile, field boundaries on the map.
- **F3 Environmental Intelligence** — the field's full NASA picture: POWER weather, SMAP moisture, MODIS/Landsat NDVI trend, ECOSTRESS stress, SRTM terrain. Every value with source + date.
- **F4 Crop Comparison** — "Which crop should you plant next?" Two (or more) options side by side: environmental-fit bars (rainfall supply, water need, temperature, soil/drainage), planting window strip, **"Why this option does/doesn't work"** (reasons for/against), **"Check locally"** risks (the challenge's "information gaps and risks needing local review", shown literally on screen), recommendation banner ("Option to investigate: Rice → Mung Bean"). *This screen IS the challenge requirement, rendered as UI.*
- **F5 Scenario Simulator — NEW feature (from the friend's pick).** "What if conditions change?" Controls: rainfall −20%, planting delay 2 weeks, irrigation on/off, "assume field drains well" toggle. Each option re-scores live with "what changed and why" + "now in drought window" flags. Directly serves the challenge briefing's "understand risk" shape and is **not visible in Farmyza's public demo**. Build it in hour 5–7 (it reuses the rotation engine — same scoring function, different inputs).
- **F6 Decision Report** — "Your Seasonal Decision Report": the chosen rotation, the comparison table, the reasoning, the next-steps checklist, "Ready to decide?" panel. **This screen generates the submission artifact** — export/print the report (it becomes the 7-slide deck content and the 30-sec video storyboard). Mobile: Decision Card with Compare again / Download buttons.
- **Mobile M1–M4** — the same workflow as a PWA on a phone: Overview / Comparison / Simulator / Decision Card, bottom nav (Home, Compare, Simulate, Report), "Good morning, U Thant Zin", recent-observations list. *This is the PWA story (§13 Layer 1) with concrete screens.*

**Analyst Mode — the operations workflow (maps to the data pipeline + provenance):**
- **A1 Mission overview** — portfolio triage: monitored area (hectares), vegetation index, soil moisture, fields at risk (count), priority fields table (field / crop / area / NDVI / moisture / status), attention queue (moisture decline, vegetation stress, cloud cover), data sources table (source / input / use / status: Connected). *Maps to:* the whole system at a glance — the judge's first screen.
- **A2 Field intelligence** — one field, deep: vegetation index chart (last 12 observations vs seasonal baseline), root-zone soil moisture + 7-day delta, precipitation past 7 days vs seasonal average, **analyst assessment** (plain-language verdict), observation history table (acquired UTC / source / NDVI / cloud cover / quality: Validated). Data confidence badge (e.g. "96.4% / high"). *Maps to:* field panel + provenance (§11).
- **A3 NASA data — the cleaning pipeline made visible.** "Import a data batch": source selector (Landsat 8/9, MODIS, SMAP…), drop observation files (GeoTIFF, NetCDF, HDF5), assign to field, import. **Annotation setup**: label schema (crop condition: healthy vegetation / vegetation stress / cloud / no data), annotation type (polygon regions), "annotations require review before export". **Imported batches table**: batch / source / field / acquired / status (Ready to annotate / In review). *This screen is §5 in UI form — judges see data being imported, labelled, reviewed. It is the single most convincing Validity screen in the app.*
- **A4 Map intelligence** — satellite map with field boundary + NDVI overlay, layer toggles (field boundaries / stress annotations / vegetation index / soil moisture), selected-field panel (area, NDVI, soil moisture, latest source), **observation timeline** (play button, compare-dates mode — time-travel through NDVI observations). *Maps to:* the GIS layer (§6) with time travel.

### 15.3 How the merge serves the judging criteria

| Criterion | What the merge proves |
|---|---|
| Impact | Farmer Mode serves a real Myanmar farmer in Burmese, on a phone, offline. Analyst Mode proves the system behind it. |
| Creativity | Two modes, one dataset — the same field seen as a farmer's decision and as an analyst's mission. No other team in this challenge shows both. |
| Validity | Analyst Mode makes the machinery visible: data import + annotation (A3), observation history + confidence (A2), provenance on every number. |
| Relevance | Farmer Mode's F4 screen *is* the challenge requirement (compare ≥3 rotations with reasons, evidence, gaps, risks). |
| Presentation | The demo walks farmer → analyst: decide first, then prove it. The Burmese toggle + offline reload are the two most memorable moments. |

### 15.4 Updated judge walkthrough (3 minutes, dual-mode)

1. **0:00–0:30 — Farmer Mode, F1.** "Mingalaba — this is a real farm near Yangon." Rainfall, moisture, temperature cards, each sourced. Click "Start Crop Analysis".
2. **0:30–1:15 — F4 Crop Comparison.** Rice → Rice vs Rice → Mung Bean, fit bars, "why this option does/doesn't work", "check locally" risks. Move a priority slider — the ranking changes live.
3. **1:15–1:45 — F5 Scenario Simulator.** Rainfall −20%, planting delay 2 weeks, irrigation off. "Watch Rice → Rice fall apart while Mung Bean holds." This is the risk story.
4. **1:45–2:15 — Flip to Analyst Mode, A3 NASA data.** "Here is where those numbers come from." An imported batch, its label schema, its review status. Then A2 Field intelligence: NDVI chart, observation history, confidence badge.
5. **2:15–2:45 — A4 Map intelligence.** Observation timeline, compare dates — NDVI time travel over the field.
6. **2:45–3:00 — Back to Farmer Mode, F6 Decision Report + Burmese toggle.** Flip the UI to Burmese, show the decision report, end line: "Rice, then black gram on residual moisture — the rotation Delta farmers already use, now chosen by satellite data instead of habit."

### 15.5 Build implications (what changes in the plan)

- **New component: `ScenarioSimulator`** (F5) — reuses the rotation engine's scoring function with modified inputs (rainfall × 0.8, planting date +14 days, irrigation flag). Priority P0 — it is a differentiator, not a nice-to-have. Build in hour 5–7 alongside the rotation cards.
- **New component: `DecisionReport`** (F6) — renders the chosen plan + comparison table + reasoning + next steps; export/print to PDF (the submission artifact). Priority P0.
- **New components (Analyst Mode):** `MissionOverview` (portfolio stats + priority table + attention queue), `FieldIntelligence` (NDVI chart + moisture + precipitation + analyst assessment + observation history), `DataImport` (batch import + annotation setup + batches table), `MapIntelligence` (satellite + NDVI overlays + layer toggles + observation timeline). Priority P1 — build after the farmer flow works; A3 (NASA data) first among them, because it is the Validity screen.
- **New component: `ModeSwitcher`** (Farmer / Analyst toggle in the sidebar). Priority P0 — it is the pitch moment.
- **Mobile:** the PWA shell (§13 Layer 1) now has concrete screens (M1–M4 with bottom nav). Build mobile layout as responsive CSS on the same components, not a separate app.
- **Design tokens:** one token file (`tokens.css`): spacing scale (4pt), type scale (1.25 ratio), radii (4/8/12/16/24), two color skins (Farmer: deep forest green + cream; Analyst: black + white + lime accent). Sample exact hex from the screenshots at build time.

## 16. Sources (verified 13 Nov 2026)

- Challenge page, Resources tab (read live): https://www.spaceappschallenge.org/2026/challenges/adapting-farms-with-nasa-data/?tab=resources
- Judging criteria (official five, via Ulaanbaatar local page): https://www.spaceappsulaanbaatar.com/judging
- NASA POWER API docs: https://power.larc.nasa.gov/docs/services/api/ · https://power.larc.nasa.gov/docs/methodology/
- AppEEARS API: https://appeears.earthdatacloud.nasa.gov/api/
- USGS Landsat STAC: https://landsatlook.usgs.gov/stac-server · Element84 Earth Search: https://earth-search.aws.element84.com/v1
- GEOGLAM Crop Monitor No. 144 (Nov 2026): https://www.cropmonitor.org/s/Global_CropMonitor_202611.pdf
- Example implementations (reference only, do not copy): RotaShift https://github.com/XtremeseOISHEE/RotaShift · AgriTwin https://github.com/hamza0312615/AgriTwin · Farmyza (Facebook reel 17 Oct 2026)
- Yangon venue/logistics: IEEE Myanmar agenda https://events.vtools.ieee.org/m/589870
- Companion doc: `field-shift-design.md` (same folder) — full architecture, endpoints, rotation rules, build order, sources.
