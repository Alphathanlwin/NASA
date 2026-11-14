# Garvesty (FieldShift Delta)
## Master Architecture, Technical Specification & Submission Dossier
**NASA International Space Apps Challenge 2026 — Challenge 07: "Field Shift: Adapting Farms with NASA Data"**  
**Local Event:** Yangon, Myanmar (University of Information Technology — UIT Multi-Purpose Hall)  
**Timeline:** 14–15 November 2026 (Asia/Yangon time)  
**Repository:** `Alphathanlwin/NASA`  
**Current Baseline Commit:** `6132b78` (Main branch)  
**Document Status:** Final, Authoritative Master Specification

---

## 1. Executive Summary & Mission Overview

### 1.1 Project Identity & Heritage
**Garvesty** (documented across development iterations as **FieldShift**, **FieldShift Delta**, and **FieldShift Digital Twin**, with its expert analytics suite named **TERRA**) is an agricultural decision-support system built for the NASA Space Apps Challenge 2026. It addresses the critical seasonal planning challenges faced by smallholder farming communities in the Ayeyarwady (Irrawaddy) Delta of Myanmar.

The platform transforms raw NASA Earth observations, gridded soil datasets, crop physiological parameters, and direct farmer-entered constraints into an explainable, auditable crop rotation evaluation.

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                       GARVESTY CORE MISSION                                      │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│  "To empower Ayeyarwady Delta farmers and agricultural advisers to evaluate post-monsoon crop   │
│   rotations through auditable NASA Earth observation evidence, deterministic agronomic rules,   │
│   and interactive scenario simulations — supporting human judgment without false certainty."     │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 1.2 The Agricultural Reality of the Ayeyarwady Delta
The Ayeyarwady Delta is Myanmar's primary rice-producing region ("the Rice Bowl of Myanmar"). The farming calendar is governed by a distinct tropical monsoon climate divided into two primary agricultural slots:
1. **Monsoon Season (May/June – October/November, ~184 days):** Abundant precipitation (2,000–3,000 mm), widespread waterlogging, and continuous flooded paddy cultivation (*Monsoon Rice*).
2. **Dry Season (November – April, ~181 days):** Rapid cessation of rains (climatological average <150 mm total over 6 months), escalating temperatures (daily maxima exceeding 36–38°C in March–April), high evapotranspiration, and depletion of surface water.

#### The Critical Post-Monsoon Dilemma
Following the October/November monsoon rice harvest, delta farmers face a pivotal decision regarding dry-season field utilization:
* **The Traditional High-Risk Default (Summer Rice):** Cultivating a second cycle of flooded paddy (*Summer Rice*). This demands massive irrigation (1,200–1,500 mm water equivalent via diesel pumps from tidal creeks or canals), incurs exorbitant fuel and electricity costs, perpetuates rice-specific stem borer (*Scirpophaga incertulas*) and bacterial leaf blight (*Xanthomonas oryzae*) cycles, and carries catastrophic crop loss risks in lower delta townships (e.g., Twante, Kawhmu, Kungyangon) where dry-season river discharge drops and saline water intrudes inland from the Andaman Sea.
* **The Legume Alternative (Black Gram & Green Gram):** Rotating into pulses such as Black Gram (*Vigna mungo*, locally *matpe*) or Green Gram (*Vigna radiata*, mung bean). Pulses thrive on **residual soil moisture** stored in heavy clay soils during the monsoon, cut irrigation requirements by ~80%, fix atmospheric nitrogen (+15 to +30 kg N/ha equivalent for the succeeding monsoon crop), break cereal pest vectors, and provide high-value export cash income.
* **Agronomic Hazards:** Pulse establishment is extremely sensitive:
  * *Delayed sowing* leads to terminal drought as the topsoil desaturates.
  * *Poor field drainage* causes root rot from unexpelled monsoon water.
  * *Unmonitored soil salinity* severely suppresses legume nodulation and seed set.

### 1.3 Core Engineering Philosophy & Scientific Guardrails
Garvesty is designed around strict scientific integrity and defensive engineering:
1. **Decision Support, Not Yield or Profit Prediction:** The platform scores relative agronomic suitability (0–100) under transparent, documented rules. It explicitly rejects black-box yield forecasting, unvalidated crop survival probabilities, or speculative profit projections.
2. **Ground Truth & Provenance Transparency:** Every data point displayed carries its spatial resolution, temporal latency, measurement date, and origin. All data layers are explicitly badged (`LIVE`, `CACHED`, `DEMO`, or `NOT_CONNECTED`).
3. **Deterministic Core with Sourced Explanations:** Core recommendations are governed by deterministic agronomic logic (`backend/app/engine/`). Machine learning models and Large Language Models are confined to gated experimental tracks and plain-language synthesis with stable citations.
4. **Offline Resilience:** Because rural delta connectivity is intermittent, the platform adheres to an offline-first contract. Farm profiles, custom drawings, cached satellite snapshots, and generated seasonal reports function without an active internet connection.

---

## 2. Complete 10-Screen Architecture

