# Field Shift

A decision-support tool for NASA Space Apps Challenge 2026, challenge 07
"Field Shift: Adapting Farms with NASA Data".

Click a field on the map. An agent travels to it, reads the NASA data for that
location, and compares crop rotations for the coming dry season and the next
monsoon. It always shows three alternatives plus the farmer's usual rotation,
each with the reasons for and against it, the evidence used, the information
gaps, and what to check locally. Three sliders (income, soil health, water
saving) re-rank the rotations.

It ranks strategies. It does not predict yield and does not replace the
farmer's judgment or local advice.

## Run it

Needs Python 3.11+ and Node 20+.

```bash
# 1. backend
python -m venv .venv
.venv/Scripts/python -m pip install -r backend/requirements.txt    # Windows
# .venv/bin/python -m pip install -r backend/requirements.txt      # macOS / Linux
cd backend
../.venv/Scripts/python -m uvicorn app.main:app --port 8000

# 2. frontend (second terminal)
cd frontend
npm install
npm run dev            # open http://localhost:5173
```

For a single-server demo, run `npm run build` in `frontend/`, restart the
backend and open http://127.0.0.1:8000.

Tests: `cd backend && ../.venv/Scripts/python -m pytest`

To rehearse with no internet, set `FIELDSHIFT_OFFLINE=1` before starting the
backend. The app then serves only the cached data in this repo.

## What is real and what is demo

| Item | Status | Shown in the UI as |
|---|---|---|
| Temperature, rain, humidity, root-zone wetness | Real. NASA POWER, fetched live when online, cached copy otherwise. Modelled values on a 0.5 x 0.625 degree grid, not field measurements | `LIVE` or `CACHED` · NASA POWER |
| Seasonal rain and temperature averages | Real. NASA POWER climatology 2001-2025, cached | named in each plan's evidence |
| Topsoil pH and texture | Real. ISRIC SoilGrids v2.0, 250 m, cached. Not a NASA product | `CACHED` · ISRIC SoilGrids |
| Crop pH, temperature and rainfall tolerances | Real. FAO EcoCrop. Global ranges, not Myanmar-specific | cited in each reason |
| Satellite soil moisture (SMAP) | Not connected. The fetch script exists; no Earthdata login was available on the build machine | `NOT CONNECTED` |
| Vegetation index (MODIS NDVI) | Not connected, same reason | `NOT CONNECTED` |
| Field shapes, names, usual rotation, irrigation flag | Demo. Illustrative blocks at real coordinates | `DEMO` |
| Rotation scores | Real rules applied to the data above. Point sizes and the wetness thresholds are the team's rule weights, not measurements | score breakdown on every card |
| Income | Only from numbers the farmer types in. With none entered, every cropped season counts the same | stated under "Information gaps" |
| Yield | Not predicted | stated in the UI |

## How the ranking works

`backend/app/engine/` holds the whole engine as pure functions:

- `crops.py`: ten options for the Myanmar Delta and Dry Zone, with season, duration, family and water class.
- `rules.py`: one function per rule. Season fit and irrigation need reject a rotation outright. Legume credit, paddy cycle, pest break, soil fit, diversity, water budget, temperature fit and field drainage add or remove points, each with the sentence shown to the farmer.
- `planner.py`: scores every dry-season and monsoon pair from 0 to 100 as a weighted mix of income, soil and water (the sliders), plus climate-fit adjustments. Equal scores share a rank. Same data in, same ranking out.

## Data pipeline

```bash
python pipeline/make_fields.py        # demo fields
python pipeline/fetch_power.py        # NASA POWER daily + climatology
python pipeline/fetch_soilgrids.py    # SoilGrids
python pipeline/fetch_appeears.py submit   # MODIS + SMAP, needs ~/.netrc Earthdata login
python pipeline/fetch_appeears.py collect  # run when the AppEEARS task has finished
python pipeline/clean_all.py          # clean, build the snapshot and the cleaning report
```

`data/reports/cleaning_report.json` lists, per source, the rows read, fill
values nulled, out-of-range values nulled and rows dropped. See
`data/SOURCES.md` for where each file came from.

The AppEEARS path has not been run yet, so its cleaning code is untested
against real files.

## Not built yet

Scenario simulator, decision report, pre-harvest suggestions, Burmese
interface and local units, installable offline app, analyst mode.

## AI use

Built with Claude Code (Anthropic) as a coding assistant.
