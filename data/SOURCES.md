# Data sources

Every file under `data/raw/` is the untouched response from the source, wrapped with the
retrieval time (`retrieved_utc`). `pipeline/clean_all.py` turns them into `data/clean/`,
`data/snapshots/fields_snapshot.json` and `data/reports/cleaning_report.json`.

| Files | Source | Access | Fetched by |
|---|---|---|---|
| `raw/power/daily_*.json` | NASA POWER Daily API, community AG, two years of daily values per grid cell | `https://power.larc.nasa.gov/api/temporal/daily/point`, no login | `pipeline/fetch_power.py` |
| `raw/power/climatology_*.json` | NASA POWER Climatology API, monthly means January 2001 to December 2025 | `https://power.larc.nasa.gov/api/temporal/climatology/point`, no login | `pipeline/fetch_power.py` |
| `raw/soilgrids/F-*.json` | ISRIC SoilGrids v2.0, 0-5 cm mean (not a NASA product) | `https://rest.isric.org/soilgrids/v2.0/properties/query`, no login | `pipeline/fetch_soilgrids.py` |
| `reference/ecocrop_ranges.json` | FAO EcoCrop database (crop pH, temperature, rainfall tolerances) | `EcoCrop_DB.csv` from https://github.com/OpenCLIM/ecocrop | `pipeline/extract_ecocrop.py` |
| `raw/appeears/*` (not present yet) | MODIS MOD13Q1.061 NDVI and SMAP SPL3SMP_E.006 soil moisture point samples | NASA AppEEARS, needs an Earthdata login in `~/.netrc` | `pipeline/fetch_appeears.py` |
| `fields.geojson` | DEMO. Hand-made field blocks near Twante, Yangon Region | n/a | `pipeline/make_fields.py` |

Map tiles are loaded live and are not stored: CARTO / OpenStreetMap base map and Esri
World Imagery satellite (high resolution, no key).