Garvesty provides a unified system divided into two specialized operating modes: **Farmer Mode** (6 high-contrast, accessible screens for farmers and local extension agents) and **Analyst Mode / TERRA** (4 telemetry, footprint, and validation screens for agronomists, regional planners, and challenge evaluators).

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                               GARVESTY 10-SCREEN APPLICATION MAP                                 │
├────────────────────────────────────────────────┬─────────────────────────────────────────────────┤
│                  FARMER MODE                   │               ANALYST MODE (TERRA)              │
├────────────────────────────────────────────────┼─────────────────────────────────────────────────┤
│  F1: Farm Overview & Quick Conditions          │  A1: Regional Coverage & Feed Freshness         │
│  F2: My Farm & Boundary Drawing (Geoman)       │  A2: Field Intelligence & Footprint Inspector   │
│  F3: Environmental Telemetry & NASA Evidence   │  A3: NASA & External Data Catalogue             │
│  F4: Multi-Rotation Comparison Matrix          │  A4: Data Quality Pipeline & Model Benchmarks   │
│  F5: Scenario Simulator ("What-If" Engine)     │                                                 │
│  F6: Seasonal Decision Report (Export/Print)   │                                                 │
└────────────────────────────────────────────────┴─────────────────────────────────────────────────┘
```

### 2.1 Farmer Mode (Screens F1 – F6)

#### F1: Farm Overview & Quick Conditions
* **Purpose:** Initial operational landing screen. Enables rapid field selection, summarizes macro-environmental conditions, and allows resuming saved offline profiles.
* **UI Components:**
  * Interactive Township Map viewport centered on the Ayeyarwady Delta (default coordinates: Twante, 16.735°N, 95.955°E).
  * Field Quick-Selector: Carousel/dropdown containing predefined demo fields (F-01 through F-06) and any user-saved local fields.
  * Environmental Glance Cards:
    * *Precipitation (7-Day & 30-Day Sums):* Displays observed precipitation vs. 25-year monthly climatology average.
    * *Root-Zone Soil Wetness (`GWETROOT`):* 0.0 to 1.0 index from NASA POWER, with 7-day delta indicator.
    * *Temperature Envelope:* Current daily mean, minimum, and maximum (°C).
  * Provenance & Freshness Badges: Explicit tags indicating observation date and caching state.
  * Primary Action: **"Analyse Field"** (triggers agent workflow animation and state resolution).

#### F2: My Farm & Boundary Drawing
* **Purpose:** Custom field delineation, point annotation, and farm management parameter capture.
* **Drawing & Geometry Features:**
  * Integrated **Leaflet-Geoman** editing controls: Polygon creation, rectangle creation, vertex editing, drag mode, vertex deletion, and undo/redo actions.
  * Real-time client-side geometry sanitization and server-side validation against RFC 7946 GeoJSON.
  * Automatic geodetic area calculation displaying both hectares (ha) and Myanmar acres (`1 ha = 2.47105 acres`).
* **Field Attribute Capture:**
  * *Field Name & Identifier:* User-defined custom label.
  * *Previous Crop History:* Monitored predecessor crop (Monsoon Rice, Pulses, Fallow).
  * *Irrigation Access:* Explicit tri-state selector: `available` (reliable canal/pump water), `unavailable` (purely rain-fed/residual), or `unknown`.
  * *Drainage Condition:* Tri-state selector: `good` (rapid gravity drainage), `poor` (low-lying, prone to waterlogging), or `unknown`.
  * *Point Annotations:* Click-to-add spatial markers for local field anomalies (e.g., "Saline patch", "Broken bund", "Irrigation inlet").
* **State Contract:** Editing any field boundary or management attribute immediately invalidates previous calculation results, marking downstream screens as requiring recalculation.

#### F3: Environmental Telemetry & NASA Evidence
* **Purpose:** Exhaustive inspection of the Earth observation parameters and soil properties underpinning the field profile.
* **Evidence Panels:**
  * *NASA POWER Daily Agroclimatology:* Daily timeseries and 7d/30d aggregations of `PRECTOTCORR` (corrected precipitation), `T2M` (temperature at 2m), `T2M_MAX`, `T2M_MIN`, `RH2M` (relative humidity), `WS2M` (wind speed), and `ALLSKY_SFC_SW_DWN` (solar insolation).
  * *Root-Zone Hydrology:* Modeled root-zone wetness (`GWETROOT`) and surface wetness (`GWETTOP`), benchmarked against historical climatological percentiles.
  * *ISRIC SoilGrids v2.0 Topsoil Analysis (0–5 cm):* Soil pH in H2O, clay fraction (%), silt fraction (%), sand fraction (%), Soil Organic Carbon (SOC in dg/kg), and Cation Exchange Capacity (CEC in mmol(c)/kg).
  * *Satellite Imagery Context:* Dual-layer basemap switch between standard cartographic map and NASA GIBS VIIRS True-Colour daily reflectance.
  * *Resolution Disclosures:* Prominent callouts indicating spatial footprint (e.g., "NASA POWER weather grid: 0.5° × 0.625° (~55 km × 69 km); ISRIC SoilGrids: 250 m").

#### F4: Multi-Rotation Comparison Matrix
* **Purpose:** The core decision-making screen. Displays scored, ranked rotation candidates side-by-side with the farmer's current baseline.
* **Mandatory Comparison Set (Minimum 4 Candidates):**
  1. *Baseline / Existing Rotation:* e.g., Monsoon Rice → Summer Rice.
  2. *Alternative 1 (Primary Pulse):* Monsoon Rice → Black Gram (*Vigna mungo*).
  3. *Alternative 2 (Secondary Pulse):* Monsoon Rice → Green Gram (*Vigna radiata*).
  4. *Alternative 3 (Diversified/Fallow):* Monsoon Rice → Groundnut / Sesame / Fallow.
* **Structured Evaluation Breakdown (Per Plan):**
  * *Overall Suitability Score (0–100):* Weighted aggregation of Income, Soil Health, and Water Saving.
  * *Eligibility State:* `eligible` (scored) or `unsuitable` (violates a hard constraint, score rendered as `null`).
  * *Why It Scores Well:* Plain-language agronomic merits (e.g., legume nitrogen fixation credit, pest cycle disruption, high dry-season water-saving score).
  * *What Counts Against It:* Plain-language trade-offs and penalties (e.g., continuous paddy pest risk, extreme irrigation dependency, thermal stress).
  * *Supporting Evidence:* Sourced parameters utilized in the evaluation.
  * *Information Gaps:* Missing observations (e.g., local salinity level, unverified drainage).
  * *Mandatory Local Checks:* Explicit field checks the farmer must verify on the ground (e.g., "Check how long topsoil retains moisture post-harvest; verify seed germination rate").
* **Interactive Control Sliders:**
  * Dynamic priority weighting sliders for **Income** (default 40%), **Soil Health** (default 30%), and **Water Saving** (default 30%). Adjusting sliders re-normalizes weights and re-ranks plans instantaneously in client memory.

#### F5: Scenario Simulator ("What-If" Engine)
* **Purpose:** Stress-testing crop rotations against environmental shocks and operational disruptions.
* **Configurable Simulation Parameters:**
  * *Rainfall Anomaly:* Percentage slider from -50% to +50% against historical reference.
  * *Planting Delay:* Step slider from 0 to 30 days (evaluating terminal drought risk).
  * *Irrigation Disruption:* Toggle between `available`, `unavailable`, and `unknown`.
  * *Drainage Disruption:* Toggle between `good`, `poor`, and `unknown`.
* **Execution & Feedback:**
  * Executes through the exact same deterministic rules engine as F4.
  * Displays delta comparisons: Highlights shifts in suitability scores, rank changes, and newly triggered hard-rule disqualifications.
  * Explicit Assumption Audit: States clearly: *"Simulated rainfall changes do not predict soil moisture dynamics; planting delays assume standard phenological windows."*

#### F6: Seasonal Decision Report
* **Purpose:** Generates a clean, exportable, offline-verifiable summary document for farmers, extension officers, or microfinance credit assessments.
* **Report Sections:**
  * Field profile, geodetic boundaries, and calculated acreage.
  * Recorded farm management inputs and drainage status.
  * Observed environmental indicators, dataset dates, and provenance badges.
  * Full ranked rotation comparison matrix with score breakdowns.
  * Active scenario simulation results and sensitivity findings.
  * Checklist of mandatory local field verifications.
  * Scientific disclaimer: *"Garvesty is a decision-support advisory tool, not a crop yield or revenue guarantee."*
* **Export Capabilities:** CSS print stylesheet formatted for A4/Letter printing, and client-side JSON export for offline persistence.

---

### 2.2 Analyst Mode / TERRA (Screens A1 – A4)

#### A1: Regional Coverage & Feed Freshness
* **Purpose:** Macro-level monitoring of dataset ingestion, spatial coverage boundaries, and telemetry health.
* **Features:**
  * Geographic boundary display showing active support zones (Twante, Kawhmu, Kungyangon, Maubin).
  * Service health metrics from `/api/health` and `/api/datasets/status`.
  * Freshness timestamps, latency indicators, and cache status across all integrated providers.

#### A2: Field Intelligence & Footprint Inspector
* **Purpose:** Spatial footprint auditing to visualize the discrepancy between satellite pixel scale and plot-level farm boundaries.
* **Footprint Overlay Visualizer:**
  * Draws the exact spatial bounding box of the NASA POWER meteorological grid cell (0.5° × 0.625°, ~55 km × 69 km).
  * Overlays the ISRIC SoilGrids 250 m cell.
  * Displays the SMAP 9 km radiometer footprint.
  * Renders the farmer's 1–2 hectare field polygon within these macro cells, eliminating the illusion of hyper-local satellite sensing.
  * Interactive multi-year time series chart for temperature, precipitation, and soil moisture trajectories.

#### A3: NASA & External Data Catalogue
* **Purpose:** Authoritative reference registry for all integrated, prepared, and partner data sources.
* **Data Fields Provided per Source:**
  * Product Title, Short Name, and Version (e.g., `NASA POWER Daily API v2.0`).
  * Source Organization (NASA LaRC, ISRIC, FAO, NASA LP DAAC).
  * Spatial and Temporal Resolution.
  * Parameter Identifiers and Physical Units.
  * Acquisition Latency and Refresh Cycle.
  * Access Protocol (Public REST, Authenticated CMR/AppEEARS).
  * Formal DOI and Official Documentation Citations.

#### A4: Data Quality Pipeline & Model Benchmarks
* **Purpose:** Auditing data cleaning metrics and evaluating machine learning experiments against strict validation gates.
* **Pipeline Telemetry:**
  * Displays `cleaning_report.json`: Rows ingested, missing days nulled, fill values replaced, and out-of-range rejections.
  * SHA-256 cryptographic verification hashes for raw data responses.
* **Model Validation Gates:**
  * Tracks progress across the three experimental ML initiatives: **Regional Root-Zone Wetness**, **Vegetation Anomaly Detection**, and **Yield Feasibility**.
  * Shows benchmark evaluations (Persistence, Seasonal Climatology vs. ML) and confirms whether model outputs are permitted into user recommendations.

---

## 3. Design Laws, UI Specifications & Aesthetic Foundations

### 3.1 Design System & Color Tokens
The Garvesty user interface is built on a restrained, editorial aesthetic designed for maximum legibility in high-glare tropical outdoor conditions. Hardcoded hexadecimal colors in UI components are strictly prohibited; all styles reference centralized CSS tokens in `frontend/src/tokens.css`.

```css
/* Core Design Tokens — frontend/src/tokens.css */
:root {
  /* Spatial Spacing Scale */
  --s1: 4px; --s2: 8px; --s3: 12px; --s4: 16px; --s5: 24px; --s6: 32px;
  
  /* Corner Radii */
  --r1: 4px; --r2: 8px; --r3: 12px; --r4: 16px;
  
  /* Type Scale */
  --t-xs: 0.72rem; --t-sm: 0.8rem; --t-md: 0.9rem; --t-lg: 1.125rem; --t-xl: 1.4rem; --t-2xl: 1.75rem;

  /* Primary Surfaces & Brand Chrome */
  --sidebar-chrome: #111C15;    /* Confirmed Figma deep pine black-green */
  --card-surface:   #FFFFFF;    /* Pure white primary content surfaces */
  --canvas-bg:      #F6F1E4;    /* Warm cream muted page background */
  --ink-primary:    #1D2A22;    /* High-contrast deep slate text */
  --ink-muted:      #5F6F65;    /* Secondary text / annotations */
  --border-line:    #E2DCCB;    /* Subtle divider line token */

  /* Semantic Agricultural Accents */
  --accent:         #2E7D4F;    /* Field green primary action */
  --accent-soft:    #E3F1E7;    /* Subtle green container fill */
  --warn:           #C2410C;    /* Hazard / penalty amber */
  --warn-soft:      #FDEEDE;    /* Soft amber warning background */

  /* Provenance Badges */
  --live:     #15803D; --live-bg:     #DCFCE7;  /* Fresh verified live read */
  --cached:   #1D4ED8; --cached-bg:   #DBEAFE;  /* Stored snapshot */
  --demo:     #A16207; --demo-bg:     #FEF3C7;  /* Illustrative / synthetic */
  --off:      #57534E; --off-bg:      #E7E5E4;  /* Not connected / offline */

  /* Typography Stack */
  --font: system-ui, -apple-system, "Segoe UI", Roboto, "Noto Sans Myanmar", sans-serif;
}
```

### 3.2 Typography & Tabular Numerals
* **Font Family:** Prioritizes system font stacks with seamless fallback to `Noto Sans Myanmar` and `Padauk` for Burmese Unicode rendering.
* **Tabular Numerals Rule:** All numbers, dates, timeseries entries, GPS coordinates, areas, and score breakdowns must enforce:
  ```css
  font-variant-numeric: tabular-nums;
  ```
  This eliminates visual jitter during slider interactions and ensures perfect column alignment across financial and agronomic matrices.

### 3.3 Provenance Badges System
Every environmental indicator and recommendation block must render an immutable provenance badge:
* `LIVE`: Data fetched directly from an upstream API within the active caching window (<10 minutes old).
* `CACHED`: Data loaded from verified local storage or repository parquet/JSON snapshots.
* `DEMO`: Illustrative geometry, demo crop history, or default township parameters.
* `NOT_CONNECTED`: Feature prepared in code but awaiting active API credentials or Earthdata authentication.

### 3.4 Agent Animation & Motion Design
Garvesty introduces an animated **Software Agent** metaphor to represent backend computational analysis. 

#### Agent Character Roles
1. **Field Scout:** Specializes in boundary verification, crop history checks, and spatial layout.
2. **Water Analyst:** Specializes in root-zone hydrology, precipitation windows, and irrigation budgets.
3. **Crop Planner:** Specializes in rotation ranking, pest break scoring, and scenario evaluation.

#### 5 Lifecycle Agent States
* `idle`: Stationed at regional base station / township hub.
* `travelling`: Lerped along a geodesic path across the Leaflet map toward the field's internal centroid.
* `working`: Pulsing radar / scanning animation on the field polygon, accompanied by a simulated step-by-step event log.
* `complete`: Settled state displaying a checkmark and immediately revealing analytical results.
* `error`: Alert badge indicating network or geometry failure.

#### Motion Principles & Accessibility
* **Staged Focus:** Camera pans smoothly to the selected polygon using Leaflet `flyToBounds` before the agent arrives.
* **Squash and Stretch:** Subtle sprite deformation on movement departure and arrival.
* **Skip & Reduced Motion Contract:** Users can click **"Skip"** at any time to bypass animation. Furthermore, if `window.matchMedia('(prefers-reduced-motion: reduce)')` is active, the agent animation is disabled entirely, and results render immediately.
* **Metaphor Integrity:** The UI explicitly states: *"The agent journey is an interactive visual simulation of software data retrieval; it does not indicate physical drone inspection or real-time satellite retasking."*

### 3.5 Internationalization & Localization (i18n)
All user-facing strings are abstracted through `frontend/src/i18n.ts`.
* **Dual-Language Dictionary:** English (`en`) and Burmese (`my`).
* **Dynamic Rule Explanations:** Backend agronomy rules return structured identifiers and numerical parameters. The client `t(key, params)` function injects parameters into localized templates, preventing hardcoded English sentences from leaking into Burmese mode.
* **Localized Measurement Units:**
  * Land Area: Automatically displays Hectares (ha) and Myanmar Acres (*pe*).
  * Crop Mass: Supports Kilograms/Tonnes and traditional Myanmar baskets (*tin*) or viss (*peittha*):
    * 1 Basket of Paddy Rice ≈ 20.87 kg (46 lbs).
    * 1 Basket of Black Gram ≈ 32.66 kg (72 lbs).
    * 1 Basket of Green Gram ≈ 31.75 kg (70 lbs).

---

## 4. Backend Engine, Rules & Geometry Validation

### 4.1 Architecture & API Specifications
The backend is built in **Python 3.11+** using **FastAPI** and **Pydantic v2**. The decision engine is implemented as a pure, stateless functional pipeline with zero external database dependencies.

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   FASTAPI ROUTE ARCHITECTURE                                     │
├───────────────────────┬────────┬─────────────────────────────────────────────────────────────────┤
│ Endpoint              │ Method │ Responsibility                                                  │
├───────────────────────┼────────┼─────────────────────────────────────────────────────────────────┤
│ `/api/health`         │ GET    │ Health check, field counts, snapshot timestamp, live POWER ping │
│ `/api/fields`         │ GET    │ GeoJSON FeatureCollection of demo field boundaries              │
│ `/api/crops`          │ GET    │ Supported crop catalogue, phenology, and water classes          │
│ `/api/fields/{id}`    │ GET    │ Sourced field profile with optional live weather override       │
│ `/api/fields/{id}/ts` │ GET    │ Historical time series extraction for specific parameters       │
│ `/api/fields/{id}/plan`│ POST  │ Legacy planner endpoint (preserved for backwards compatibility) │
│ `/api/analysis`       │ POST   │ Unified single analysis endpoint (drawings, scenarios, plans)   │
│ `/api/datasets/status`│ GET    │ Provenance status and data cleaning report ingestion           │
└───────────────────────┴────────┴─────────────────────────────────────────────────────────────────┘
```

