# Field Shift — GIS Farm Twin for NASA Space Apps Challenge 2026
## Architecture & 1-Day Build Plan — Challenge 07: "Field Shift: Adapting Farms with NASA Data"

**Event:** NASA International Space Apps Challenge 2026, Yangon — **14–15 Nov 2026** (48 h event; this plan is a **1-day build**, ~10 working hours, so it also fits a single day).
**Challenge (verified, official brief):** *"Create a decision-support tool that uses NASA Earth observations along with local soil information, crop characteristics, and farmer priorities to help farmers explore rotation strategies that could strengthen soil health and adapt their farms to changing conditions."* — Intermediate/Advanced, categories: Arts & Multimedia, Earth Science, Software.
**Stack:** React + TypeScript frontend, Python FastAPI backend (the team's existing stack).
**Status of this document:** design only — no code was run. Every dataset, number and rule below is either verified from a cited source or explicitly flagged DEMO / TO-VERIFY.

> **Updates, 13 Nov 2026 (evening):** the official Resources tab **was** read live by the parent agent — 26 links, **no PDFs** (all datasets/portals). The full list is in `guideforspaceapp.md` §2; §6.3 below is superseded by that read. And `guideforspaceapp.md` **now exists** in this folder — it is the master guide; this document is the architecture companion.

---

## 1. Judging criteria — design every feature to score on one of these

Verified from multiple 2026 sources (official local-event pages, NASA Space Apps Calgary/Ulaanbaatar, Costa Rica evaluation grid, Yangon local poster). The 2026 Judging & Awards guide was due 13 Nov 2026, so weights are provisional — the five criteria themselves are stable across years.

| Criterion | What judges look for | Weight (best available) | How this design scores on it |
|---|---|---|---|
| **Impact** | Real problem, real difference for real people | 30% (Costa Rica grid) / 20% (2025-carried rubric) | Myanmar Delta farmers, rice–pulse rotations, water saving — a named place, named crops, named problem |
| **Creativity** | New, inventive, original approach | 20% | The agent that *runs to the farm* + simulation UI — nobody else demos a rotation plan as a field visit |
| **Validity** | Scientifically and technically sound, could really be built | 20% | Rules-based engine on real agronomy + real NASA data, every number sourced, DEMO clearly badged |
| **Relevance** | Answers the chosen challenge | 20% | Directly the brief: NASA Earth observations + soil + crop characteristics + farmer priorities → rotation strategies |
| **Presentation** | Clear, effective pitch in minutes | 10% | A 3-minute judge walkthrough scripted in §2.2; the map *is* the pitch |

**Hard eligibility rule (verified):** a project must use NASA data to be eligible for Global Judging. The data-provenance panel (§4) makes the NASA usage visible on screen, not just in the README. Judging runs in three phases: local judges → NASA/partner subject-matter experts → executive committee. The submission page must carry the project after the local event, so the README and demo video matter as much as the code.

**Yangon local note:** the Yangon 2026 poster lists the same five criteria with icons for impact, creativity, feasibility, sustainability/global impact, and presentation/teamwork — frame the pitch with a sustainability line (soil health, water saved) as well as the tech.

---

## 2. The concept

### 2.1 One paragraph
A GIS-level farm map of the Yangon Delta. The farmer (or judge) clicks a field. A small agent avatar drives/runs across the map to that field — a visible, simulation-style journey with an event log ("Dispatched 09:12 → arrived 09:14 → soil scan complete"). On arrival, a field panel opens with live NASA-derived soil, moisture, vegetation and weather for that exact field, and the agent produces a ranked seasonal crop-rotation plan plus pre-harvest suggestions, each with the evidence for and against it. Farmer priorities (income / soil health / water saving) are sliders that re-rank the plans live.

### 2.2 The 3-minute judge walkthrough (rehearse this, don't improvise it)
1. **0:00–0:30** — Map of the Yangon Delta loads. "This is a real farm area near Yangon. These are real fields." Click field F-03.
2. **0:30–1:00** — The agent runs across the map. "The agent goes to the field instead of giving you a table." Event log narrates the trip.
3. **1:00–1:45** — Field panel: soil moisture from SMAP, rainfall from GPM/POWER, vegetation from MODIS NDVI, all with source labels and dates. "Every number shows where it came from."
4. **1:45–2:30** — Rotation plan: three ranked options for the next two seasons with reasons for/against each. Move the "soil health" slider — the ranking changes live. "The farmer's priorities change the answer."
5. **2:30–3:00** — Pre-harvest card for the current crop + the cut line: "Rice, then black gram on residual moisture — the rotation Delta farmers already use, now chosen by satellite data instead of habit."

---

### 2.3 Differentiation — why this beats Farmyza and the other agri projects (deep reasoning)

**The competitive landscape (verified, 13 Nov 2026):**
- **Farmyza — Team Solven, Dhaka, Bangladesh** — a 5-person **student hackathon team** (Tahmid Hasan Tasin, Team Leader; AS Ayman, Dev Coordinator; Shahed Rahman, ML & Algorithm Engineer; Khalid Bin Imtiaz Labib, Creative Designer & Videographer; Zunaira Zahin Zara, Agronomy Researcher), built for this year's NASA Space Apps "Field Shift" challenge. **Not a company** — their video calls Farmyza a "SaaS platform", but that is positioning language; there is no evidence of a registered business, funding, or app-store listing. Their demo video was posted **17 Oct 2026**, a month before the event weekend — a pre-event demo/promo. They compete in the **Dhaka** local event, not Yangon, so you do not face them in local judging — the comparison matters at **global** judging. Their shape: click-a-field map → ML rotation recommendation + plain-language AI agent, powered by POWER API, SMAP L4, Landsat 8/9, ECOSTRESS, GIBS. **What is UNVERIFIED about them:** their full feature set beyond the public reel/description — do not claim they lack a feature unless it is absent from their public demo; say "not visible in their public demo".
- **RotaShift (Bangladesh haor basin)** — 22 years of NASA rainfall data, growing-window shift, rotation survival test. README is explicit that all figures are **sample values, not agronomic recommendations**.
- **AgriTwin (Team DevTech)** — live NASA POWER API calls (climatology + daily point), SMAP L3/L4 + ECOSTRESS plug-in.

**The 10 differentiators — each one maps to a criterion and is hard to copy in a day:**

1. **Myanmar-first, not Myanmar-flavoured (Relevance + Impact).** Real Delta + Dry Zone crops (monsoon rice, black gram, green gram, pigeon pea, sesame, groundnut), real sowing windows, real hazards: monsoon flood timing, May cyclone season, Dry Zone drought, delta salt intrusion. Farmyza and RotaShift are Bangladesh haor — different country, different monsoon, different crops. A judge in Yangon can tell the difference in one glance.
2. **Burmese-language farmer interface (Impact).** The end user is a Myanmar farmer; an English-only tool excludes them. Ship Burmese field labels, advice summaries and key buttons — plus local units (acres, baskets, viss) instead of hectares/tonnes. No known project for this challenge ships a Burmese farmer-facing UI.
3. **The data-cleaning pipeline as a Validity moat (Validity).** 9 sources through a validated pipeline (documented scaling, cloud/quality masking, range checks, dedup, `cleaning_report.json` in the repo). Farmyza's public shape is "calls the POWER API" — no cleaning layer visible. Judges score Validity on technical soundness; a cleaning report is checkable evidence, not a claim.
4. **Pre-harvest engine — a second engine, not a feature (Creativity + Impact).** Harvest window from NDVI senescence + 10-day rain outlook + ESI stress + SMAP dryness + El Niño context. Farmyza's known shape is rotation recommendation + explanation. This extends the product from "what to plant" to "when to harvest" — full-season coverage.
5. **Climate futures (Relevance).** NEX-GDDP-CMIP6 projections (2015–2100) via POWER's high-resolution toggle — "what will the season look like". The challenge is about *adapting to changing conditions*; a future-climate view answers the brief's core word ("adapting") more directly than current-data-only tools. Verify the toggle serves NEX-GDDP at build time.
6. **Space + ground fusion (Validity).** LoRaWAN field sensors (AgroGuard pattern) fused with SMAP satellite moisture. Satellite-only tools cannot validate their moisture numbers; this one can — even one sensor, or a clearly-labelled DEMO sensor feed. Ground truth is the difference between a demo and a system.
7. **Offline-first for Myanmar's reality (Impact + Validity).** Cleaned snapshots; the demo works with dead venue Wi-Fi. Rural Myanmar connectivity is the reality for the end user — a tool that needs live internet fails where farmers are. A live-API-only shape fails offline.
8. **Provenance / honesty system (Validity).** Every number carries source + product version + retrieval date; LIVE / CACHED / DEMO badges; the "what is real vs demo" table (§6.4). In a field where teams demo sample values, verifiable real data is a differentiator.
9. **The agent as simulation, not chatbot (Creativity).** Farmyza's agent explains; this agent *shows the work happening* (route, sim clock, event log, scan pulse, staggered reveal). And the rotation rules are an auditable rules engine (`.agri` DSL pattern) — an agronomist can read the rules, unlike a black-box ML recommendation. The challenge itself demands "why it was suggested" + evidence; a rules engine answers that natively, while ML needs an explanation layer bolted on.
10. **Farmer priorities as the control surface (Relevance).** The challenge text names "farmer priorities" as an input — most tools ignore it. Here income / soil-health / water-saving sliders re-rank plans live, and income uses **farmer-entered prices** (their own numbers, never invented data) + water cost (pulses ≈20% of paddy water, verified). Plus a field-calendar view for bare-field periods and pest-break windows — explicitly requested by the challenge text and skipped by most teams.

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

### 2.4 Farmyza head-to-head — looks similar, we do better in every way (full table in `guideforspaceapp.md` §14)

**The similarity trap:** to a judge skimming, both projects are "click a field on a map, get a crop rotation plan". If the judge sees the same shape, they score it as the same project. The difference must be **unmissable in 30 seconds**.

**Honesty note:** this comparison is against what Farmyza shows in their **public demo** (Facebook reel, 17 Oct 2026). Their full feature set is UNVERIFIED. Never say "Farmyza doesn't have X" on stage. Say **"what Farmyza shows publicly is X; what we ship is Y — and here is the evidence"**.

| Looks similar… | Farmyza (public demo) | We do better | Criterion |
|---|---|---|---|
| Click a field on a map | Click → ML recommendation appears | Click → **agent runs to the field** (route, sim clock, event log, scan pulse, staggered reveal) | Creativity |
| Rotation recommendation | Custom ML model, "ideal rotations" | **Rules engine**: ≥3 rotations + existing one, reasons for/against, evidence, gaps, risks — the challenge's explicit requirement; auditable, not a black box | Validity, Relevance |
| AI agent | Plain-language Q&A agent | **Simulation agent that shows the work** — the event stream *is* the pipeline executing | Creativity |
| NASA data | POWER, SMAP L4, Landsat 8/9, ECOSTRESS, GIBS via API | **9 sources through a validated cleaning pipeline** + GPM IMERG, SRTM, FAO GAEZ, Sentinel-2, Crop Monitor, NEX-GDDP futures; provenance + cleaning report | Validity |
| Water / irrigation | Pulses "to cut irrigation needs" | **Actual irrigation numbers**: SMAP trigger + IMERG rain + ESI flag + POWER ET → when and how much; water budget per rotation | Validity, Impact |
| Pre-harvest | Not visible in public demo | **Full pre-harvest engine** (NDVI senescence + 10-day rain + ESI + SMAP + El Niño) | Creativity, Impact |
| Farmer language | English UI + English agent (per public demo) | **Burmese UI + local units** (acres, baskets, viss) | Impact |
| Works as a product | "SaaS platform" — needs internet | **Local-first PWA** — installable, fully offline after first load | Impact, Validity |
| Ground truth | Satellite-only (per public demo) | **Space + ground fusion** (LoRaWAN sensors, AgroGuard pattern) | Validity |
| Adapting to change | Current-conditions data (per public demo) | **Climate futures** (NEX-GDDP-CMIP6, 2015–2100) | Relevance |
| Data honesty | No cleaning report or provenance visible | **Provenance system** — every number sourced, dated, badged LIVE/CACHED/DEMO | Validity |
| Farmer priorities | No priority input visible | **Sliders re-rank plans live**; income from farmer-entered prices | Relevance |
| Field calendar / pest breaks | Not visible in public demo | **Field-calendar view** (bare-field periods, pest-break windows) | Relevance |
| Local context | Bangladesh haor, rice + maize | **Myanmar Delta + Dry Zone**, 6 crops, real hazards (cyclone, drought, salt intrusion) | Relevance, Impact |
| Submission proof | Video demo | **Video/slides + cleaning report + README honesty table + public repo** | Validity, Presentation |

**The 30-second differentiation demo (rehearse this):** (1) install the PWA — one tap; (2) turn Wi-Fi off, reload, click a field — everything still works; (3) watch the agent run with the event log narrating each data check; (4) flip the UI to Burmese mid-demo; (5) point at a provenance badge — one number, its source, version, date. **The one-paragraph pitch:** "Farmyza is a rotation recommender. This is a full-season farm twin: it plans what to plant, tells you when to harvest, shows you the future climate, speaks the farmer's language, works with no internet, and proves every number it shows. Same challenge, different product — and you can verify all of it in the repo in under a minute."

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

## 10. Offline strategy (venue wifi is the biggest risk)

1. **Tiles:** Leaflet with CARTO light basemap online; pre-download an MBTiles/PMtiles pack for the Yangon region as the offline layer (or, simplest robust option: a service-worker tile cache populated during rehearsal). If neither works, the app still renders field polygons on a plain background — test this path.
2. **Data:** `data/cache/` JSON/CSV snapshots committed to the repo; backend serves them when the POWER call fails.
3. **Fonts:** system fonts only, or self-hosted — no Google Fonts CDN at demo time.
4. **Rehearsal:** run the full demo once with wifi off before the judges arrive.

---

## 11. Build order — one day (~10 h)

| Hour | Build | Done when… | If time runs short |
|---|---|---|---|
| 0–1 | Scaffold: Vite + React + TS + Leaflet; FastAPI skeleton; `data/cache/` with POWER JSON fetched (curl, §6.2) | Map renders, `/api/health` returns | Skip Tailwind; use plain CSS |
| 1–3 | **Core loop:** fields GeoJSON → click → field panel with real POWER + SoilGrids values | Clicking a field shows sourced numbers | Cut gauges; show numbers as a table |
| 3–5 | **Agent animation + sim UI:** AgentMarker, event log, sim clock, scan pulse | The run-to-farm moment works end to end | Cut the sim clock; keep the log |
| 5–7 | **Rotation engine:** crop table, 8 rules, planner endpoint, plan cards with reasons for/against | Top-3 plans render with score breakdowns | Cut to top-2; cut the diversity bonus |
| 7–8 | Pre-harvest card + priority sliders + provenance badges | Sliders re-rank live; every value badged | Cut pre-harvest to a static checklist |
| 8–9 | Polish + offline pack + rehearsal (wifi off) | Demo runs with wifi off | Cut the GIBS satellite layer |
| 9–10 | **Submission:** README (data sources + honesty table), 2-min demo video, project page | Submitted | Cut the video to a 60-s screen capture |

**What to cut first, in order:** (1) ECOSTRESS / Sentinel-1 layers, (2) OSRM routing, (3) sensor ingest endpoint, (4) MapLibre, (5) pre-harvest card → static checklist, (6) GIBS layer. **Never cut:** the map + click + panel loop, the agent run, the rotation engine, the provenance badges — those are the pitch.

---

## 12. Submission checklist

- [ ] Project page: challenge (Field Shift), team, 2-min video, link to repo, link to live demo if hosted
- [ ] README: problem, data sources (with the honesty table from §6.4), how to run, what is DEMO
- [ ] `data/cache/` committed, with a `SOURCES.md` listing every file's origin + date
- [ ] Demo video: the §2.2 walkthrough, recorded once, no retakes after hour 9
- [ ] Judging criteria mapped: one slide/paragraph per criterion (Impact / Creativity / Validity / Relevance / Presentation)
- [ ] "How to retrieve the official PDFs" note: the resources-tab PDFs downloaded into `data/resources/` (§6.3)

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
