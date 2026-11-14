# Garvesty Digital Twin
## Product Requirements & Technical Build Guide

**Project:** Garvesty (NASA Space Apps Challenge 2026)  
**Challenge:** NASA Space Apps Challenge 2026 — “Field Shift: Adapting Farms with NASA Data”  
**Geographic focus:** Myanmar's Ayeyarwady Delta (Twante baseline verified; Bogale, Hinthada, and Myaungmya planned expansion)  
**Document purpose:** A single source of truth for the product concept, MVP scope, architecture, data handling, simulation logic, drawing workflow, custom agents, gated ML tracks, and implementation priorities.

> **Important status note:** This document describes the Garvesty digital-twin product specification. Features and data sources are explicitly labelled as verified/active, planned, or optional. Twante is the active validated baseline; other regional townships are planned for phased expansion.

---

# 1. Product vision

FieldShift Digital Twin is a map-based agricultural decision-support system that creates a digital environmental profile of a selected farm field. It combines NASA Earth-observation data, local soil and crop information, and farmer priorities to help farmers and advisers explore crop-rotation strategies and seasonal decisions.

A farmer selects a field on the map. The system retrieves the available environmental information for that location, presents a field profile, and runs an explainable analysis workflow. Farmers can compare crop plans and explore “what-if” scenarios—such as reduced rainfall, delayed planting, or unavailable irrigation—before making a real-world decision.

The product is designed to **support farmer judgement, not replace it**. It must not promise yields, profits, or guaranteed crop outcomes.

## 1.1 One-sentence explanation

A digital twin for farms in Myanmar that turns satellite and local environmental data into explainable crop-rotation and seasonal-planning decisions.

## 1.2 The problem

In the Ayeyarwady Delta, farmers commonly grow rice during the monsoon season. After harvesting, they must decide what to grow next during the dry season.

That decision depends on several changing factors:

- Rainfall and remaining soil moisture.
- Access to canal or pump irrigation.
- Soil properties and drainage.
- Temperature and crop growing windows.
- Flood exposure and, in coastal areas, possible salinity.
- Crop characteristics and the farmer's own priorities.

A farmer may not have an accessible way to combine these factors and compare different crop plans. FieldShift aims to make the evidence easier to understand and discuss with local agricultural advisers.

## 1.3 Primary users

1. **Farmer:** Selects a field, reviews understandable crop options, and explores scenarios.
2. **Agricultural adviser / extension worker:** Reviews evidence, assumptions, risks, and data limitations.
3. **Analyst / project reviewer:** Inspects data sources, processing, dates, quality checks, and provenance.
4. **Judge / evaluator:** Verifies that the project uses real Earth-observation data and explains how it informs decisions.

---

# 2. What “digital twin” means in this project

A digital twin is not merely a map, chatbot, or animated character.

For FieldShift, the digital twin is a **digital representation of a selected field and its available environmental context**. It contains:

- Field geometry and approximate area.
- Geographic location and nearby reference data.
- Historical and recent weather indicators.
- Soil and vegetation observations where available.
- Crop history and farmer-provided information, where available.
- Data quality, spatial resolution, retrieval date, and source.
- Crop-plan assessments and scenario assumptions.

The twin is updated when new data becomes available or when the farmer changes inputs. It can then be used to compare possible decisions.

### 2.1 Three connected parts

| Part | Responsibility |
|---|---|
| Digital field model | Represents the selected field and its environmental context |
| Analysis and simulation engine | Evaluates crop rotations and recalculates scenarios |
| AI agent interface | Coordinates analysis steps and explains the results in plain language |

These parts must remain distinct. The agent does not make unsupported claims, and animation alone does not make the system a digital twin.

---

# 3. Product experience

The application has two modes using the same underlying data.

## 3.1 Farmer Mode (6 Functional Screens)

A simple, Burmese-first and bilingual experience focused on making a seasonal decision.

### F1. Farm Overview
- Greeting and selected farm profile.
- Field selector and interactive Leaflet map.
- Summary cards for rainfall, soil moisture, and temperature.
- Sourced timestamps beside each environmental value (`LIVE` or `CACHED` · NASA POWER).
- Main actions: **Analyse this field** and resume saved decisions.

