# Garvesty — GIS Farm Twin for NASA Space Apps Challenge 2026
## Architecture & Interaction Design — Challenge 07: "Field Shift: Adapting Farms with NASA Data"

**Event:** NASA International Space Apps Challenge 2026, Yangon — **14–15 Nov 2026**
**Challenge (official brief):** *"Create a decision-support tool that uses NASA Earth observations along with local soil information, crop characteristics, and farmer priorities to help farmers explore rotation strategies that could strengthen soil health and adapt their farms to changing conditions."* — Categories: Earth Science, Software, Arts & Multimedia.
**Stack:** React + TypeScript frontend (Vite, Leaflet), Python FastAPI backend.
**Document Purpose:** Interface design, interaction patterns, component contracts, and application architecture for Garvesty.

---

## 1. Judging Criteria Alignment

The design directly addresses the five core evaluation criteria established across NASA Space Apps events:

| Criterion | Evaluation Focus | How Garvesty Addresses It |
|---|---|---|
| **Impact** | Solves a real problem for real communities | Focused on Myanmar's Ayeyarwady Delta smallholders facing post-monsoon dry season crop dilemmas; provides practical rice–pulse rotation options that conserve water. |
| **Creativity** | Original approach and user experience | Interactive farm polygon drawing, original 3-role specialist agent choreography with physics-based motion, and what-if scenario exploration. |
| **Validity** | Scientifically and technically sound | Deterministic agronomic rules based on FAO EcoCrop and local extension data, strict data provenance badges (`LIVE`, `CACHED`, `DEMO`), and gated ML evaluation tracks. |
| **Relevance** | Directly answers the challenge brief | Integrates NASA Earth observations (POWER meteorology, GPM precipitation, SMAP moisture, MODIS vegetation) with soil grids and farmer priorities. |
| **Presentation** | Clear, accessible, and structured demonstration | Clear 10-screen architecture (6 Farmer screens, 4 Analyst screens), bilingual English/Burmese UI, and printable decision reports. |

**NASA Data Requirement:** Garvesty uses NASA Earth observations as core inputs. Every environmental metric displays its source, product identifier, grid resolution, and observation date.

---

## 2. Product Concept & Workflow

### 2.1 Core User Journey
1. **Explore & Select:** The user views the Ayeyarwady Delta region on an interactive Leaflet map and selects a verified field or draws a custom polygon boundary.
2. **Specialist Dispatch:** A visual specialist agent (Field Scout, Water Analyst, or Crop Planner) animates smoothly to the field centroid, providing visual feedback while backend data is assembled.
3. **Inspect Evidence:** The field intelligence panel presents NASA POWER weather, seasonal climatology, and soil properties with clear resolution disclosures.
4. **Compare Rotations:** The planner compares alternative post-monsoon crop sequences against the baseline practice with transparent score breakdowns and cited agronomic reasons.
5. **Simulate Scenarios:** The user stress-tests plans against altered conditions (rainfall anomalies, planting delays, drainage limitations).
6. **Export Decision:** A structured, printable seasonal report is generated for offline consultation.

### 2.2 Technical & Agronomic Differentiation

Garvesty's design focuses on scientific transparency and local fit:

1. **Myanmar-Specific Agronomy:** Tailored specifically to the Ayeyarwady Delta (Twante baseline verified; Bogale, Hinthada, and Myaungmya planned). Models authentic local rotations (Monsoon Rice → Black Gram / Green Gram / Summer Rice) and regional risks (dry-season water deficits, coastal tidal salinity, drainage logging).
2. **Bilingual Local Interface:** Full English and Burmese (Myanmar Unicode) support with local agricultural units (Acres / ဧက, Baskets / တင်း, MMK / ကျပ်).
3. **Auditable Rules Engine:** Rather than an opaque black-box recommender, crop suitability is evaluated using deterministic agronomic rules with explicit reasons for and against each rotation, citing physiological thresholds.
4. **Interactive Field Drawing:** Farmers and advisers can draw and edit custom field boundaries on the satellite map, calculate accurate planar acreage, and receive validated recommendations within supported regional bounds.
5. **Gated Machine Learning:** Advanced ML models (soil wetness nowcasting, vegetation anomaly detection, yield feasibility) are evaluated on chronological holdout sets and maintained in an experimental status until validated, preventing unverified predictions from influencing farmer guidance.
6. **Realistic Offline Strategy:** Incorporates pre-cached data snapshots and offline execution flags (`FIELDSHIFT_OFFLINE=1`) to guarantee reliable demonstration during venue connectivity loss, alongside printable offline reports. Live satellite fetches and new arbitrary coordinate queries outside cached bounds require network access.

## 3. System architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  React + TypeScript frontend (Vite)                             │
│  Leaflet map · Field polygons · Animated agent · Field panel ·  │
│  Rotation cards · Pre-harvest card · Provenance badges          │
└───────────────┬─────────────────────────────────────────────────┘
                │ REST / JSON (same origin in dev, one FastAPI)