### 4.2 Unified Analysis Endpoint Contract (`/api/analysis`)
The unified analysis endpoint accepts either a known `field_id` or custom GeoJSON `geometry`, alongside farm management context, user priorities, and optional scenario assumptions.

#### Request Schema
```json
{
  "field_id": "F-01",
  "geometry": null,
  "field_context": {
    "name": "Kyun Taw Plot 4",
    "crop_history": ["monsoon_rice"],
    "irrigation": "available",
    "drainage": "good",
    "annotations": [{"point": [95.955, 16.735], "note": "Canal inlet"}]
  },
  "priorities": {
    "income": 40.0,
    "soil": 30.0,
    "water": 30.0
  },
  "returns": {
    "monsoon_rice": 800.0,
    "summer_rice": 950.0,
    "black_gram": 350.0,
    "green_gram": 320.0
  },
  "scenario": {
    "rainfall_change_percent": -20.0,
    "planting_delay_days": 14,
    "irrigation": "unavailable",
    "drainage": "poor"
  }
}
```

#### Response Contract
The endpoint returns a unified payload consumed identically across all screens:
1. `analysis_id`: Cryptographic hash identifying the calculation state.
2. `field`: Complete geometry, centroid, calculated area, soil, and weather profile.
3. `baseline`: Scored rotation candidates under verified baseline conditions.
4. `scenario`: Recalculated rotation candidates under simulated assumptions (if provided).
5. `provenance`: Layer-by-layer source, version, and status metadata.
6. `limitations`: Explicit agronomic and data gap warnings.
7. `processing`: Step-by-step pipeline execution milestones for UI event logs.