### F2. My Farm (Boundary Drawing & Agronomic Annotation)
- Interactive polygon drawing and vertex editing via Leaflet map tools.
- Real-time planar shoelace area calculation in local units (Acres / ဧက) and metric (Hectares).
- Field geometry validation: minimum 3 vertices, bounding box check within supported coverage, self-intersection guard.
- Agronomic field annotations: field name, crop history, irrigation access (canal, pump, rainfed), and drainage status (good, moderate, poor).
- Clear attribution: user-drawn boundaries are marked as **user-provided**, not surveyed.

### F3. Environmental Context & Evidence
- Rainfall history and seasonal normals from NASA POWER.
- Root-zone soil wetness profile and surface moisture.
- ISRIC SoilGrids v2.0 topsoil pH and clay/sand soil texture.
- Clear disclosures for coarse grid footprints (e.g. 0.5° meteorological grid vs individual field scale).

### F4. Crop Rotation Comparison
- The core decision comparison screen.
- Compares at least three alternative crop plans plus the farmer's baseline practice:
  1. Rice → Rice (baseline; highly vulnerable to dry-season water stress and high pumping costs).
  2. Rice → Mung bean (Green gram; low water requirement, short duration, soil health bonus).
  3. Rice → Black gram (*Matpe*; drought-hardy, taproot water scavenging, export cash crop).
- Ineligible baselines (e.g. rainfed rice in dry season) remain visible with explicit failure reasons.
- Each option displays:
  - Suitability category and score breakdown (Soil, Water, Income).
  - Explicit reasons for and against.
  - Sourced evidence citations.
  - Information gaps and what to verify locally (e.g. tidal salinity, canal opening schedules).
  - Interactive priority sliders (Income, Soil Health, Water Saving) with live re-ranking.
  - Farmer return inputs (MMK / basket) ensuring financial neutrality when prices are not provided.

### F5. Scenario Simulator (What-If Projection)
- Allows farmers and advisers to stress-test plans under altered assumptions:
  - Rainfall deviation: −20% (drought scenario) to +20% (wet spell).
  - Planting delay: 0 to 14 days (missing residual moisture window).
  - Irrigation availability: available, limited, or none.
  - Drainage condition: good, moderate, or poor.
- Deterministic delta projection recalculates scores and explains changes step-by-step.
- Clearly states: scenarios are conditional explorations, not deterministic weather forecasts.

### F6. Seasonal Decision Report
- Comprehensive printable and shareable decision dossier.
- Summarizes:
  - Farm and field profile with area and location coordinates.
  - Current NASA and local environmental baseline observations.
  - Full crop rotation comparison table with breakdown.
  - Tested what-if scenario assumptions and resilience impact.
  - Local verification checklist and risk warnings.
  - Scientific disclaimer: decision-support tool, not a yield guarantee.
- Supports offline printing via optimized print stylesheets.

## 3.2 Analyst Mode (4 Functional Screens)

An evidence, telemetry, and data-quality workspace for agricultural advisers, data analysts, and hackathon evaluators.

### A1. Mission & Coverage Overview
- Geographic coverage map and active reference bounding boxes.
- Data source connection status (`LIVE`, `CACHED`, `DEMO`, `UNAVAILABLE`).
- Freshness timestamps, observation latencies, and layer availability metrics.

### A2. Field Intelligence & Footprints
- High-resolution field geometry, vertex coordinates, and centroid computation.
- Time-series visualization of precipitation and temperature trends.
- Sensor spatial footprint overlays illustrating the resolution gap between satellite grid cells and farm polygons.

### A3. NASA & External Data Catalogue
- Comprehensive registry of all satellite products and supporting sources:
  - NASA POWER (Hourly & Daily meteorology, 0.5° × 0.625°).
  - NASA GPM IMERG (Satellite precipitation estimation).
  - NASA SMAP L4 (Soil moisture, 9 km / 36 km).
  - MODIS / Landsat (NDVI / EVI vegetation indices, 250 m / 30 m).
  - ISRIC SoilGrids v2.0 (pH, organic carbon, clay content, 250 m).
  - FAO EcoCrop (Crop climatic tolerance parameters).