┌───────────────┴─────────────────────────────────────────────────┐
│  FastAPI backend (Python 3.11+, Pydantic v2)                    │
│  /fields · /fields/{id} · /plan · /preharvest · /timeseries     │
│  Rotation engine (rules-based, pure functions, no ML)           │
│  NASA client (POWER live; SMAP/MODIS via cached JSON)           │
│  data/cache/ — pre-fetched JSON snapshots (offline fallback)    │
└───────────────┬─────────────────────────────────────────────────┘
                │ fetch at build time (before the event if possible)
┌───────────────┴─────────────────────────────────────────────────┐
│  NASA POWER API (live, no key) · NASA GIBS WMTS (map tiles)    │
│  NASA Earthdata / AppEEARS (SMAP, MODIS — needs account)        │
│  ISRIC SoilGrids (soil, non-NASA complement) · FAO EcoCrop      │
│  (LoRaWAN field sensors — AgroGuard pattern, optional override) │
└─────────────────────────────────────────────────────────────────┘
```

**Key architectural decision:** the backend serves **pre-fetched JSON snapshots** for everything except NASA POWER. POWER is the only live call at demo time (free, anonymous, no key, fast). Everything else is cached to `data/cache/` before the event. If the venue wifi dies, the app still demos fully — and the provenance badges say which layer is live vs cached vs demo. This is the single most important robustness choice for a hackathon.

### 3.1 The stack, chosen for differentiation (deep reasoning — full version in `guideforspaceapp.md` §13)

**Core principle: keep the foundation, add differentiation layers.** The foundation stays React + TypeScript (Vite) + Python FastAPI — the team's existing stack. A stack change the night before costs hours, and the differentiators live in the layers, not the framework. The "best stack" is the familiar foundation **plus 6 layers no other team in this challenge is shipping:**

1. **Local-first PWA** (`vite-plugin-pwa` + service worker + IndexedDB) — installable on a farmer's Android phone, fully offline after first load. Farmyza is a SaaS platform (needs internet); a PWA that works in a field with no signal is a product, not a demo. *Fallback:* ship the plain website too — PWA is additive, never a dependency.
2. **DuckDB + Parquet data engine** — DuckDB queries the Parquet files from the cleaning pipeline directly (SQL over NASA data, no server, millisecond aggregations). The honest answer to "how do you handle large NASA data". *Split:* DuckDB for *analytics*, SQLite (WAL — the team's known stack) for *app state*. Two embedded databases, zero servers. *Fallback:* pandas reads the same Parquet files.
3. **`.agri` DSL rules engine** (AgroGuard pattern) — rotation rules as named, inspectable functions with reason strings; deterministic; shown in the UI. An ML model needs an explanation layer bolted on; a rules engine **is** the explanation, and the challenge demands "why it was suggested". Pragmatic form: Python rules module + DSL syntax as the documented format; full parser is a stretch goal.
4. **WebSocket agent stream** (`/ws/agent/{field_id}`) — the backend streams agent events (dispatched → arrived → reading SMAP → NDVI trend → scoring → plan ready); the frontend renders the event log and drives the marker. The agent's "run" **is** the data pipeline executing, streamed live. *Fallback:* precomputed event replay (identical log — same data, same events).
5. **Burmese i18n + local units** — every user-facing string through a `t()` function from the first commit; a typed Burmese dictionary for labels, advice and buttons; acres/baskets/viss. Partial Burmese (20 most-seen strings) still differentiates; translations are native, not machine-translated.
6. **Leaflet + pre-cached tiles + GIBS** — keep Leaflet (known, works); add service-worker precache of the demo-bbox tiles (zoom 10–14) so the map works offline. *Why not MapLibre:* more powerful but a new API the night before; **the differentiator is offline maps, not the map library** — choose the library that delivers it fastest.

**Decision table (short form):** React/TS over Svelte/Vue (team knows it) · Leaflet over MapLibre (time) · FastAPI over Django/Express (team stack + async + WebSocket) · DuckDB over pandas-only (memory) and Postgres (server = venue failure mode) · SQLite over Firebase (Firebase needs internet — kills offline-first) · Rules over ML (no Myanmar training data in a day; ML without it is guessing) · PWA over native (impossible in a day) and plain website (needs internet).

**Workflows (full detail in the guide §13.4):** build order is dependency order — data pipeline + PWA shell (h 0–1) → backend + DuckDB + rules + WebSocket (h 1–3) → map + panel (h 3–5) → agent stream + rotation cards (h 5–7) → i18n + pre-harvest + badges (h 7–8) → demo + submission (h 8–9) → rehearse + submit (h 9–10). **Nobody touches the data pipeline after hour 1** — it is frozen so demo data never changes under the frontend. The judge workflow ends with the Burmese toggle flipped mid-demo — the most memorable 5 seconds of the pitch, placed last so it lands.

---

## 4. Frontend — dual-mode UI: FieldShift farmer flow × TERRA operations console

**The merge (from the screenshots, 13 Nov 2026):** the friend's picks are the FieldShift farmer screens (01 Overview, 04 Crop Comparison, 05 Scenario Simulator, 06 Decision Report + Mobile 1–4); your best picks are the TERRA analyst screens (01 Mission overview, 02 Field intelligence, 03 NASA data, 04 Map intelligence). **Two modes, one app, one dataset.** Farmer Mode proves the tool serves a real person; Analyst Mode proves the numbers are real, cleaned and traceable. Farmyza has one mode; this has two — and the analyst mode is where the cleaning pipeline (§5 in the guide) and provenance become *visible*, which is exactly what scores Validity.

**One design token system, two skins:** same spacing scale (4pt), type scale (1.25 ratio), radii (4/8/12/16/24). Farmer skin: deep forest-green sidebar, cream background, white cards, green accent buttons. Analyst skin: black sidebar, white background, lime-green accent, black stat cards, dense tables. Sample exact hex from the screenshots at build time.

### 4.1 Farmer Mode — the decision workflow (FieldShift)

| Screen | What it does | Priority |
|---|---|---|
| **F1 Overview** | Greeting ("Mingalaba, U …") + farm profile + Rainfall / Soil moisture / Temperature cards (each with source + vs-30-yr-mean delta) + selected-field satellite image + "Start Crop Analysis" | P0 |
| **F2 My Farm** | Field list, farm profile, field boundaries on the map | P1 |
| **F3 Environmental Intelligence** | The field's full NASA picture: POWER weather, SMAP moisture, MODIS/Landsat NDVI trend, ECOSTRESS stress, SRTM terrain — every value sourced + dated | P0 |
| **F4 Crop Comparison** | "Which crop should you plant next?" Options side by side: environmental-fit bars, planting-window strip, **"Why this option does/doesn't work"**, **"Check locally"** risks (= the challenge's "information gaps and risks needing local review"), recommendation banner | P0 — this screen *is* the challenge requirement |
| **F5 Scenario Simulator** | "What if conditions change?" Rainfall −20%, planting delay 2 weeks, irrigation on/off, "assume field drains well" toggle; each option re-scores live with "what changed and why" + "now in drought window" flags. Reuses the rotation engine's scoring function with modified inputs | P0 (new — differentiator, not visible in Farmyza's public demo) |
| **F6 Decision Report** | "Your Seasonal Decision Report": chosen rotation, comparison table, reasoning, next-steps checklist, "Ready to decide?" panel. **Generates the submission artifact** (export/print) | P0 |
| **Mobile M1–M4** | Same workflow as a PWA: Overview / Comparison / Simulator / Decision Card, bottom nav (Home, Compare, Simulate, Report). Responsive CSS on the same components, not a separate app | P0 (the PWA story) |

### 4.2 Analyst Mode — the operations workflow (TERRA)

| Screen | What it does | Priority |
|---|---|---|
| **A1 Mission overview** | Portfolio triage: monitored area, vegetation index, soil moisture, fields at risk, priority fields table (field / crop / area / NDVI / moisture / status), attention queue, data sources table (source / input / use / status: Connected) | P1 |
| **A2 Field intelligence** | One field, deep: vegetation index chart (last 12 observations vs seasonal baseline), root-zone soil moisture + 7-day delta, precipitation past 7 days vs seasonal average, **analyst assessment** (plain-language verdict), observation history table (acquired UTC / source / NDVI / cloud cover / quality: Validated), data confidence badge | P1 |
| **A3 NASA data** | **The cleaning pipeline made visible.** Import a data batch (source selector, drop GeoTIFF/NetCDF/HDF5 files, assign to field); annotation setup (label schema: healthy vegetation / vegetation stress / cloud / no data; polygon regions; "annotations require review before export"); imported batches table (batch / source / field / acquired / status). The single most convincing Validity screen | P1 — build first among Analyst screens |
| **A4 Map intelligence** | Satellite map + field boundary + NDVI overlay, layer toggles (field boundaries / stress annotations / vegetation index / soil moisture), selected-field panel, **observation timeline** (play + compare dates — NDVI time travel) | P1 |

### 4.3 Shared components (both modes)

| Component | What it does | Priority |
|---|---|---|
| `ModeSwitcher` | Farmer / Analyst toggle in the sidebar — flipping it mid-demo is a pitch moment | P0 |
| `App` / `AppShell` | Layout: sidebar + main; header with challenge name, data-status pill, DEMO badge | P0 |
| `FarmMap` (Leaflet + react-leaflet) | Base map, field polygons, click handling, zoom-to-field | P0 |
| `BaseLayerSwitch` | OSM/CARTO light + NASA GIBS MODIS true-colour satellite overlay (WMTS) | P0 |
| `FieldLayer` | GeoJSON field polygons (6–8 demo fields, Delta shapes); colour by NDVI or moisture | P0 |
| `AgentMarker` | Animated avatar (tractor/field-agent icon) that travels along a polyline to the clicked field; progress ring while moving | P0 (the differentiator) |
| `SimClock` + `EventLog` | Simulation clock + scrolling log: dispatched → en route → arrived → scan complete → plan ready | P0 |
| `FieldPanel` | Field detail: soil, moisture, vegetation health, weather — each value with source + date | P0 |
| `DataGauge` | One gauge per metric (moisture %, NDVI, rainfall mm, temperature °C) with a "vs climatology" delta | P1 |
| `PrioritySliders` | Income / soil health / water saving (0–100); re-ranks plans live | P0 |
| `RotationPlanCard` | One ranked rotation option: 2-season sequence, score breakdown, reasons for/against | P0 |
| `PreHarvestCard` | Harvest-window suggestion, drying conditions, lodging/flood risk, tasks checklist | P1 |
| `SeasonTimeline` | Monsoon / winter / summer strip showing where each crop sits in the year | P1 |
| `ProvenanceBadge` | Per-value badge: `LIVE · NASA POWER`, `CACHED · SMAP`, `DEMO` | P0 |
| `OfflineBanner` | Shows when live fetch fails: "Offline mode — cached data" | P1 |
| `DemoDataBanner` | Top-of-app: "Demo fields — Yangon Delta. Values are real NASA data for these coordinates unless badged DEMO." | P0 |

**Map choice:** Leaflet (not MapLibre) for a 1-day build — smaller API, react-leaflet is mature, offline tile handling is simpler. MapLibre is the better long-term choice (vector tiles, prettier); cut it for day one.

---

## 5. Backend API endpoints (FastAPI)

Base: `/api`. All responses JSON. Pydantic v2 models for every response.

| Endpoint | Method | Purpose | Response (shape) |
|---|---|---|---|
| `/api/health` | GET | Liveness + data-status summary | `{status, live: {power: true}, cached_layers: [...], demo_fields: 8}` |
| `/api/fields` | GET | List demo fields as GeoJSON FeatureCollection | `FeatureCollection` (id, name, crop_history, centroid, area_ha) |
| `/api/fields/{id}` | GET | Field detail + latest NASA snapshot | `{field, soil, moisture, vegetation, weather, provenance}` |
| `/api/fields/{id}/timeseries` | GET | Daily series for a parameter | `?param=T2M,PRECTOTCORR&start=20250101&end=20251113` → `{dates, values, unit, source}` |
| `/api/fields/{id}/plan` | POST | Ranked rotation plans | Body `{priorities: {income, soil, water}, horizon_seasons: 4}` → `{plans: [RotationPlan ×3]}` |
| `/api/fields/{id}/preharvest` | GET | Pre-harvest suggestions for current crop | `{crop, harvest_window, drying, risks[], tasks[]}` |
| `/api/agent/route` | GET | Waypoints for the agent run | `?from_lat,from_lon,to_lat,to_lon` → `{waypoints: [[lat,lon]…], eta_min}` (straight-line interpolation day one; OSRM routing is a cut) |
| `/api/fields/{id}/sensor` | POST | LoRaWAN sensor ingest (AgroGuard pattern) | `{sensor_id, soil_moisture, timestamp}` → stored, overrides satellite estimate when fresh |
| `/api/datasets/status` | GET | Provenance table for the UI | `[{layer, source, status: LIVE\|CACHED\|DEMO, as_of}]` |

**Design rule:** the rotation engine is pure functions (`engine/rotation.py`) with no I/O, so it is unit-testable in minutes and explainable to judges. The NASA client (`services/nasa_power.py`, `services/cache.py`) is the only network code. Keep them separate.

---

## 6. NASA data — what to use, how to get it, what is real vs demo

### 6.1 Dataset table

| Layer | Dataset / product | What it gives you | Resolution / record | Access | Auth | Status plan |
|---|---|---|---|---|---|---|
| Temperature, rain, humidity, wind, solar | **NASA POWER**, community `AG` | T2M, T2M_MAX/MIN, PRECTOTCORR, RH2M, WS2M, ALLSKY_SFC_SW_DWN, GWETTOP, GWETROOT | 0.5° grid (~55 km); daily/hourly/monthly; decades | REST API, free, anonymous | **None** | **LIVE** — the only live call at demo time |
| Rainfall (finer) | **GPM IMERG** (V07) | Daily precipitation | 10 km; 2000–present | GES DISC / Earthdata | Earthdata account | CACHED — but POWER's PRECTOTCORR is already GPM-corrected, so IMERG is optional day one |
| Soil moisture | **SMAP** SPL3SMP_E (L3, daily) + SPL4SMGP (L4, 3-hourly, surface + root zone) | Surface + root-zone soil moisture | 9 km; record starts **2015** (too short for a 20-yr trend — use for current conditions only) | Earthdata / AppEEARS point extraction | Earthdata account | **CACHED** sample for demo fields; label as_of date |
| Vegetation health | **MODIS MOD13Q1 / MYD13Q1** | NDVI + EVI | 250 m; 16-day composite; since 2000 | Earthdata / AppEEARS | Earthdata account | **CACHED** sample for demo fields |
| Evapotranspiration / plant stress | **ECOSTRESS** ECO3ETPTJPL + ECO4ESIPTJPL (ESI) | ET + evaporative stress index, 70 m | 2018–present | AppEEARS | Earthdata account | **STRETCH** — cut day one, mention in roadmap |
| Flood extent (monsoon) | **Sentinel-1 SAR** (ESA, not NASA) | Sees through monsoon cloud, unlike optical | 10 m | Copernicus / GEE | Free account | **STRETCH** — mention only |
| Soil properties | **ISRIC SoilGrids v2** (non-NASA complement) | pH, SOC, sand/silt/clay, CEC at 0–5 / 5–15 cm | 250 m, global | REST API, free | None | **LIVE or CACHED** — needed for the soil panel; be explicit it is not NASA |
| Crop climate needs | **FAO EcoCrop** | Temperature + rainfall range per crop | Database | Web / download | None | **REFERENCE** — verify ranges at build time, cite them |
| Satellite basemap | **NASA GIBS** WMTS | MODIS true-colour imagery as map tiles | Global, daily | WMTS, free | None | **LIVE** map layer |

### 6.2 Retrieval — commands that work now (verified access pattern)

**NASA POWER — no key, fetch tonight and cache:**
```bash
# Daily agroclimatology for one field centroid near Yangon (16.8409, 96.1735)
curl "https://power.larc.nasa.gov/api/temporal/daily/point?parameters=T2M,T2M_MAX,T2M_MIN,PRECTOTCORR,RH2M,WS2M,ALLSKY_SFC_SW_DWN,GWETTOP,GWETROOT&community=AG&longitude=96.1735&latitude=16.8409&start=20240101&end=20251113&format=JSON" -o data/cache/power_yangon.json
```
One request per grid cell is enough (0.5° grid). Fetch one file per demo field centroid, plus a 30-year climatology file for the onset/trend chart (same endpoint, longer range — allow 15–90 s).

**SMAP / MODIS — needs an Earthdata account, do this before the event:**
1. Create a free account at `urs.earthdata.nasa.gov`.
2. Use AppEEARS (`appeears.earthdatacloud.nasa.gov`) point-sample extraction: products `SPL3SMP_E` (SMAP soil moisture) and `MOD13Q1.061` (NDVI), points = demo field centroids, dates = last 12 months.
3. Download the CSVs into `data/cache/` and serve them from the backend. If the account step fails at the venue, the app still works — the cached CSVs are already in the repo.

**SoilGrids — no key:**
```bash
curl "https://rest.isric.org/soilgrids/v2.0/properties/query?lon=96.1735&lat=16.8409&property=phh2o,soc,sand,silt,clay,cec&depth=0-5cm&value=mean" -o data/cache/soil_yangon.json
```

**GIBS satellite tiles (Leaflet):** WMTS endpoint `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/wmts.cgi` with layer `MODIS_Terra_CorrectedReflectance_TrueColor` (verify the layer name in the WMTS GetCapabilities at build time; add `TIME` = latest date). If GIBS fails, fall back to CARTO/OSM tiles and say so in the provenance panel.

### 6.3 The resources tab — CLOSED 13 Nov 2026 (no PDFs exist)
The official Resources tab was read live by the parent agent on 13 Nov 2026: **26 links, zero PDFs** — every link is a dataset or data portal. The full list is in `guideforspaceapp.md` §2. Do not spend time hunting for challenge PDFs; the job is pulling data through the APIs in §6.2. (This supersedes the earlier "open gap" note.)

### 6.4 What is REAL vs DEMO (the honesty table the judges will respect)

| Item | Status | How it is badged in the UI |
|---|---|---|
| Temperature / rainfall / humidity / wind / solar for each field | REAL (NASA POWER, live) | `LIVE · NASA POWER` + date |
| Soil pH / SOC / texture | REAL (SoilGrids, cached) | `CACHED · SoilGrids` + date |
| Soil moisture, NDVI | REAL NASA products, cached samples for demo fields | `CACHED · SMAP / MODIS` + as_of date |
| Field boundaries, crop history, farm names | DEMO (hand-drawn Delta fields) | `DEMO` — "illustrative field layout" |
| Rotation scores, plan ranking | REAL RULES applied to the above data | Score breakdown shown, no hidden model |
| Yield predictions | **NOT PROVIDED** — the tool does not predict yield | Stated in the UI: "decision support, not a yield forecast" |
| Sensor readings | DEMO unless a real LoRaWAN feed is connected | `DEMO` until a live sensor posts |

---

## 7. Data flow: NASA dataset → UI

```
POWER API (live) ──► FastAPI /timeseries ──► FieldPanel gauges + SeasonTimeline
                      (in-memory cache, 10-min TTL; on failure → cached JSON)