### 4.3 Geometry Validation Rules
To prevent malformed coordinates, coordinate order inversions, or self-intersecting polygons from causing backend failures, the geometry pipeline enforces strict validation:
* **RFC 7946 Standard:** Coordinate order must strictly follow `[longitude, latitude]`.
* **Topology Checks:**
  * Must be a valid GeoJSON `Polygon`.
  * Exterior ring must be closed (`coordinates[0][0] == coordinates[0][-1]`).
  * Minimum of 4 coordinate pairs (3 distinct vertices + closing vertex).
  * No self-intersecting edges (verified via planar cross-product line segment checks).
  * Coordinate boundaries: Longitude ∈ [-180.0, 180.0], Latitude ∈ [-90.0, 90.0].
  * Bounded vertex count: Maximum 500 vertices per polygon.
* **Geodesic Area Calculation:** Calculated server-side using the spherical excess / Shoelace formula on the WGS84 ellipsoid:
  $$\text{Area} = R^2 \left| \sum_{i=1}^{n} (\lambda_{i+1} - \lambda_{i-1}) \sin(\phi_i) \right|$$
  where $R \approx 6,378,137\text{ m}$, $\lambda$ is longitude in radians, and $\phi$ is latitude in radians.
* **Failure Response:** Any invalid geometry triggers an immediate HTTP `422 Unprocessable Entity` with a descriptive error message.

### 4.4 Deterministic Rules Engine (`crops.py`, `rules.py`, `planner.py`)

#### Supported Crop Catalogue
Garvesty tracks 10 crop classifications tailored to Myanmar agro-ecological zones:

| Crop ID | Name | Botanical Family | Allowed Slots | Duration (Days) | Water Class | Legume | Flooded | Needs Dry Irrig. |
|---|---|---|---|---|---|---|---|---|
| `monsoon_rice` | Monsoon Rice | Poaceae | Monsoon | 90–150 | Very High | No | Yes | No |
| `summer_rice` | Summer Rice | Poaceae | Dry | 90–150 | Very High | No | Yes | Yes |
| `black_gram` | Black Gram (*matpe*) | Fabaceae | Dry | 90–120 | Low | Yes | No | No |
| `green_gram` | Green Gram (*mung bean*) | Fabaceae | Dry, Monsoon | 75–90 | Low | Yes | No | No |
| `chickpea` | Chickpea | Fabaceae | Dry | 90–120 | Low | Yes | No | No |
| `pigeon_pea` | Pigeon Pea | Fabaceae | Monsoon | 200–200 | Low-Medium | Yes | No | No |
| `sesame` | Sesame | Pedaliaceae | Dry, Monsoon | 80–100 | Low | No | No | No |
| `groundnut` | Groundnut | Fabaceae | Dry, Monsoon | 100–120 | Medium | Yes | No | No |
| `maize` | Maize | Poaceae | Dry, Monsoon | 90–120 | Medium | No | No | No |
| `fallow` | Fallow / Green Manure | None | Dry, Monsoon | 0–0 | None | No | No | No |