- Detailed metadata: DOI, spatial resolution, temporal resolution, and processing pipeline notes.

### A4. Data Quality & Gated ML Evaluation
- Cleaning pipeline audit: missing value nullification (-999.0 sentinels), range validation, duplicate handling.
- Gated ML evaluation tracks:
  1. Track 1: Root-Zone Soil Wetness (Nowcasting).
  2. Track 2: Vegetation Anomaly Detection (NDVI trend deviations).
  3. Track 3: Yield Feasibility Classification (Multi-factor classification).
- Evaluation methodology: 28-day window with 5-day availability lag, 7-day targets, and purged chronological train/test splits.
- Strict release gate: All three tracks are currently marked `experimental` / `blocked` and strictly excluded from farmer recommendations until validated against representative ground truth.

Farmer Mode answers “What should I consider?” Analyst Mode answers “Where did this information come from, and how reliable is it?”

---

# 4. AI Agents: The Choreographed Specialist Family

Rather than a generic chatbot or single undifferentiated character, Garvesty utilizes an original visual family with three distinct role variants—**Field Scout**, **Water Analyst**, and **Crop Planner**—using consistent proportions and restrained green/white styling (`#BCEB86`, `#111C15`, `#203023`).

## 4.1 Specialist Roles

1. **Field Scout (Geospatial & Boundary Verification):**
   - Active on field selection and boundary drawing (F1, F2).
   - Validates geometry, computes planar polygon area, verifies coordinates against regional coverage boundaries, and inspects local topology.
2. **Water Analyst (Hydrology & Moisture Modeling):**
   - Active during environmental evidence analysis (F3) and scenario stress-testing (F5).
   - Reads NASA POWER rainfall, GPM precipitation, and root-zone wetness profiles; models dry-season desaturation curves and drainage penalties.
3. **Crop Planner (Agronomy & Rotation Synthesis):**
   - Active during crop rotation ranking (F4) and seasonal report assembly (F6).
   - Evaluates multi-season crop sequences, applies legume credits, checks pest-break intervals, and balances farmer priorities.

## 4.2 Agent Movement & Choreography
- **Physical Anchor:** Movement is tied directly to geographic coordinates on the Leaflet canvas; positions remain exact during zoom and pan operations.
- **Centroid Travel:** The agent travels smoothly from a reference origin to the interior centroid of the target polygon (including concave polygons).
- **Physics-Informed Motion:** Features anticipation wind-up, travel acceleration, and squash & stretch landing physics.
- **Decoupled Processing:** Visual animation serves as an intuitive progress indicator but is strictly decoupled from asynchronous backend API execution.
- **Accessibility & Reduced Motion:** Users can skip travel animations via an instant-completion toggle; CSS `@media (prefers-reduced-motion: reduce)` bypasses spatial travel and presents completed states immediately.

When a user selects a field:

1. **Locate field** — resolve the field ID, geometry, centroid, and area.
2. **Retrieve environmental data** — request available weather, rainfall, soil, and vegetation observations.
3. **Check data quality** — inspect missing values, dates, units, resolution, and source status.
4. **Build field profile** — assemble a structured environmental profile.
5. **Evaluate crop plans** — call the deterministic rotation engine.
6. **Run requested scenario** — modify only the selected assumptions and recalculate.
7. **Explain results** — summarize evidence, reasons, uncertainty, and local checks.
8. **Generate report** — return structured results for the UI to display or export.

## 4.2 Agent event log

The UI may show a visible simulation-style sequence:

- `Field selected`
- `Field geometry resolved`
- `Retrieving NASA POWER data`
- `Loading cached satellite observations`
- `Checking data quality`
- `Building field profile`
- `Evaluating crop rotations`
- `Scenario recalculated`
- `Decision report ready`

The agent avatar may animate from a village or advisory-office marker to the selected field. This is a visual metaphor for the analysis workflow. It must not imply that a physical robot or satellite is travelling to the field.

## 4.3 Agent tools

The agent should call narrowly defined backend tools rather than having unrestricted access to the database.