SMAP / MODIS CSVs ──► data/cache/*.csv ──► FastAPI /fields/{id} ──► moisture + NDVI
(cached pre-event)      (loaded at startup)      (as_of date shown)

SoilGrids JSON ──► data/cache/*.json ──► /fields/{id} ──► soil panel (pH, SOC, texture)

GIBS WMTS ──► Leaflet tile layer ──► satellite basemap toggle

Crop table + rules ──► engine/rotation.py ──► POST /plan ──► RotationPlanCards
(FAO EcoCrop ranges)    (pure functions)          (score + reasons for/against)

POWER climatology ──► engine/preharvest.py ──► GET /preharvest ──► harvest window card
(30-yr daily means)     (dry-window search)       (+ optional Open-Meteo 7-day forecast*)
```
\* Open-Meteo is a non-NASA forecast API — optional complement only, clearly labelled, and only if time remains. POWER is historical/climatology, **not** a forecast; never present a climatology window as a forecast.

**Venue-wifi rule:** at demo time the app makes exactly one live network call (POWER, with a 5 s timeout and cached fallback). Everything else is local. If POWER fails, the provenance pill flips to `OFFLINE — cached data` and nothing breaks.

---

## 8. Crop-rotation planning logic (rules-based only)

### 8.1 Crop table — Myanmar Delta + Central Dry Zone (verified)

| Crop | Season in Myanmar | Duration | Water need | Family | Notes (sourced) |
|---|---|---|---|---|---|
| Monsoon rice (paddy) | Monsoon, sow May–Jun, harvest Oct–Nov | 3–5 months | Very high (flooded) | Grass (Poaceae) | Delta staple; double-rice only where irrigation exists |
| Summer rice | Nov–Dec → Apr–May | 3–5 months | Very high | Grass | Needs irrigation; competes with pulses for the dry season |
| Black gram (matpe) | Winter, after monsoon rice | 90–120 days | Low (~20% of paddy) | Legume | **The** Delta rotation: rice–black gram is the most common rotation in farmer surveys |
| Green gram (mung bean) | Monsoon or winter | 75–90 days | Low | Legume | Widest seasonal flexibility; Delta + Dry Zone |
| Chickpea | Winter (Central Dry Zone) | ~90–120 days | Low | Legume | Competes with groundnut/sunflower for winter lowland |
| Pigeon pea | Monsoon (Central Dry Zone) | ~200 days | Low–medium | Legume | Long cycle; intercropped with groundnut/sesame |
| Sesame | Monsoon / winter | ~80–100 days | Low | Pedaliaceae | Dry Zone oilseed; intercrop with pigeon pea |
| Groundnut | Monsoon / winter | ~100–120 days | Medium | Legume | Intercrop with pigeon pea |
| Maize | Monsoon / winter | ~90–120 days | Medium | Grass | Break crop vs rice pests; needs drainage |
| Fallow / green manure | Any | 1 season | None | — | Restores soil; use after 2 consecutive rice crops |

Durations and seasons are from the Myanmar Pulses Sector Development Strategy (2017), ACIAR/IRRI field guides, and MOALI data cited in the insurance feasibility study. **TO-VERIFY at build time:** exact sowing windows for the specific Yangon township you demo, and FAO EcoCrop temperature/rainfall ranges per crop. Do not hard-code a yield number anywhere.

### 8.2 The rules (each rule is one function, one reason string)

1. **Season fit** — a crop may only be placed in a season whose window contains its full duration (monsoon / winter / summer as in §8.1). Violation = candidate rejected, with the reason shown.
2. **Legume nitrogen credit** — a legume fixes atmospheric nitrogen via rhizobia; the *following* season's crop gets a soil-health bonus. Implemented qualitatively as a score bonus, **not** a fabricated kg-N/ha number (published fixation rates vary widely by species, soil and inoculation — if you quote one, cite the source and show it as a range).
3. **Paddy–fallow / paddy–pulse cycle** — two consecutive flooded-rice seasons without a legume or fallow = soil-health penalty (waterlogging, organic-matter decline, pest carryover). The classic Delta fix is rice → black gram on residual moisture.
4. **Pest-break rotation** — never plant the same family twice in a row; a grass after a grass (rice → maize) scores lower than a legume after a grass. Same-crop repeat = hard penalty with reason "same family — pest and disease carryover".
5. **Water budget** — crop water need vs the field's water position: POWER rainfall for the season + SMAP soil moisture + farmer's irrigation flag. A high-water crop in a low-moisture field is rejected or down-ranked with reason "insufficient residual moisture".
6. **Soil fit** — SoilGrids pH / texture / SOC checked against the crop's tolerance (FAO EcoCrop ranges). Out-of-range = penalty with the actual values shown (e.g. "pH 5.1 — black gram prefers 6.0–7.5").
7. **Farmer priorities** — three sliders (income / soil health / water saving) weight the score components. Default 40/30/30. Moving a slider re-ranks live — this is the "farmer priorities" half of the challenge brief, and judges will test it.
8. **Diversity bonus** — rotations using 3+ families across the horizon score higher (resilience argument, stated as such).

### 8.3 The planner (deterministic, explainable)

```
for each field:
  history = last 2 seasons of crops (DEMO data, badged)
  candidates = all 2-season sequences from the crop table that pass Rule 1 (season fit)
  for each candidate:
    score = w_income*income_fit + w_soil*soil_score + w_water*water_score
            + legume_bonus + diversity_bonus - pest_penalty - soil_penalty
    reasons_for = [rules that added points, with the numbers]
    reasons_against = [rules that removed points, with the numbers]
  return top 3, sorted, each with score breakdown + reasons for/against
```

**Score is 0–100, deterministic, no randomness, no ML.** Show the arithmetic on the card (e.g. "Soil 82 — legume credit +12, pH fit +8, pest-break +10, water −6"). If two plans tie, prefer the one with the legume — say so in the code comment. This explainability is the Validity score.

### 8.4 Pre-harvest suggestions (for the current crop)

Computed from POWER climatology + recent data + SMAP, never presented as a forecast:
- **Harvest window:** search the next 14 days of the 30-year climatology for the longest run of days with expected rain < 2 mm and RH < 80% — label "climatological dry window, not a forecast".
- **Drying conditions:** mean solar radiation + humidity in that window (POWER ALLSKY_SFC_SW_DWN, RH2M).
- **Lodging risk:** wind (WS2M) — flag if the field's recent max wind exceeds the crop's lodging threshold (state the threshold as an assumption if uncited).
- **Flood risk:** recent PRECTOTCORR totals + SMAP soil moisture near saturation → "delay harvest / drain" warning.
- **Task checklist:** generated from the crop + window (e.g. "cut when grain moisture ~20%", "thresh within 2 days of cutting") — each task must be a generic, citable agronomy practice, not invented precision.

---

## 9. The "agent runs to the farm" simulation

This is the Creativity differentiator — build it early, not last.

- **Trigger:** clicking a field (or pressing "Send agent").
- **Movement:** the agent marker animates along a polyline from its base (e.g. the village/agri-office point) to the field centroid. Day one: straight-line interpolation between waypoints from `/api/agent/route`, animated with `requestAnimationFrame`, ~2.5 s travel, ease-in-out. OSRM road routing is a cut — straight lines read fine at this zoom.
- **While moving:** the field panel shows a skeleton ("Agent en route…"), the event log streams timestamped lines, a progress bar shows distance covered.
- **On arrival:** a small "scan" pulse on the field, the log writes "soil scan complete", the panel populates with the NASA data, then the rotation plans appear one by one (staggered 300 ms) — the reveal is the demo moment.
- **Sim clock:** a small clock in the corner advances during the run (e.g. 09:12 → 09:14) to sell the simulation feel. It is a display clock, not real time — label it "sim time".
- **Fallback:** if the user clicks a second field mid-run, cancel the first animation and re-route (don't queue).

---

## 10. Offline Resilience & Demo Isolation

1. **Pre-cached Datasets:** `data/cache/` contains verified JSON snapshots for the Twante baseline (POWER meteorology, climatology, SoilGrids). Setting `FIELDSHIFT_OFFLINE=1` instructs the backend to bypass external network calls and serve locally validated snapshots.
2. **Local Client State:** Drawn polygons, field annotations, return price inputs, and scenario parameters persist in browser local storage across reloads.
3. **Printable Offline Reports:** Screen F6 renders formatted decision reports using `@media print` rules, enabling direct printing or PDF export without cloud dependencies.
4. **Network Boundaries:** Live satellite re-fetches and arbitrary coordinates outside pre-cached regional bounds require active connectivity. The UI displays transparent status pills (`LIVE`, `CACHED`, `DEMO`, `UNAVAILABLE`) so users and evaluators know exact source states.

---

## 11. Build Order & Milestones

| Milestone | Component | Scope & Verification |
|---|---|---|
| M1 | Scaffold & Core Loop | React + TS + Leaflet frontend, FastAPI backend, `/api/health`, `/api/fields`. |
| M2 | Specialist Agent Choreography | 3-variant agent family (Field Scout, Water Analyst, Crop Planner) with anticipation & physics motion. |
| M3 | Deterministic Rotation Engine | 10 crops, 8 agronomic rules, suitability scoring (0–100), transparent breakdown & citations. |
| M4 | Drawing & Annotation Pipeline | Freehand polygon drawing, vertex editing, planar acreage, bounding box validation, `/api/analysis`. |
| M5 | What-If Scenario Projections | Rainfall, delay, irrigation, and drainage deltas with dynamic re-ranking. |
| M6 | Gated ML Evaluation Tracks | 3 ML tracks evaluated with chronological holdouts and failure gates. |
| M7 | Seasonal Decision Report | Printable F6 dossier, bilingual i18n (English/Burmese), and full offline demo rehearsal. |

---

## 12. Submission Checklist

- [ ] Project page: challenge (Field Shift), team, video walkthrough, GitHub repository link.
- [ ] README: problem statement, NASA data provenance table, installation, and run instructions.
- [ ] `data/cache/` committed with source references documented in `SOURCES.md`.
- [ ] Demo video: concise judge walkthrough covering field drawing, agent travel, rotation comparison, and report export.
- [ ] Judging criteria mapped: Impact, Creativity, Validity, Relevance, Presentation.

## 13. Reuse from AgroGuard (the team's prior project — pattern only, no repo access claimed)

- **Rule-file pattern:** AgroGuard's custom `.agri` DSL linter is the model for the rotation rules — consider a tiny `rotations.agri`-style text file where each rule is one readable line (e.g. `after rice: prefer legume`), parsed by the engine. It makes the agronomy auditable by a non-programmer judge and is a strong Validity story. Optional; the Python rule functions are the fallback.
- **LoRaWAN sensors:** AgroGuard's paddy sensors are the "ground truth" channel — the `/api/fields/{id}/sensor` endpoint lets a real sensor reading override the SMAP estimate when fresh. Build the endpoint, demo it with one hand-sent reading; do not fake a live sensor feed.

## 14. Risks

| Risk | Mitigation |
|---|---|
| Venue wifi fails | §10: cached data + cached tiles; rehearse offline |
| POWER API slow (30-yr fetch takes 15–90 s) | Fetch climatology the night before; never fetch it live during the demo |
| SMAP/MODIS need an Earthdata account | Create the account tonight; cached CSVs are the fallback |
| Judges ask "is this yield prediction?" | Answer: no — decision support with shown reasoning; the UI says so |
| Rotation advice wrong for a real farmer | Scope the language: "exploration tool", "discuss with local extension services"; never present a plan as a prescription |
| The official resources PDFs unread | Retrieve them first thing (§6.3); cite them in the README |

---

## Sources (all verified 13 Nov 2026)

- Challenge brief — "Field Shift: Adapting Farms with NASA Data", NASA Space Apps Challenge 2026, via Ulaanbaatar/UAE/Sonoma mirrors (official site unreachable from this environment at research time).
- Judging criteria — NASA Space Apps Ulaanbaatar judging page; Calgary "How you are judged"; Costa Rica evaluation grid (Impact 30 / Creativity 20 / Feasibility 20 / Prototype 20 / Presentation 10); Yangon 2026 poster; CrafterWIKI 2026 event plan (2025-carried rubric, guide due 13 Nov 2026).
- NASA POWER — `power.larc.nasa.gov` API docs via AgroPredict/app and Farmonaut API comparison (12 Nov 2026): daily point API, `community=AG`, no key, 0.5° grid; parameters T2M, PRECTOTCORR, RH2M, WS2M, GWETTOP, GWETROOT.
- SMAP L4 (SPL4SMGP, DOI 10.5067/T5RUATAQREF8), 9 km, 3-hourly, record from 2015 — NASA CMR/NSIDC metadata; RotaShift data-status notes (SMAP too short for 20-yr trends).
- MODIS MOD13Q1/MYD13Q1 NDVI/EVI, 250 m, 16-day, since 2000 — NASA Earthdata/AppEEARS docs.
- ECOSTRESS ET + ESI, 70 m — NTRS technical paper (Amargosa Basin, 2025).
- Myanmar cropping systems — Myanmar Pulses Sector Development Strategy (ACIAR, Dec 2017); Boughton et al., "Overcoming Isolation" (ICAE 2015, AgEconSearch); ACIAR/IRRI "Green-Mat" black gram/green gram guide (2016); SCBF Myanmar agricultural insurance feasibility study (2015–2017). Durations: pulses 90–120 days, green gram 75–90 days, pigeon pea 200 days; pulses ≈20% of paddy water; rice–black gram and rice–green gram the most common rotations.
- Precedent builds for the same challenge — RotaShift (GitHub, Bangladesh, Challenge 7) and AgriTwin (GitHub, Challenge 7): both use live NASA POWER + cached SMAP/MODIS + explicit DEMO badging; their honesty tables informed §6.4.
