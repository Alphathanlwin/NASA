# Garvesty

A decision-support and farm twin platform for NASA Space Apps Challenge 2026, Challenge 07:
**"Field Shift: Adapting Farms with NASA Data"**.

Draw or select a farm on the interactive map. An animated specialist agent travels to it, assembles NASA Earth observation and soil data, and evaluates multi-season crop rotations for the post-monsoon dry season. It presents three alternative rotations plus the farmer's baseline practice, each with cited agronomic reasons, evidence references, information gaps, and local verification checks. Dynamic priority sliders (Income, Soil Health, Water Saving) re-rank rotations in real time. Farmers and advisers can stress-test decisions in the What-If Scenario Simulator and export an offline-printable Seasonal Decision Report.

Garvesty scores relative agronomic suitability; it does not promise crop yields or replace local farmer judgment.

---

## 10 Functional Screens

### Farmer Mode (Decision Workflow: F1–F6)
- **F1 Overview:** Farm selection, recent weather conditions, and quick resumption of saved analyses.
- **F2 My Farm:** Interactive boundary drawing (polygon placement, vertex editing, planar acreage in Acres/Hectares) and field annotations (crop history, irrigation, drainage).
- **F3 Environment:** Detailed rainfall, temperature, root-zone wetness, ISRIC SoilGrids soil profile with satellite footprint disclosures, and **In-Situ IoT Soil Probes** (AgroGuard LoRaWAN edge nodes streaming 10cm/40cm root VWC, pore-water EC salinity alerts, node battery, and Space + Ground fusion).
- **F4 Compare:** Multi-season rotation comparison (Rice → Rice, Rice → Mung Bean, Rice → Black Gram). Ineligible baselines (e.g. rainfed dry-season rice) remain visible with disqualification reasons.
- **F5 Scenarios:** What-If simulator stress-testing rainfall deviations (−20% to +20%), planting delays (0–14 days), irrigation access, and drainage conditions.
- **F6 Report:** Comprehensive, offline-printable Seasonal Decision Report with checklist and agronomic disclaimers.

### Analyst Mode (Telemetry & Provenance: A1–A4)
- **A1 Mission Overview:** Regional monitoring coverage, active layer status (`LIVE`, `CACHED`, `DEMO`), data latency metrics, and **In-Situ IoT Edge Sensor Mesh** telemetry gateway.
- **A2 Field Intelligence:** Precise geometry inspection, weather time-series charts, sensor footprint overlays, and **Space + Ground Sensor Fusion** comparative analysis.
- **A3 Catalogue:** NASA and external product catalogue (POWER, GPM, SMAP, MODIS, SoilGrids, EcoCrop) with DOIs and resolutions.
- **A4 Quality & Models:** Cleaning pipeline audit (-999.0 sentinels, range checks) and 3 gated ML evaluation tracks (Root-Zone Wetness, Vegetation Anomaly, Yield Feasibility) evaluated with chronological holdouts and fails-closed release gates.

---

## Run It

Needs Python 3.11+ and Node 20+.

```bash
# 1. Backend setup & run
python -m venv .venv
.venv/Scripts/python -m pip install -r backend/requirements.txt    # Windows
# .venv/bin/python -m pip install -r backend/requirements.txt      # macOS / Linux
cd backend
../.venv/Scripts/python -m uvicorn app.main:app --port 8000

# 2. Frontend setup & run (second terminal)
cd frontend
npm install
npm run dev            # open http://localhost:5173
```

For a single-server demo, run `npm run build` in `frontend/`, restart the backend and open `http://127.0.0.1:8000`.

**Tests:**
```bash
python -m pytest backend/tests
```

**Offline Mode:**
To rehearse with no internet connection, set `FIELDSHIFT_OFFLINE=1` before starting the backend. The application serves validated cached snapshots from `data/cache/`.

---

## What is Real and What is Demo

| Item | Status | Shown in the UI as |
|---|---|---|
| Temperature, rain, humidity, root-zone wetness | Real. NASA POWER, fetched live when online, cached copy otherwise. Modelled values on a 0.5° × 0.625° grid | `LIVE` or `CACHED` · NASA POWER |
| Seasonal rain and temperature averages | Real. NASA POWER climatology 2001–2025, cached | cited in evidence |
| Topsoil pH and texture | Real. ISRIC SoilGrids v2.0, 250 m, cached. Non-NASA supporting product | `CACHED` · ISRIC SoilGrids |
| Crop pH, temperature and rainfall tolerances | Real. FAO EcoCrop global physiological ranges | cited in each agronomic reason |
| Custom field drawing & area | Real. Planar shoelace calculation from user-drawn coordinates | `USER-INPUT` |
| Satellite soil moisture (SMAP) | Pipeline ready (QA filtered). Requires Earthdata token | `NOT CONNECTED` |
| Vegetation index (MODIS NDVI) | Pipeline ready (pixel reliability QA). Requires Earthdata token | `NOT CONNECTED` |
| In-situ IoT sensor probes & threshold alerts | Real software support. AgroGuard LoRaWAN probe packets ingested via `/api/fields/{id}/iot`, generating salinity intrusion (EC >= 2.0 dS/m) and drought alerts | `SPACE + GROUND FUSED` · AgroGuard IoT |
| Reference field shapes & names | Demo illustrative blocks at real Twante coordinates | `DEMO` |
| Rotation scores | Real deterministic agronomic rules applied to data above | score breakdown on every card |
| Income calculations | Derived solely from user-entered prices; neutral weighting when omitted | stated in information gaps |
| Machine Learning tracks | Gated / experimental. Strictly excluded from farmer advice until field-validated | `BLOCKED` / `EXPERIMENTAL` |
| Yield prediction | Not predicted; decision support only | stated across UI and reports |

---

## How the Ranking Works

`backend/app/engine/` implements deterministic scoring as pure functions:
- `crops.py`: 10 crop varieties for Myanmar Delta and Dry Zone with seasons, durations, families, and water requirements.
- `rules.py`: Explicit agronomic rules. Season mismatch and unmet irrigation reject a rotation outright. Legume nitrogen credits, paddy cycles, pest-break rotations, soil fit, crop diversity, water budgets, temperature tolerances, and field drainage add or subtract points, each providing a human-readable explanation.
- `planner.py`: Scores candidate pairs from 0 to 100 based on weighted priority sliders (income, soil, water). Equal scores share rank. Preserves ineligible baselines so farmers understand why a practice is discouraged.

---

## Data Pipeline

```bash
python pipeline/make_fields.py             # Generate reference fields
python pipeline/fetch_power.py             # Fetch NASA POWER daily & climatology
python pipeline/fetch_soilgrids.py         # Fetch SoilGrids topsoil parameters
python pipeline/clean_all.py               # Clean datasets and build cleaning report
python pipeline/evaluate_models.py         # Evaluate 3 ML tracks on chronological holdouts
```

Cleaning report: `data/reports/cleaning_report.json` logs records read, nullified sentinels, range violations, and dropped rows.

---

## Future Roadmap

- Expansion from Twante baseline to Bogale, Hinthada, and Myaungmya.
- Automated token-refresh Earthdata pipeline for SMAP L4 and MODIS NDVI.
- Production LoRaWAN hardware gateway deployment across expanded townships (software support fully active in current build).
- Production field validation for the three gated ML tracks.