| Tool | Purpose |
|---|---|
| `get_field(field_id)` | Return field geometry and metadata |
| `get_environment_profile(field_id)` | Return available environmental indicators |
| `get_timeseries(field_id, variable, period)` | Return a sourced time series |
| `check_data_quality(field_id)` | Return quality and provenance information |
| `compare_rotations(field_id, priorities)` | Run the deterministic crop-plan engine |
| `simulate_scenario(field_id, assumptions, priorities)` | Recalculate under changed assumptions |
| `generate_decision_report(field_id, result_id)` | Create the report data |

The backend owns calculations. The LLM may choose tools, summarize results, and answer questions using returned evidence. It must not fabricate values or silently substitute demo data for real data.

## 4.4 Example agent response

> “For this field, the available rainfall data indicates a relatively dry November–April period. Rice followed by rice may require irrigation. Mung bean and black gram are alternatives worth comparing, but the recommendation depends on field drainage, soil conditions, salinity exposure, and local planting advice. The soil-moisture observation is not a direct measurement of this individual field.”

---

# 5. Data sources and evidence policy

The project must distinguish NASA sources from non-NASA supporting sources. It must also distinguish currently available data from proposed integrations.

## 5.1 Core sources

| Source | Variables / purpose | Role | Status in project direction |
|---|---|---|---|
| NASA GPM IMERG | Precipitation | Rainfall analysis | Real daily data verified for Twante baseline; Bogale, Hinthada, and Myaungmya planned expansion |
| NASA POWER | Temperature and other meteorological / agroclimatology variables | Weather context and time series | Real daily data verified for Twante baseline; Bogale, Hinthada, and Myaungmya planned expansion |
| SRTM | Elevation | Terrain and low-lying-area context | Planned; not yet integrated in the latest overview |
| NASA SMAP | Soil moisture | Regional soil-water context | Planned; requires data access and processing |
| MODIS NDVI / EVI | Vegetation condition | Vegetation trend and pre-harvest context | Proposed integration |
| ECOSTRESS | Evapotranspiration / evaporative stress | Advanced plant-water-stress context | Optional future integration |
| NASA GIBS | Satellite imagery tiles | Map visualization | Optional map layer |

## 5.2 Supporting non-NASA sources

| Source | Purpose | Notes |
|---|---|---|
| ISRIC SoilGrids | Soil pH, organic carbon, texture and related properties | Clearly identify as non-NASA |
| FAO EcoCrop / agronomy references | Crop climate requirements and crop characteristics | Verify crop-specific values before using |
| Local agricultural research and extension guidance | Myanmar crop calendars, practices, risks | Needed for local validation |
| Farmer-entered information | Irrigation access, crop history, prices, priorities | Label as user-provided, not remotely sensed |

## 5.3 Important spatial-resolution rule

Satellite and gridded datasets do not necessarily measure conditions at an individual field.

For every environmental value, store and display:

- Dataset name and product.
- Spatial resolution or grid size.
- Temporal resolution.
- Observation / aggregation period.
- Retrieval or processing date.
- Whether the value is field-level, grid-cell-level, or a nearby reference.

For example, SMAP soil moisture has a much coarser footprint than a small farm field. Do not describe a coarse grid-cell value as an exact field measurement.

## 5.4 Data status labels

Use consistent labels throughout the application:

- **LIVE:** Retrieved from the source during the current session.
- **CACHED:** Previously retrieved real data stored locally.
- **DEMO:** Illustrative or manually created sample data.
- **UNAVAILABLE:** No usable data is available.
- **USER-INPUT:** Supplied by the farmer or adviser.

Never display DEMO data as LIVE or CACHED.

## 5.5 Data quality pipeline

Recommended processing sequence:

1. Download or retrieve source data.
2. Preserve the original raw file.
3. Parse metadata, units, timestamps, and coordinates.
4. Convert units only through documented transformations.
5. Apply source-specific quality flags and masks.
6. Check valid ranges and missing values.
7. Detect duplicates and unexpected time gaps.
8. Aggregate to the required time window.
9. Link the result to its field or reference grid cell.
10. Save processed data and a cleaning report.
11. Expose provenance metadata through the API.