#### Hard Constraints (Disqualification Rules)
Before scoring, all possible (dry-season crop, monsoon-crop) combinations are evaluated against hard disqualification gates:
1. `rule_season_fit`: Verifies whether the crop is agronomically suited to the seasonal slot and fits within the slot duration window (Monsoon = 184 days; Dry = 181 days). E.g., Pigeon Pea (200 days) is rejected from the monsoon window.
2. `rule_irrigation_required`: Summer Rice requires confirmed, continuous dry-season irrigation. If `ctx.irrigated` is `False` (rain-fed) or `None` (`unknown`), Summer Rice is disqualified.

#### Scored Agronomic Rules
Valid candidate pairs are evaluated across three component dimensions: **Soil Health**, **Water Saving**, and **Income**.

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   AGRONOMIC RULES TAXONOMY                                       │
├──────────────────────────┬───────────┬────────┬──────────────────────────────────────────────────┤
│ Rule Function            │ Dimension │ Points │ Agronomic Logic                                  │
├──────────────────────────┼───────────┼────────┼──────────────────────────────────────────────────┤
│ `rule_legume_credit`     │ Soil      │ +15    │ Dry-season legume credit (nitrogen fixation)     │
│ `rule_legume_credit`     │ Soil      │ +10    │ Monsoon-season legume credit                     │
│ `rule_paddy_cycle`       │ Soil      │ -25    │ Continuous flooded rice monoculture penalty      │
│ `rule_paddy_cycle`       │ Soil      │ +8     │ Rice → pulse documented delta rotation credit    │
│ `rule_pest_break`        │ Soil      │ -20    │ Same crop back-to-back (pest host carryover)     │
│ `rule_pest_break`        │ Soil      │ -12    │ Same botanical family back-to-back               │
│ `rule_pest_break`        │ Soil      │ +8     │ Cross-family rotation (pest interruption)        │
│ `rule_pest_break`        │ Soil      │ +6     │ Fallow season pest break                         │
│ `rule_diversity`         │ Soil      │ +8     │ 3 distinct crop families across the 2-year cycle │
│ `rule_diversity`         │ Soil      │ -5     │ Monoculture family across entire cycle           │
│ `rule_soil_fit` (pH)     │ Soil      │ +5     │ Soil pH within FAO EcoCrop optimum range         │
│ `rule_soil_fit` (pH)     │ Soil      │ -5     │ Soil pH outside optimum but within tolerated     │
│ `rule_soil_fit` (pH)     │ Soil      │ -15    │ Soil pH outside tolerated boundary               │
│ `water_base`             │ Water     │ 0..100 │ Base points: Low=80, Medium=50, Very High=0      │
│ `rule_water_budget`      │ Water     │ +8     │ GWETROOT ≥ 0.7: Excellent residual moisture     │
│ `rule_water_budget`      │ Water     │ -12    │ GWETROOT < 0.5: Deficit moisture warning        │
│ `rule_water_budget`      │ Water     │ -15    │ Monsoon rainfall exceeds EcoCrop max tolerance   │
└──────────────────────────┴───────────┴────────┴──────────────────────────────────────────────────┘
```

#### Multi-Objective Scoring & Weight Normalization
Scores are compiled on a normalized 0–100 scale:
$$\text{Score} = \text{clamp}\left( \frac{w_{\text{income}} S_{\text{income}} + w_{\text{soil}} S_{\text{soil}} + w_{\text{water}} S_{\text{water}}}{w_{\text{income}} + w_{\text{soil}} + w_{\text{water}}} + \text{Adjustment}, 0, 100 \right)$$

* **Honest Financial Handling:** If the user does not enter expected net returns per acre for all candidate crops, the system **does not invent prices or yields**. In this case:
  * $w_{\text{income}}$ is dynamically set to $0$.
  * $S_{\text{income}}$ is returned as `null`.
  * The income basis is explicitly reported as `"not calculated (farmer returns missing)"`.
  * The remaining weights ($w_{\text{soil}}$ and $w_{\text{water}}$) are re-normalized to sum to 1.0.
* **Deterministic Tie-Breaking:** If two candidate rotations achieve identical scores, ties are broken deterministically: presence of a legume takes precedence, followed by lexicographical sorting of crop IDs.

#### Baseline Preservation Guarantee
A core scientific and UX tenet of Garvesty: **The farmer's existing rotation is NEVER hidden or discarded.** Even if the baseline fails a hard rule (e.g., Summer Rice on an unirrigated plot), it is retained in the comparison list, marked with `eligibility: "unsuitable"`, `score: null`, and annotated with the exact disqualification reasons.

---

## 5. NASA Earth Observation & Environmental Evidence Pipelines

Garvesty integrates 5 primary environmental and spaceborne data streams, distinguishing between operational real-time APIs, cleaned local snapshots, and planned expansion layers.

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                   ENVIRONMENTAL DATA FLOW                                        │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│  NASA POWER Daily REST API   ───┐                                                                │
│  NASA POWER Climatology API  ───┼──> [clean_all.py] ──> [fields_snapshot.json] ──> FastAPI Engine│
│  ISRIC SoilGrids v2.0 REST   ───┤                             ▲                                  │
│  FAO EcoCrop DB (Local)      ───┘                             │ (Fallback when live fails)       │
│                                      Live Power Client ───────┘                                  │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 5.1 NASA POWER (Prediction Of Worldwide Energy Resources)
* **API Endpoints:**
  * Daily Point: `https://power.larc.nasa.gov/api/temporal/daily/point`
  * Climatology Point: `https://power.larc.nasa.gov/api/temporal/climatology/point`
* **Access Protocol:** Public HTTP GET, unauthenticated, zero API keys required.
* **Meteorological Grid Resolution:** 0.5° Latitude × 0.625° Longitude (~55 km × ~69 km).
* **Parameters Retrieved:**
  * `PRECTOTCORR`: MERRA-2 precipitation corrected (mm/day).
  * `T2M`, `T2M_MAX`, `T2M_MIN`: Air temperature at 2 meters (°C).
  * `RH2M`: Relative humidity at 2 meters (%).
  * `WS2M`: Wind speed at 2 meters (m/s).
  * `ALLSKY_SFC_SW_DWN`: All-sky surface shortwave downward irradiance ($MJ/m^2/day$).
  * `GWETTOP`, `GWETROOT`: Modeled topsoil and root-zone soil wetness (dimensionless, 0.0 to 1.0).
