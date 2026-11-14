# Field Shift

**Seasonal crop-rotation decision support for the Ayeyarwady Delta, built on NASA Earth data.**

NASA Space Apps Challenge 2026 - challenge 07, *Field Shift: Adapting Farms with NASA Data*.
Team Field Shift, Yangon.

Public demo (no login): **https://alphathanlwin.github.io/NASA/**

Field Shift builds a traceable environmental profile for a demo field, compares exactly three
dry-season rotations against the farmer's current rice-to-rice practice, and lets the farmer
explore how changed assumptions move the result. Every environmental value shows its dataset,
product, variable, unit, spatial resolution, period, retrieval date and status.

It ranks options. It does **not** predict yield, profit, or prices, and it does not replace a
farmer's judgment or local advice.

---

## 1. The farmer flow

1. **Overview** - pick one of four demo fields (one per reference town: Myaungmya, Pathein,
   Bogale, Twante). The map shows the boundary; the cards show rainfall, temperature, root-zone
   wetness, topsoil and NDVI. Expand any card to see the full provenance record.
2. **Compare crops** - three rotations are scored with published rules: rice to rice (always the
   baseline), rice to mung bean, and rice to black gram. Each plan lists reasons for, reasons
   against, neutral findings, evidence references, missing information and local checks.
3. **Scenarios** - change irrigation, planting delay, residual moisture, drainage or dry-season
   rainfall. The same three rotations are recalculated and the screen shows what moved, by how
   much, and why.
4. **Analysis log** - a deterministic nine-step log of the analysis with a simulated clock. It is
   labelled as a visualisation of the analysis steps, not a live agent travelling to the field.
5. **Data & Quality** - one analyst screen with the source catalogue, retrieval dates, status
   labels and the cleaning report.

The interface ships in English by default and switches to Burmese with the language toggle or
`?lang=my`. All strings go through `t()`; `en.json` and `my.json` hold the dictionaries. Burmese
text is set in a self-hosted Noto Sans Myanmar font, not a font CDN.

---

## 2. What is real, what is demo, what is missing

| Item | Status shown | Reality |
|---|---|---|
| Temperature, humidity, rainfall, root-zone wetness | `CACHED` | NASA POWER daily point data, community AG, MERRA-2 / GEOS modelled values on a 0.5 x 0.625 degree grid (about 55 x 67 km). Grid-cell value, not a field measurement. |
| Day-of-year climatology, 1996-2025 | `CACHED` | Computed by this project from NASA POWER daily history. Historical average, not a forecast. |
| MODIS NDVI | `CACHED` | MOD13Q1 v061, one 250 m pixel at each field centre via the ORNL DAAC subset service. Cloudy composites removed. |
| Topsoil pH and texture | `CACHED` | ISRIC SoilGrids v2.0, 250 m, 0-5 cm mean. Predicted map value, not a soil test. Not a NASA product. |
| Esri World Imagery (not NASA) | `LIVE` when the Satellite view is on | High-resolution imagery for the map's Satellite view; capture date varies by area. Credited on the map. |
| GPM IMERG Late V07 rainfall | `CACHED` | Real NASA data, 15 Sep - 12 Nov 2026, 0.1° cell nearest each town, via NASA OPeNDAP (Earthdata token). Shown as a 30-day total; every row records the Late run. Observed by satellite, next to the modelled POWER rain. |
| SMAP soil moisture | `CACHED` (3 fields) / `UNAVAILABLE` (Twante) | Real NASA SPL3SMP_E v006 via AppEEARS, last 120 days, 9 km cell (district scale). Only retrievals flagged "recommended quality" are kept (44 of 944); the Twante cell had none, so it shows UNAVAILABLE with that reason. |
| Field shape, name, crop history, irrigation flag | `DEMO` | Illustrative polygons at real coordinates, one per reference town. |
| A farmer's own field ("Add my field") | `USER-INPUT` | Boundary drawn by the farmer on the Satellite map; area in acres measured from the drawn corners. Weather, rainfall and soil-moisture values come from the nearest reference town and are labelled as such. Soil and vegetation (250 m point values) are not copied to a drawn field, so they show `UNAVAILABLE` until the farmer enters a soil test. Saved only in that browser. |
| Farmer's field measurements | `USER-INPUT` | Soil test pH, soil moisture by hand (dry / moist / wet), standing water after rain, irrigation access and an optional rain-gauge total. Where the rules can use them they replace the grid-cell estimate (pH, residual moisture, drainage, irrigation); the rain gauge is shown next to the satellite rainfall. Not checked by the app. |
| Farmer prices and costs | `USER-INPUT` | Only what the farmer types. Used for ranking only; never turned into a profit forecast. |
| Rotation scores | engine output | Deterministic rules applied to the data above. Rule weights are the team's design choices, not measurements. |