Keep raw data immutable. Processed files should be reproducible from the raw source and documented pipeline.

---

# 6. Digital field data model

A field record should not be just a polygon on a map. It should link geometry, user-provided context, observations, and analysis results.

## 6.1 Core entities

### Field

- `id`
- `name`
- `geometry`
- `area_acres`
- `centroid_lat`
- `centroid_lon`
- `township`
- `created_at`
- `data_status`

### Field profile

- `field_id`
- `profile_date`
- `rainfall_summary`
- `temperature_summary`
- `soil_moisture_summary`
- `vegetation_summary`
- `soil_properties`
- `irrigation_availability`
- `drainage_condition`
- `limitations`

### Observation

- `id`
- `field_id` or `grid_cell_id`
- `dataset`
- `product`
- `variable`
- `value`
- `unit`
- `observed_at`
- `spatial_resolution`
- `temporal_resolution`
- `retrieved_at`
- `status`
- `quality_flag`

### Crop history

- `field_id`
- `season`
- `crop`
- `source` (farmer input / demo / verified record)
- `confidence`

### Scenario

- `id`
- `field_id`
- `assumptions`
- `farmer_priorities`
- `created_at`
- `engine_version`

### Recommendation result

- `id`
- `field_id`
- `scenario_id`
- `rotation`
- `score_components`
- `reasons_for`
- `reasons_against`
- `evidence_refs`
- `unknowns`
- `local_checks`
- `engine_version`

---

# 7. Crop rotation and scenario engine

## 7.1 Start with a transparent rules engine

Do not begin with machine learning unless a suitable, representative Myanmar training dataset and validation process exist.

A deterministic, explainable rules engine is more appropriate for the first version because:

- The team can inspect every rule.
- Agronomic assumptions can be reviewed by an expert.
- Each recommendation can show reasons for and against.
- The result is reproducible.
- It avoids pretending that a small demo dataset can train a reliable crop model.

## 7.2 Initial Delta crop plans

At minimum compare:

1. Rice → Rice (baseline).
2. Rice → Mung bean.
3. Rice → Black gram.

The crop table should record, with references and verification status:

- Crop family.
- Growing duration.
- Planting window.
- Water requirement category.
- Temperature and rainfall tolerance.
- Soil and drainage considerations.
- Known local risks.

Do not hard-code unverified crop thresholds or claim a crop is suitable solely because it is a legume.

## 7.3 Candidate assessment dimensions

The first rules engine may assess:

- **Season fit:** Does the crop fit the available growing window?
- **Water fit:** Does expected rainfall, residual soil moisture, and irrigation access support the crop?
- **Soil fit:** Are available soil properties within documented crop tolerance ranges?
- **Drainage / terrain:** Are there known low-lying or poorly drained conditions?
- **Rotation diversity:** Does the sequence avoid repeated crop-family patterns where relevant?
- **Soil-health considerations:** Is there a documented agronomic reason to consider a legume or fallow?
- **Farmer priorities:** Does the farmer prioritize income, soil health, or water saving?

Each rule must have a source or be explicitly labelled as an assumption requiring expert review.

## 7.4 Farmer priorities

Provide three adjustable priorities:

- Income.
- Soil health.
- Water saving.

The weights must sum to 100%. Income calculations must use farmer-entered prices and documented costs. If those values are not supplied, do not invent profit estimates; show income as “not calculated” or use a qualitative comparison with a clear caveat.

## 7.5 Scenario simulation

A scenario modifies input assumptions and reruns the same assessment engine.

Example:

```json
{
  "rainfall_change_percent": -20,
  "planting_delay_days": 14,
  "irrigation": "unavailable",
  "drainage": "unknown"
}
```

The engine should return:

- Original result.
- Scenario result.
- Which assumptions changed.
- Which crop-plan scores or categories changed.
- Why they changed.
- Which data is still missing.

Do not present the result as a climate forecast, yield prediction, or guaranteed outcome.

---

# 8. Pre-harvest intelligence (later phase)

The broader digital-twin vision can extend beyond “what to plant next” to “what should I consider before harvesting?”

Potential inputs include:

- Vegetation-index trends (for example, MODIS NDVI).
- Recent rainfall.
- Weather and humidity context.
- Soil-moisture context.
- Evaporative-stress indicators, if integrated and validated.

Potential outputs:

- A possible harvest-planning window.
- Wet-weather or drying-condition warnings.
- A checklist of issues to discuss with an agricultural adviser.

This should be a later module. Historical averages must never be labelled as a weather forecast. Any forecast must come from a clearly identified forecast source and show its issue date and forecast period.

---

# 9. Technical architecture

## 9.1 Recommended stack

| Layer | Technology | Responsibility |
|---|---|---|
| Frontend | React + TypeScript + Vite | Farmer and Analyst interfaces |
| Map | Leaflet | Field polygons, map layers, agent animation |
| Backend | Python + FastAPI | API, orchestration, data access |
| Validation | Pydantic | Request and response schemas |
| Analysis | Python modules / deterministic rules | Crop rotation and scenario calculations |
| Data processing | Python, pandas / DuckDB as needed | Cleaning and aggregation |
| Local persistence | SQLite for MVP | Fields, profiles, scenarios, results |
| Analytical files | CSV / Parquet | Cached time-series and processed datasets |
| Offline support | PWA service worker + IndexedDB | Cached app shell and selected data |
| AI layer | Tool-calling LLM (optional in MVP) | Tool orchestration and plain-language explanation |

Avoid introducing a complex distributed architecture for the first prototype. One frontend and one FastAPI service are sufficient.

## 9.2 High-level architecture

```text
                 FARMER MODE / ANALYST MODE
                         React + TS
                              |
                         REST / JSON
                              |
                         FastAPI API
              ________________|________________
             |                |                |
        Field service     Agent service    Report service
             |                |
       Field profile      Tool orchestration
             |                |
       Data services      Analysis engine
             |                |
     _________________________|________________
    |              |             |             |
 NASA data     Soil sources   Crop rules   Scenario inputs
    |              |             |             |
    _______________|_____________|_____________|
                              |
                     Provenance + cache
                              |
                   SQLite / CSV / Parquet
```

## 9.3 Suggested backend structure

```text
backend/
  app/
    main.py
    api/
      fields.py
      environment.py
      plans.py
      scenarios.py
      agent.py
      reports.py
    schemas/
      field.py
      environment.py
      plan.py
      scenario.py
    services/
      field_service.py
      data_service.py
      provenance_service.py
      cache_service.py
    data_sources/
      nasa_power.py
      gpm_imerg.py
      smap.py
      modis.py
      soilgrids.py
    engine/
      rotation.py
      scoring.py
      scenarios.py
      preharvest.py
    agent/
      orchestrator.py
      tools.py
      prompts.py
    data/
      raw/
      processed/
      cache/
    tests/
```

## 9.4 Suggested frontend structure

```text
frontend/
  src/
    app/
    components/
      map/
      field/
      agent/
      charts/
      provenance/
      plans/
      scenarios/
    pages/
      farmer/
      analyst/
    services/
      api.ts
    hooks/
    i18n/
      en.json
      my.json
    types/
```

---

# 10. API design

Suggested MVP endpoints:

| Method | Endpoint | Purpose |
|---|---|---|
| `GET` | `/api/health` | Service health |
| `GET` | `/api/fields` | List demo or registered fields |
| `GET` | `/api/fields/{field_id}` | Field geometry and metadata |
| `GET` | `/api/fields/{field_id}/environment` | Environmental profile |
| `GET` | `/api/fields/{field_id}/timeseries` | Environmental time series |
| `GET` | `/api/fields/{field_id}/provenance` | Sources, dates, resolutions, status |
| `POST` | `/api/fields/{field_id}/plans` | Compare crop rotations |
| `POST` | `/api/fields/{field_id}/scenarios` | Run a what-if scenario |
| `GET` | `/api/scenarios/{scenario_id}` | Retrieve scenario result |
| `POST` | `/api/agent/analyse` | Start an analysis workflow |
| `GET` | `/api/reports/{result_id}` | Retrieve decision report |