* **Calendar Window Correctness:**
  Precipitation sums (7-day and 30-day) and wetness changes are computed over **strict calendar sequences**, not row counts. If an upstream day is missing or flagged with fill values (`-999.0`, `-777.0`), the system returns `rain_7d: null` with an explicit coverage block:
  ```json
  "coverage": {"observed": 6, "expected": 7}
  ```
  Incomplete windows are never presented as complete totals.
* **Shared Normalization:** The live network client (`backend/app/services/power.py`) and the offline pipeline (`pipeline/clean_all.py`) execute the exact same normalization function (`normalize_daily`), ensuring 100% parity between live API reads and cached snapshots.
* **Concurrency & Timeouts:** Bounded 5-second network timeout with thread-safe cell locks (`_cell_locks`) preventing duplicate concurrent fetches for identical grid coordinates.

### 5.2 ISRIC SoilGrids v2.0 (Non-NASA Partner Source)
* **Endpoint:** `https://rest.isric.org/soilgrids/v2.0/properties/query`
* **Spatial Resolution:** 250 meters.
* **Depth Layer:** 0–5 cm (topsoil mean).
* **Parameters:** `phh2o` (pH × 10), `clay` (g/kg), `sand` (g/kg), `silt` (g/kg), `soc` (dg/kg), and `cec` (mmol(c)/kg).
* **Disclosure:** Badged prominently as **"ISRIC SoilGrids v2.0 (Non-NASA Partner Dataset)"** to maintain strict distinction from NASA missions.

### 5.3 FAO EcoCrop Database
* **Source:** FAO EcoCrop agro-ecological crop database.
* **Function:** Provides physiological crop tolerance envelopes: absolute minimum/maximum and optimal minimum/maximum for temperature (°C), annual rainfall (mm), and soil pH.

### 5.4 NASA GIBS VIIRS NOAA-20 Imagery
* **Source:** NASA Global Imagery Browse Services (GIBS).
* **Layer:** `VIIRS_NOAA20_CorrectedReflectance_TrueColor`.
* **Resolution:** 375 meters.
* **Usage & Disclaimer:** Provides broad regional satellite context over the delta. The interface displays an explicit spatial resolution warning: *"Regional satellite imagery (375 m pixel size); cannot be used to verify individual farm boundary lines."*

### 5.5 NASA AppEEARS (MODIS NDVI & SMAP Soil Moisture)
* **Status:** Prepared scripts (`pipeline/fetch_appeears.py`), currently badged as `NOT_CONNECTED` in the baseline snapshot pending verified Earthdata credentials.
* **Quality Assurance Enforcement (`test_data.py`):**
  * *SMAP SPL3SMP_E:* Requires `retrieval_qual_flag == 0` (recommended quality). Observations with non-zero quality flags are rejected prior to AM/PM averaging.
  * *MODIS MOD13Q1:* Requires 16-day composite Pixel Reliability QA bitmasks. Observations lacking QA flags or containing cloud-corrupted masks are rejected rather than assumed valid.

### 5.6 Pipeline Data Cleaning & Integrity Report
The pipeline outputs `data/reports/cleaning_report.json`, recording:
* Input rows vs. output clean rows.
* Missing days, null values, and out-of-range rejections.
* Transformation pipeline identifier: `power-calendar-v1`.
* SHA-256 cryptographic hashes of raw upstream payloads, guaranteeing end-to-end scientific auditability.

---

## 6. Three Machine Learning Model Tracks (TERRA Analyst Mode)

Garvesty enforces a strict architectural boundary between deterministic agronomy rules and machine learning research. **Machine learning models are strictly gated; an ML model output NEVER enters farmer recommendations unless it passes its formal validation gates.**

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                    THREE ML RESEARCH TRACKS                                      │
├───────────────────────┬──────────────┬───────────────────────────────┬───────────────────────────┤
│ Track                 │ Status       │ Release Gate Criterion        │ Role in Farmer Mode       │
├───────────────────────┼──────────────┼───────────────────────────────┼───────────────────────────┤
│ 1. Regional Wetness   │ Experimental │ Chronological holdout beats   │ Analyst telemetry only;   │
│                       │              │ Persistence & Climatology     │ NOT in recommendations    │
├───────────────────────┼──────────────┼───────────────────────────────┼───────────────────────────┤
│ 2. Vegetation Anomaly │ Blocked /    │ Reviewed anomaly cases; cloud │ Analyst telemetry only;   │
│                       │ Planned      │ mask verification             │ NOT in recommendations    │
├───────────────────────┼──────────────┼───────────────────────────────┼───────────────────────────┤
│ 3. Yield Feasibility  │ BLOCKED      │ Field-scale ground truth      │ COMPLETELY BLOCKED;       │
│                       │              │ harvest labels in Delta       │ NEVER in recommendations  │
└───────────────────────┴──────────────┴───────────────────────────────┴───────────────────────────┘
```

### 6.1 Track 1: Regional Root-Zone Wetness Prediction
* **Objective:** Forecast next-week average NASA POWER `GWETROOT` (7-day lead) using historical weather sequences.
* **Features:** Lagged wetness values ($t_{-7}$, $t_{-14}$, $t_{-21}$), cumulative precipitation ($7d$, $14d$, $30d$), temperature extrema, and day-of-year cyclical harmonics.
* **Non-Leakage Splitting Rules (`test_models.py`):**
  * Strict **chronological split** across all grid cells using a shared calendar cutoff date. Random train/test splits are strictly forbidden due to strong temporal autocorrelation.
  * Enforces a **purged embargo window** between the last available training target and the first testing issue date, strictly mirroring operational latency.
* **Validation Baselines:** To achieve promotion, the model (Ridge regression / LightGBM) must achieve lower Mean Absolute Error (MAE) and Root Mean Squared Error (RMSE) on chronological holdouts than both:
  1. *Persistence Baseline:* $\hat{y}_{t+7} = y_{t}$
  2. *Seasonal Climatology Baseline:* $\hat{y}_{t+7} = \bar{y}_{\text{month}}$
* **Current Status:** `experimental` (visible in Analyst Screen A4; isolated from farmer recommendations).

### 6.2 Track 2: Vegetation Anomaly Detection
* **Objective:** Detect seasonal crop development anomalies by tracking MODIS MOD13Q1 250 m 16-day NDVI time series against historical normal envelopes.
* **Validation Gates:** Cloud/aerosol bitmask QA filtering; verified separation of harvest timing/fallow from actual crop failure.
* **Current Status:** `blocked` / `planned` pending active AppEEARS credentials.

### 6.3 Track 3: Yield Feasibility / Plot-Level Prediction
* **Scientific Reality Check & Refusal to Mislead:** Plot-level crop yield prediction is **strictly BLOCKED**. High-accuracy plot yield prediction requires calibrated, field-scale ground-truth harvest records across multiple seasons in the Ayeyarwady Delta. Township-level or national agricultural yearbooks cannot validate plot-level machine learning models.
* **Garvesty Integrity Stance:** The project refuses to present speculative ML yield numbers to farmers. Gross margins and economic returns remain an explicit arithmetic calculation requiring user-entered costs and prices.

---

## 7. Sourced AI & Agronomy Knowledge Layer

Garvesty pairs its deterministic engine with an optional Large Language Model explanation layer designed under strict anti-hallucination constraints.

### 7.1 LLM Operational Scope
The LLM does **not** calculate suitability scores, does **not** evaluate rules, and does **not** invent weather or soil measurements. It acts purely as an agronomist translator, converting structured backend JSON findings into empathetic, clear Burmese and English advisory narratives.

### 7.2 Grounded Context & Citation Guardrails
1. **Grounded Ingestion:** Prompts are injected exclusively with the structured output of `/api/analysis` paired with a curated agronomic knowledge corpus (citations: Myanmar Pulses Sector Development Strategy, IRRI Rice Almanac, FAO EcoCrop profiles).
2. **Stable Citation Identifiers:** Every agronomic assertion made by the model must cite a verified tag (e.g., `[EcoCrop-Rice]`, `[MAS-Pulses-2023]`, `[POWER-Agro]`).
3. **Strict Abstention Policy:** If an environmental parameter is missing or marked `unknown`, the LLM is instructed to explicitly declare: *"Evidence is currently unavailable for this factor; do not assume standard conditions."*
4. **Offline Deterministic Fallback:** If the external LLM API is unavailable, the user interface gracefully falls back to deterministic rule strings compiled directly from `backend/app/engine/rules.py`.

---

## 8. Offline Contract, Local Persistence & Compliance

Rural connectivity across the lower Ayeyarwady Delta is fragile. Garvesty is engineered to survive complete network disconnects without application crashes.

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                     OFFLINE-FIRST CONTRACT                                       │
├──────────────────────────────────────────────────────────────────────────────────────────────────┤
│  Client PWA / IndexedDB  ──> Stores custom fields, point notes, and saved seasonal reports       │
│  FastAPI Offline Mode    ──> FIELDSHIFT_OFFLINE=1 forces 100% operation from cached snapshots    │
│  No OSM Tile Scraping    ──> Respects tile policies; falls back to vector canvas offline        │
│  Serverless Reopen       ──> Saved reports open in browser without requiring Python backend      │
└──────────────────────────────────────────────────────────────────────────────────────────────────┘
```

