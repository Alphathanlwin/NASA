# FieldShift Digital Twin
## Product Requirements & Technical Build Guide

**Project:** FieldShift Digital Twin (working title)  
**Challenge:** NASA Space Apps Challenge 2026 — “Field Shift: Adapting Farms with NASA Data”  
**Geographic focus:** Myanmar's Ayeyarwady Delta, with the Central Dry Zone as a possible later expansion  
**Document purpose:** A single source of truth for the product concept, MVP scope, architecture, data handling, simulation logic, and implementation priorities.

> **Important status note:** This document describes the digital-twin product direction. It combines the earlier GIS Farm Twin design with the more recent FieldShift Delta overview. It is a build specification, not evidence that every proposed feature or dataset is already implemented. Features and data sources are explicitly labelled as implemented, planned, or optional.

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

## 3.1 Farmer Mode

A simple, Burmese-first experience focused on making a seasonal decision.

### F1. Farm overview

- Greeting and selected farm profile.
- Field selector and map.
- Summary cards for rainfall, soil moisture, and temperature.
- Source and date beside each environmental value.
- Main action: **Analyse this field**.

### F2. Field intelligence

- Selected field boundary and approximate area.
- Satellite or map view.
- Environmental indicators and historical trends.
- Soil information where available.
- Clear labels for unavailable or coarse-resolution data.

### F3. Crop comparison

The core decision screen.

Compare at least three crop plans, including the farmer's current or baseline practice. For the initial Delta prototype, the suggested comparison is:

1. Rice → Rice (baseline; depends heavily on irrigation).
2. Rice → Mung bean.
3. Rice → Black gram.

Each option should show:

- Suitability category or score.
- Why it may fit.
- Why it may not fit.
- Evidence used.
- Missing information.
- Risks that need local checking.

### F4. Scenario simulator

Allow the farmer to change a small number of understandable assumptions:

- Rainfall decreases (for example, −20%).
- Planting is delayed by two weeks.
- Irrigation is available / sometimes available / unavailable.
- Field drainage is good / unknown / poor.

The system recalculates the crop-plan assessment and explains what changed.

**Important:** A scenario is a conditional exploration, not a forecast. The interface must display the assumptions used.

### F5. Seasonal decision report

A concise, printable or shareable report containing:

- Selected field and date.
- Environmental conditions and data sources.
- Compared crop plans.
- Reasons for and against each option.
- Scenario results.
- Risks and local checks.
- A clear statement that the tool is decision support, not a yield forecast.

## 3.2 Analyst Mode (TERRA)

An evidence and data-quality workspace for advisers, analysts, and judges.

### A1. Mission overview

- Selected region and fields.
- Data-source status.
- Latest retrieval dates.
- Summary of available and missing layers.

### A2. Field intelligence

- Field geometry and location.
- Environmental indicators.
- Time-series views.
- Spatial-resolution warnings.

### A3. NASA and external data catalogue

For each source, show:

- Dataset and product name.
- Variable(s) used.
- Spatial and temporal resolution.
- Date range.
- Retrieval date.
- Processing steps.
- Status: LIVE, CACHED, DEMO, or UNAVAILABLE.

### A4. Data quality and provenance

- Missing-value checks.
- Range checks.
- Duplicate checks.
- Quality/cloud masking where relevant.
- Unit conversions and scaling.
- Cleaning summary.
- Source-to-UI traceability.

Farmer Mode answers “What should I consider?” Analyst Mode answers “Where did this information come from, and how reliable is it?”

---

# 4. AI agent: what it actually does

The AI agent is an orchestration and explanation layer over deterministic data and analysis services. It should not invent environmental measurements or independently generate agronomic facts.

## 4.1 Agent workflow

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
| NASA GPM IMERG | Precipitation | Rainfall analysis | Real daily data already collected for four Delta towns in the latest overview |
| NASA POWER | Temperature and other meteorological / agroclimatology variables | Weather context and time series | Real daily data already collected for four towns in the latest overview |
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
- NASA POWER and GPM IMERG data already available for the four reference towns.
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

| Component | Status in this build |
|---|---|
| NASA POWER daily data for four Delta towns | Retrieved and cached; modelled 0.5 x 0.625 degree grid values |
| NASA POWER 30-year day-of-year climatology | Retrieved, cleaned and cached as Parquet; historical means, not a forecast |
| GPM IMERG daily rainfall | Not retrieved (Earthdata login required); labelled UNAVAILABLE |
| SMAP soil moisture | Not retrieved (Earthdata login required); labelled UNAVAILABLE |
| MODIS NDVI | One 250 m pixel per field centre, cached |
| ISRIC SoilGrids topsoil | Cached, 250 m, non-NASA |
| NASA GIBS true-colour layer | Optional map layer, fixed date, native zoom 9 |
| Crop fact sheet with references and verification flags | Available in `backend/app/engine/crops.json` |
| Rice to rice, rice to mung bean, rice to black gram comparison | Implemented and parity-tested in Python and TypeScript |
| Deterministic agent workflow and event log | Implemented (nine steps), scripted, no live LLM |
| Scenario simulator | Implemented with twelve hero scenarios |
| Analyst Mode | Implemented as one Data & Quality screen |
| Static build with offline snapshot | Implemented and tested with the backend stopped |
| Burmese interface | Implemented; native-speaker review still required |
| Agronomic expert validation | Still required; team assumptions are flagged unverified |
| Real farm pilot | Not yet established |

---

# 20. Final product principle

**Build the evidence pipeline first, the decision engine second, and the AI experience third.**

The digital twin should be a trustworthy model of the field's available environmental context. The crop engine should be explainable and reviewable. The AI agent should make the workflow easier to use—not hide uncertainty or manufacture confidence.