Use typed Pydantic schemas. Return structured reasons and evidence references rather than only a paragraph generated by an LLM.

---

# 11. Offline-first design

The target user may have unreliable internet access. The application should remain useful after its initial load.

MVP offline requirements:

- Cache the application shell.
- Store selected demo-field profiles and processed data locally.
- Cache the last successful analysis result.
- Show when information was last updated.
- Clearly distinguish cached data from current live data.
- Do not show stale data as real-time data.
- Allow the user to review a previously generated decision report offline.

Map tiles may not be available offline unless they have been legally and technically prepared for caching. If tiles are unavailable, retain field outlines and a simple fallback map.

---

# 12. Interface and language requirements

- Burmese-first farmer experience, with an English language option.
- Use familiar local units such as acres where appropriate.
- Keep farmer-facing explanations short and concrete.
- Put technical metadata in Analyst Mode or expandable evidence sections.
- Use green / amber / red categories only when the underlying rules justify them.
- Always show why a plan received its category.
- Make uncertainty and missing data visible.
- Support mobile screens and low-bandwidth use.

Do not rely on colour alone; include text labels and icons for accessibility.

---

# 13. MVP scope and development priorities

The full vision is too large to implement at once. Build a complete, trustworthy vertical slice before adding advanced features.

## Phase 1 — Working digital field (MVP)

**Goal:** Select a field and see a credible, sourced environmental profile.

- Map of the Ayeyarwady Delta.
- A small set of clearly labelled demo fields.
- Field boundary and approximate area.
- NASA POWER and GPM IMERG data verified for Twante baseline (Bogale, Hinthada, and Myaungmya planned expansion).
- Field profile with source, date, resolution, and status.
- Data provenance panel.
- Basic responsive layout.

**Definition of done:** A user selects a field and can inspect its profile without the application inventing field-level precision.

## Phase 2 — Explainable crop comparison

- Crop information table with references.
- Baseline rice → rice plan.
- Rice → mung bean plan.
- Rice → black gram plan.
- Deterministic scoring / suitability rules.
- Reasons for and against each plan.
- Missing information and local validation checklist.

**Definition of done:** The user can compare at least three plans and understand why they differ.

## Phase 3 — Agent workflow

- Agent tool orchestration.
- Visible event log.
- Analysis progress states.
- Plain-language explanation grounded in backend results.
- Error handling and retry states.

**Definition of done:** The agent runs the same reproducible analysis workflow and cannot invent missing data.

## Phase 4 — Scenario simulator

- Rainfall-change input.
- Planting-delay input.
- Irrigation availability.
- Drainage assumption.
- Before-and-after comparison.
- Explanation of changed results.

**Definition of done:** Changing a scenario input deterministically recalculates the result and displays the assumptions.

## Phase 5 — Product extensions

Only after the core system works:

- SMAP integration.
- SRTM elevation layer.
- MODIS vegetation trends.
- Pre-harvest intelligence.
- Ground-sensor integration.
- More townships and crops.
- Climate projection exploration.
- More complete offline support.

---

# 14. What not to build first

To protect delivery time and scientific credibility, do not begin with:

- A complex 3D rendering of every farm.
- A custom machine-learning crop model without representative training data.
- Yield or profit prediction without validated models and local input data.
- Nine satellite datasets before the first end-to-end workflow works.
- Live sensor integration before the data model and API are stable.
- A multi-agent architecture.
- A chatbot that can answer freely without evidence.
- A large number of screens that do not support the main farmer decision.

A clear 2D GIS map plus a well-designed field profile and scenario engine is enough to establish the digital-twin foundation.

---

# 15. Reliability, validation, and responsible use

## 15.1 Scientific safeguards

- Do not call a regional or coarse-grid observation a field measurement.
- Do not label historical climatology as a forecast.
- Do not infer yield from rainfall or vegetation index alone.
- Do not invent prices, costs, soil properties, or crop thresholds.
- Do not claim an agronomic rule is validated until a qualified local expert has reviewed it.
- Show the data period and source for every environmental indicator.
- Record the engine version used for each result.

## 15.2 Testing