### 8.1 Client Storage & Data Privacy
* **Local Persistence:** Custom farm boundaries, point annotations, and saved seasonal decision reports are stored in client browser storage (**IndexedDB** / **localStorage**).
* **Data Privacy:** A smallholder farmer's property boundaries and financial numbers are never uploaded to a public cloud database. Data stays on the local device.

### 8.2 Serverless Reopening
A previously generated and saved Seasonal Decision Report (Screen F6) can be reopened, rendered, and printed in the browser completely offline, even if the FastAPI backend server is shut down.

### 8.3 OpenStreetMap Tile Policy Compliance
Bulk tile scraping and unauthorized pre-caching violate OpenStreetMap Tile Usage Policies. Garvesty respects these policies:
* Basemap tiles are loaded dynamically on demand.
* When tiles fail to load (offline state), the map component gracefully falls back to rendering the field boundary polygon on a clean vector canvas with an internal coordinate grid.

### 8.4 Backend Offline Mode
Setting the environment variable:
```bash
export FIELDSHIFT_OFFLINE=1
```
forces the FastAPI backend to disable all external network requests to NASA POWER, operating exclusively against local cached parquet files and `fields_snapshot.json`.

---

## 9. Test Suites, Verification Record & Code Quality

The Garvesty codebase contains four dedicated test suites in `backend/tests/` designed to verify agronomic correctness, API schema contracts, data pipeline integrity, and ML validation gates.

### 9.1 Test Suite Inventory

#### 1. `test_planner.py` (Agronomic Rules & Rotation Planner)
* `test_season_fit_rejects_long_and_wrong_season_crops`: Confirms rejection of out-of-season candidates.
* `test_summer_rice_needs_irrigation`: Confirms that summer rice is disqualified when irrigation is unavailable.
* `test_same_crop_penalised_and_legume_break_rewarded`: Confirms monoculture penalties and legume credits.
* `test_existing_rotation_always_returned_with_at_least_three_others`: Verifies candidate return set.
* `test_rice_pulse_beats_rice_rice_on_soil`: Verifies that pulse rotations outperform continuous paddy in soil health.
* `test_deterministic`: Confirms 100% identical outputs for identical inputs across repeated runs.
* `test_priorities_change_ranking`: Confirms that user sliders actively alter the recommendation rank.
* `test_income_neutral_without_farmer_numbers`: Validates that missing farmer income numbers zero out income weight and normalize remaining priorities.
* `test_ineligible_baseline_remains_visible`: Verifies baseline preservation even when disqualified.
* `test_missing_returns_are_not_assumed_zero`: Prevents incomplete financial inputs from assuming zero returns.
* `test_core_delta_comparisons_present`: Ensures Rice-Rice, Rice-Black Gram, and Rice-Green Gram are compared.

#### 2. `test_data.py` (Data Pipeline & Quality Integrity)
* `test_calendar_windows_require_complete_rain_and_exact_wetness_day`: Ensures missing calendar dates prevent false precipitation sums.
* `test_live_rejects_nonfinite_and_out_of_range`: Confirms rejection of infinity, NaN, and fill values.
* `test_snapshot_and_live_share_normalization`: Confirms identical processing between live reads and snapshots.
* `test_smap_filters_quality_before_am_pm_average`: Verifies strict quality flag filtering prior to averaging.
* `test_modis_requires_qa_and_finite_values`: Confirms rejection of unmasked or corrupted NDVI values.
* `test_different_cells_refresh_concurrently`: Verifies thread-safe concurrent fetching across distinct grid cells.

#### 3. `test_analysis.py` (API Contract & Geometry Validation)
* `test_drawn_field_keeps_reference_data_separate_from_farm_claims`: Verifies user metadata isolation.
* `test_unsupported_geometry_never_inherits_twante_data`: Prevents out-of-bounds fields from silently inheriting demo data.
* `test_api_rejects_invalid_polygons`: Parameterized test rejecting points, unclosed rings, self-intersecting polygons, and out-of-bounds coordinates with HTTP 422.
* `test_request_requires_exactly_one_field_source`: Enforces mutual exclusivity between `field_id` and `geometry`.
* `test_scenario_does_not_mutate_source_or_moisture_measurements`: Confirms simulation state isolation.
* `test_fixed_snapshot_is_reproducible_and_has_completed_steps`: Validates analysis reproducibility.
* `test_api_validates_scenarios_and_crop_ids`: Enforces Pydantic range bounds on scenario parameters.