Missing data never becomes a number. It becomes an entry under "Missing information" and, where
relevant, an "unknown" reason in the plan. A missing SMAP reading is shown the same way.

---

## 3. The rules engine

The canonical engine is `backend/app/engine/engine.py`. `frontend/src/engine/engine.ts` is a
TypeScript port so the static GitHub Pages build can recalculate with no backend. A parity test
asserts that both produce identical results for the four fields and all twelve hero scenarios.

- Exactly three plans, defined in `backend/app/engine/crops.json`. The baseline (rice to rice)
  is required; evaluation throws if it is absent.
- Each plan receives a 0-100 score. Soil health and water saving start at 50 and rules add or
  subtract points; the season/field fit is added on top; the final score is clamped to 0-100.
- Priority weights are renormalised so they sum to exactly 100. Income is dropped from the
  weighting unless the farmer has entered **both** a price and a cost for **all three** crops.
  Otherwise the UI says "Not calculated - enter your price and cost" and disables the income
  slider.
- If income is enabled, crops are compared only by sales minus cost, scaled 0-100 within the
  three plans. No yield, area, or profit is inferred.
- Crop values carry a `verified` flag and a source. FAO EcoCrop supplies the cycle, pH,
  temperature, texture and drainage ranges. Sowing windows and water-need classes are team
  assumptions and are marked unverified.
- The pre-monsoon rule checks the growing window from 1 March to the mean onset of pre-monsoon
  rain (the first wet spell after 1 March in the 30-year climatology). A later sowing pushes more
  of the growing period into the pre-monsoon heat window, so planting delay changes the score.
- The engine version is returned with every result and shown in the UI.

Mung bean and black gram are not interchangeable in the table: they differ on cycle length,
optimum texture (mung bean tolerates organic/light soils, black gram is limited to heavy/medium)
and pH tolerance.

---

## 4. Scenario simulator

Twelve hero scenarios are stored in the crop table and exposed as five controls: irrigation
(available / sometimes / unavailable), planting delay (0 / 7 / 14 days), residual soil moisture
(normal / low), drainage (good / unknown / poor), and dry-season rainfall (-20%).

The comparison is always original versus scenario on the same rules, with the changed assumptions
shown explicitly. The rainfall control is kept but is not a default and carries a note: the rules
use the dry-season rainfall average, which is near zero in this region, so -20% mainly affects the
monsoon. A scenario is a what-if, not a forecast.

---

## 5. Agent workflow

There is no live language model in the demo. `backend/app/engine/agent.py` emits a deterministic
nine-step event log:

`Field selected` -> `Geometry resolved` -> `Loading NASA POWER` -> `Loading cached IMERG` ->
`Checking data quality` -> `Building field profile` -> `Evaluating rotations` ->
`Scenario recalculated` -> `Report ready`

The map dot animates along a scripted route while the log plays. The tooltip and the caption state
that this visualises the analysis steps; no vehicle or satellite travels to the field. The clock is
simulated, not real time.

---

## 6. Offline and static build

`scripts/build_snapshot.py` writes `frontend/public/snapshot.json` with the four field profiles,
their provenance, the agent logs, the scenario definitions, the source catalogue and the cleaning
report.

The frontend uses the snapshot and the TypeScript engine for every calculation, so the public
build works with the backend stopped. It probes `/api/health` once; if the backend answers, the
badge reads "CACHED data - backend online"; otherwise it reads "CACHED - offline mode". The Pages
workflow sets `VITE_STATIC_ONLY=1`, so the judge build goes straight to offline mode with no failed
request. If map tiles cannot load, the field outlines remain on a plain background.

---

## 7. Run it locally

Needs Python 3.11+ and Node 20+.

```bash
python -m venv .venv
.venv/Scripts/python -m pip install -r backend/requirements.txt   # Windows
# .venv/bin/python -m pip install -r backend/requirements.txt     # macOS / Linux

# backend only (API)
cd backend
../.venv/Scripts/python -m uvicorn app.main:app --port 8000
```

Frontend in a second terminal:

```bash
cd frontend
npm install
npm run dev          # http://localhost:5173
```

For one origin, build the frontend and open the path the build uses:

```bash
cd frontend
npm run build
cd ../backend
../.venv/Scripts/python -m uvicorn app.main:app --port 8000
# open http://127.0.0.1:8000/NASA/
```

The backend serves `frontend/dist` at `/NASA/` (the same base path as GitHub Pages) and redirects
`/` there.

### Rebuild the data and the static payload

```bash
.venv/Scripts/python backend/app/data_sources/fetch_power.py
.venv/Scripts/python backend/app/data_sources/fetch_soilgrids.py
.venv/Scripts/python backend/app/data_sources/fetch_modis_ornl.py
.venv/Scripts/python backend/app/data_sources/clean_all.py
.venv/Scripts/python backend/app/data_sources/make_fields.py
.venv/Scripts/python scripts/build_snapshot.py
```

Fetch scripts are re-runnable: POWER is requested only on its 0.5 x 0.625 degree grid, at most 20
parameters per call, at most 5 concurrent requests with about one second pacing, and fill values
(-999 / -99) are replaced with NaN before cleaning. `data/SOURCES.md` and `data/sources.json` are
regenerated by `clean_all.py`.

---

## 8. Tests

```bash
# Python engine and data properties
.venv/Scripts/python -m pytest backend/tests -q

# TypeScript / Python parity
node scripts/parity_test.mjs

# Production build (also type-checks)
cd frontend && npm run build
```

The parity test covers four fields, default priorities, and all twelve scenarios. Property tests
check that the baseline is present, weights sum to 100, scores stay in 0-100, missing inputs become
unknowns, and scenario changes only touch the relevant rules.

The static build was also loaded from a plain HTTP server with the backend stopped; the offline
badge appeared and the scenario controls still recalculated.

---

## 9. Project structure

```text
backend/app/
  api.py                  FastAPI routes
  main.py                 app, /NASA static mount
  engine/engine.py        canonical rules engine
  engine/crops.json       crop table, rules, weights, scenarios
  engine/agent.py         deterministic nine-step log
  data_sources/           fetch, clean, field generation
  services/store.py       snapshot access
frontend/src/
  App.tsx                 shell, language, tabs
  data.ts                 snapshot loading, backend probe
  engine/engine.ts        TypeScript port (parity-tested)
  engine/crops.ts         generated from crops.json by sync_crops.py
  components/             map, overview, plans, scenarios, agent, data quality
  i18n/en.json, my.json   all UI strings
frontend/public/
  snapshot.json           static payload
  fonts/NotoSansMyanmar.ttf
scripts/
  build_snapshot.py       static payload
  parity_test.mjs         parity assertion
  sync_crops.py           one crop table for both engines
data/                     raw -> clean -> snapshot, sources, cleaning report
docs/REFERENCES.md        dataset and agronomy references
docs/submission.md        submission notes
```

---

## 10. Limits and responsible use

- Grid-cell values are not field measurements. The UI says so next to each value and in the
  nearest-reference line.
- Historical climatology is not a forecast. The rainfall -20% control is a what-if.
- No yield, area, or profit is predicted. Income ranks farmer-entered numbers only.
- Salinity is not in these datasets and is listed as missing.
- The demo field geometry, crop history and irrigation flags are illustrative.
- Crop rules have not been reviewed by a local agronomist. The `verified` flag distinguishes
  FAO EcoCrop ranges from team assumptions.
- The Burmese dictionary is a first draft and has not yet been reviewed by a native speaker.
- The public build uses OpenStreetMap tiles. CARTO's keyless light basemap was retired in 2026
  (its tiles now return an "API KEY REQUIRED" watermark), so the map uses the keyless OSM style.
  No API key is required to view the demo.

---

## 11. How we used AI

We used **Claude Code (Anthropic)** as a coding assistant. It helped write and refactor the data
pipeline, the Python and TypeScript engines, the tests, the React interface and this
documentation. Every generated value in the app comes from the project's datasets and the
deterministic rules engine, not from a language model. The agent log is scripted; no LLM is called
at runtime. Burmese translations were drafted with AI assistance and still need a native-speaker
review. The team reviewed the outputs and remains responsible for the claims and the code.

Files that were written or substantially edited with AI assistance carry a
`# AI-assisted: Claude Code` or `// AI-assisted: Claude Code` header.

---

## 12. References

See [`docs/REFERENCES.md`](docs/REFERENCES.md) for dataset versions, URLs, access dates and the
agronomy sources behind the crop table. Submission notes are in
[`docs/submission.md`](docs/submission.md).