### Data tests
- Unit conversion tests.
- Missing-data tests.
- Date and time-series continuity checks.
- Valid-range tests.
- Provenance completeness tests.

### Engine tests
- Same input produces same output.
- Scenario changes affect only relevant calculations.
- Weights sum to 100%.
- Missing data produces an uncertainty warning, not a fabricated value.
- Every score change has an explanation.

### Product tests
- Map selection works on mobile and desktop.
- Agent workflow handles errors and cancellation.
- Offline mode shows cached status.
- Burmese text is reviewed by a native speaker.
- Crop guidance is reviewed by a local agricultural expert.

---

# 16. Demo narrative

A concise demonstration should tell one coherent story:

1. Open the Ayeyarwady Delta map.
2. Select a sample field.
3. Show the agent workflow and event log.
4. Open the field's environmental profile and point out NASA data sources.
5. Compare rice → rice, rice → mung bean, and rice → black gram.
6. Change rainfall or irrigation assumptions.
7. Show how the comparison changes and why.
8. Open the decision report and show the risks and local checks.

Suggested explanation:

> “FieldShift creates a digital environmental profile for a selected farm. It combines NASA Earth-observation data with crop information and farmer priorities. Our analysis agent checks the available evidence, compares crop rotations, and lets farmers explore how different conditions could change their options. We show the reasons, risks, and data limitations so the farmer and local adviser can make a more informed decision.”

---

# 17. Definition of success

The MVP is successful when:

- A user can select a field on a map.
- The system creates a traceable environmental profile.
- At least three crop plans can be compared.
- Every recommendation includes reasons, evidence, uncertainty, and local checks.
- Scenario inputs recalculate results reproducibly.
- The agent explains only what the backend can support.
- The app clearly labels LIVE, CACHED, DEMO, UNAVAILABLE, and USER-INPUT data.
- The core workflow remains usable with cached data when connectivity fails.

The measure of success is not the number of AI features. It is whether a farmer or adviser can understand the evidence and make a better-informed decision.

---

# 18. Open questions to resolve before real-world deployment

1. Which exact townships and field boundaries will be used for the first validated pilot?
2. Which local agricultural expert or extension partner will review crop rules?
3. What crop history can be collected with farmer consent?
4. Which local soil datasets are available and reliable?
5. What spatial resolution is appropriate for each field-level use case?
6. How will farmer-entered prices and costs be kept current?
7. Which Burmese terms and units are most understandable to the intended users?
8. What minimum connectivity and device specifications should the PWA support?

Until these questions are answered, the application should be presented as a prototype decision-support and exploration tool—not a validated agronomic advisory service.

---

# 19. Project status snapshot

| Component | Status based on the supplied project materials |
|---|---|
| NASA POWER daily data for Twante baseline | Verified & active (`LIVE` online, `CACHED` offline) |
| NASA POWER / GPM for Bogale, Hinthada, Myaungmya | Planned expansion |
| Crop fact sheet and deterministic agronomic scoring | Verified & active (10 crops, 8 rules, pure functions) |
| Interactive Leaflet map with custom boundary drawing | Verified & active (freehand vertex placement & area calculation) |
| Complete 10-screen digital-twin application | Verified & active (F1–F6 Farmer, A1–A4 Analyst) |
| Choreographed 3-variant agent family | Verified & active (Field Scout, Water Analyst, Crop Planner) |
| Scenario simulator (what-if projections) | Verified & active (rainfall, delay, irrigation, drainage deltas) |
| Analyst Mode & Data Catalogue | Verified & active (freshness, metadata, cleaning reports) |
| Gated ML Evaluation Tracks | Verified & active (3 tracks, chronological holdouts, fails closed) |
| SMAP & MODIS data ingestion | Pipeline ready (QA flags enforced; Earthdata login required) |
| Agronomic expert validation | Recommended for field deployment |
| Real farm pilot | Planned post-hackathon field trial |

---

# 20. Final product principle

**Build the evidence pipeline first, the decision engine second, and the AI experience third.**

The digital twin should be a trustworthy model of the field's available environmental context. The crop engine should be explainable and reviewable. The AI agent should make the workflow easier to use—not hide uncertainty or manufacture confidence.