#### 4. `test_models.py` (Machine Learning Gating & Validation)
* `test_calendar_targets_respect_availability_lag`: Validates operational latency in ML target definitions.
* `test_missing_days_never_become_shorter_windows`: Prevents missing days from shortening feature windows.
* `test_raw_loader_rejects_fill_invalid_values_and_duplicate_days`: Confirms raw data sanitation.
* `test_time_split_is_purged_and_cells_share_a_cutoff`: Verifies chronological non-leakage splits.
* `test_short_history_blocks_training`: Confirms training aborts when historical data is insufficient.
* `test_absent_or_bad_manifest_fails_closed`: Verifies fail-closed architecture when model manifests are missing.

---

## 10. NASA Space Apps Submission Dossier & Deliverables

### 10.1 Challenge Metadata
* **Challenge:** Challenge 07: "Field Shift: Adapting Farms with NASA Data"
* **Categories:** Earth Science, Software, Arts & Multimedia
* **Host Location:** Yangon, Myanmar (Local Event UIT)
* **Official Evaluation Deadline:** 15 November 2026, 23:59 Asia/Yangon time

### 10.2 Five Official Judging Criteria Alignment

| Criterion | Challenge Expectation | Garvesty Engineering Evidence |
|---|---|---|
| **Impact** | Solves a real-world agricultural problem with measurable potential | Targeted directly at Ayeyarwady Delta smallholders facing summer water shortages; promotes soil-building pulse rotations that save ~80% irrigation water; works offline for real-world rural accessibility. |
| **Creativity** | Inventive, original product architecture and user experience | Interactive software agent simulation narrating the data pipeline; dual-mode Farmer/Analyst architecture; interactive scenario simulator stress-testing operational constraints. |
| **Validity** | Scientifically and technically sound, auditable, and reproducible | Pure deterministic agronomy rules citing FAO EcoCrop; calendar-based weather window aggregations; strict provenance badging (`LIVE`, `CACHED`, `DEMO`); refusal to fabricate yield or profit numbers. |
| **Relevance** | Directly answers the challenge brief using NASA Earth observations | Core engine powered by NASA POWER agroclimatology and root-zone hydrology, with GIBS VIIRS imagery, AppEEARS pipelines, and SRTM elevation integration. |
| **Presentation** | Clear, concise, and compelling demonstration | Clean high-contrast UI adhering to design tokens; bilingual English/Burmese interface; fully structured 30-second video walkthrough and 7-slide pitch deck. |

### 10.3 30-Second Video Script & Timing Walkthrough

```
┌──────────────────────────────────────────────────────────────────────────────────────────────────┐
│                                 30-SECOND DEMO VIDEO TIMELINE                                    │
├───────────┬───────────────────────────────┬──────────────────────────────────────────────────────┤
│ Timestamp │ On-Screen Action              │ Audio / Voiceover Track                              │
├───────────┼───────────────────────────────┼──────────────────────────────────────────────────────┤
│ 0:00–0:05 │ Zoom into Myanmar Delta map;  │ "After monsoon rice, Myanmar Delta farmers face a    │
│           │ draw field polygon in Twante. │ critical choice: high-risk summer paddy, or pulses?" │
├───────────┼───────────────────────────────┼──────────────────────────────────────────────────────┤
│ 0:05–0:12 │ Agent dispatches across map;  │ "Garvesty brings NASA Earth observations directly to │
│           │ live POWER telemetry loads.   │ the field — root-zone wetness, rain, and soil data." │
├───────────┼───────────────────────────────┼──────────────────────────────────────────────────────┤
│ 0:12–0:20 │ Screen F4 comparison matrix;  │ "Our transparent rules engine scores rotations side- │
│           │ adjust soil health slider.    │ by-side, showing why black gram saves 80% water."    │
├───────────┼───────────────────────────────┼──────────────────────────────────────────────────────┤
│ 0:20–0:26 │ Toggle scenario simulator;    │ "Test droughts and planting delays, then save an     │
│           │ generate printable report.    │ offline decision report for local extension review." │
├───────────┼───────────────────────────────┼──────────────────────────────────────────────────────┤
│ 0:26–0:30 │ Bilingual Burmese toggle;     │ "Garvesty: Grounded NASA science, empowering farmers │
│           │ display GitHub repository.    │ adapting to a shifting climate."                     │
└───────────┴───────────────────────────────┴──────────────────────────────────────────────────────┘
```

### 10.4 7-Slide Pitch Deck Structure
* **Slide 1: Title & Mission:** Garvesty — Field Shift: Adapting Farms with NASA Data (Team Alphathanlwin, Yangon).
* **Slide 2: The Delta Crisis:** The post-monsoon water dilemma: diesel costs, saltwater intrusion, and the need for pulse diversification.
* **Slide 3: The Garvesty Solution:** A digital farm twin combining NASA Earth observations with deterministic agronomic rules.
* **Slide 4: NASA Earth Science in Action:** Deep dive into NASA POWER daily weather, root-zone hydrology (`GWETROOT`), and ISRIC soil integration.
* **Slide 5: Transparent Decision Matrix:** The 4-plan comparison matrix, slider-based priority re-weighting, and baseline preservation.
* **Slide 6: Scientific Integrity & ML Gating:** Why we refuse black-box yield predictions; our chronological holdouts and data cleaning pipeline.
* **Slide 7: Impact & Roadmap:** Bilingual Burmese rollout, offline PWA capabilities, and post-hackathon field validation in Twante.

### 10.5 Required AI Usage Disclosure
*In compliance with NASA Space Apps Challenge 2026 Participation Rules:*  
Artificial intelligence tools were utilized during the development of Garvesty for:
1. Architectural ideation and drafting test specifications.
2. Assisting with Burmese linguistic localization strings in `frontend/src/i18n.ts`.
3. Synthesizing natural-language explanations over structured backend JSON responses in the experimental AI explanation layer.  
All agronomic equations, scoring logic, geometry checks, and data cleaning routines were written, audited, and mathematically verified by the human engineering team.

---

## 11. Post-Submission 3-to-7 Day Expansion Roadmap

Following the November 15 submission deadline, the project engineering roadmap targets three phases of technical depth:
1. **Live AppEEARS Automated Retrieval:** Complete automated ingestion of MODIS MOD13Q1 250 m 16-day NDVI and SMAP SPL3SMP_E 9 km soil moisture using authorized Earthdata credentials.
2. **GPM IMERG High-Resolution Precipitation:** Integrate NASA GPM IMERG 0.1° (~10 km) calibrated satellite rainfall to supplement POWER meteorological grid observations.
3. **Field Extension Validation:** Conduct on-the-ground validation sessions with agricultural extension officers and farming families in Twante and Kawhmu townships to refine crop table sowing calendars and traditional Myanmar unit conversions.

---
*Garvesty (FieldShift Delta) · NASA Space Apps Challenge 2026 · Challenge 07: Field Shift · Document Version 2.0.0 (Final)*
