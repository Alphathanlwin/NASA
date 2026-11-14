# References

All URLs were accessed on 2026-11-14 unless stated otherwise. Retrieval timestamps for each file
are in `data/sources.json`, `data/SOURCES.md`, and `data/reports/cleaning_report.json`.

## Earth observation and modelled data

1. **NASA POWER - Daily API v2, community AG (MERRA-2 / GEOS).**
   Parameters used: T2M, T2M_MAX, T2M_MIN, PRECTOTCORR, RH2M, WS2M, ALLSKY_SFC_SW_DWN, GWETTOP,
   GWETROOT.
   Point requests at 16.5/95.0 (Myaungmya), 16.78/94.73 (Pathein), 16.29/94.77 (Bogale),
   16.71/95.93 (Twante). 0.5 x 0.625 degree grid cells, about 55 x 67 km.
   https://power.larc.nasa.gov/api/temporal/daily/point
   Status in this build: `CACHED`. Modelled grid-cell values, not field measurements.

2. **NASA POWER daily history, 1996-2025.**
   Used to build this project's day-of-year climatology (Parquet, `data/clean/power_doy_climatology.parquet`).
   Historical means, not a forecast. Retrieved 2026-11-14.
   https://power.larc.nasa.gov/

3. **NASA MODIS Terra MOD13Q1 v061 vegetation indices.**
   Variable `250m_16_days_NDVI` with pixel reliability, one 250 m pixel at each field centre.
   Subset service: https://modis.ornl.gov/rst/api/v1/MOD13Q1
   Status: `CACHED`. A 250 m pixel can include neighbouring land.

4. **Esri World Imagery (not NASA).**
   Tile service for the map's Satellite view: https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer
   Attribution: Esri, Maxar, Earthstar Geographics. Status: `LIVE` while the Satellite view is on.

5. **NASA GPM IMERG Late Run V07 (`GPM_3IMERGDL`).**
   Daily precipitation for the 0.1 degree cell nearest each reference town, 15 Sep - 12 Nov 2026,
   read through NASA OPeNDAP with an Earthdata token by `backend/app/data_sources/fetch_imerg.py`,
   which records the run (`Late`) on every row. https://disc.gsfc.nasa.gov/datasets/GPM_3IMERGDL_07/summary
   Status: `CACHED`.

6. **NASA SMAP SPL3SMP_E v006 soil moisture.**
   AM and PM surface soil moisture with retrieval quality flags, last 120 days, 9 km grid cell, point
   samples requested through NASA AppEEARS by `backend/app/data_sources/fetch_appeears.py`.
   Only retrievals flagged "recommended quality" are kept (44 of 944).
   https://appeears.earthdatacloud.nasa.gov/
   Status: `CACHED` for Myaungmya, Pathein and Bogale; `UNAVAILABLE` for Twante (no recommended-quality
   reading in the window), which the UI lists as missing information.

7. **ISRIC SoilGrids v2.0 (not NASA).**
   `phh2o`, `clay`, `silt`, `sand` (0-5 cm mean), 250 m.
   https://rest.isric.org/soilgrids/v2.0/properties/query
   Status: `CACHED`. Predicted map value at the field centre, not a soil test. Licence: CC BY 4.0.

## Crop and agronomy references

8. **FAO EcoCrop.**
   Crop cycle length, pH optimum and absolute range, temperature maximum, texture classes and
   drainage tolerance for rice, mung bean (green gram) and black gram (matpe). Accessed through the
   OpenCLIM mirror: https://github.com/OpenCLIM/ecocrop
   Values extracted by `backend/app/data_sources/extract_ecocrop.py` into
   `backend/app/engine/crops.json`, each tagged `source: "ecocrop"` and `verified: true`.
   These are global ranges, not Myanmar-specific recommendations.

9. **Team assumptions (not external references).**
   Sowing windows (`sow_window`), dry-season water-need classes, and pre-monsoon and drainage rule
   weights are design choices. They are tagged `source: "team_notes"` or `source: "design"` and
   `verified: false`. They must be reviewed by a local agronomist before any real-world use.

## Basemap and libraries

10. **OpenStreetMap standard tiles.** https://www.openstreetmap.org/
    Data © OpenStreetMap contributors, ODbL. No API key. CARTO's keyless light basemap was retired
    in 2026 (tiles return an "API KEY REQUIRED" watermark), so the public build uses OSM.

11. **Leaflet 1.9** and **react-leaflet 5**. https://leafletjs.com/ - BSD-2-Clause.

12. **Noto Sans Myanmar**. Self-hosted in `frontend/public/fonts/NotoSansMyanmar.ttf`.
    SIL Open Font License 1.1.

13. **React 19**, **Vite 8**, **FastAPI**, **Pydantic**. Standard open-source licences.

14. **Myanmar Department of Agriculture (MOALI), Seed Division** - Myanmar Seed Information Portal,
    "Format for Seed Registration Protocol": rate of fertilizer used in monsoon variety trials for
    black gram (<http://myanmarseedportal.gov.mm/en/protocol/black-gram>) and green gram / mung bean
    (<http://myanmarseedportal.gov.mm/en/protocol/green-gram>). Read 14 Nov 2026. Shown in the
    Fertiliser guide as published general rates, not field prescriptions. The site's HTTPS
    certificate did not match its domain at the time, so the pages were read over HTTP.
    No rice rate is shown: the Department of Agricultural Research rates quoted in ACIAR guides
    could not be opened to check them.

15. **Atkinson Hyperlegible** (Braille Institute of America). Bundled via `@fontsource/atkinson-hyperlegible`.
    SIL Open Font License 1.1.

16. **NASA GPM IMERG monthly, Final run** - `GPM_3IMERGM` V07, 0.1 degree, 2001-2025, read through
    GES DISC OPeNDAP for each reference town's cell. Used for monthly rainfall averages in the
    "Other crops and fruits" list, because NASA POWER corrected precipitation at the west Delta
    cells averages 600-1,100 mm a year at Pathein and Myaungmya, far below observed Delta rainfall.

17. **EcoCrop suitability method** - Hijmans, R.J. et al. (2001) "Computer tools for spatial analysis
    of plant genetic resources data: 1. DIVA-GIS", *Plant Genetic Resources Newsletter* 127: 15-19;
    Ramirez-Villegas, J. et al. (2013) "Implications of regional improvement in global climate models
    for agricultural impact research", *Environmental Research Letters* 8: 024018. Crop ranges for
    20 Delta crops and fruits from the FAO EcoCrop database (entry 3 above); watermelon is left out
    because EcoCrop gives it no growing-period length.


18. **Soil sampling steps** - Zurweller, B., *Soil Testing for the Farmer*, Publication P3858,
    Mississippi State University Extension (<https://extension.msstate.edu/publications/soil-testing-for-the-farmer>).
    Used for the soil pH guide: zigzag pattern, at least 15 cores, skip unusual spots, scrape off
    residue, 6 inch depth, mix after drying, test every 3 years or once per rotation. Kit amounts
    and waiting times are left to each kit's own leaflet.

19. **Crop photos (Wikimedia Commons)** - cropped to 256 px squares in `frontend/src/assets/`; the
    cropped versions are shared under the same licence.
    - Black gram: Sanjay Acharya, "Black gram.jpg", CC BY-SA 3.0, <https://commons.wikimedia.org/wiki/File:Black_gram.jpg>
    - Mung bean: Sanjay Acharya, "Green Mung Beans.jpg", CC BY-SA 4.0, <https://commons.wikimedia.org/wiki/File:Green_Mung_Beans.jpg>
    - Paddy: Undeka 11, "Ripening rice plants in paddy field, Indonesia.jpg", CC BY-SA 4.0,
      <https://commons.wikimedia.org/wiki/File:Ripening_rice_plants_in_paddy_field,_Indonesia.jpg>

20. **Soil reaction (pH) classes** - Soil Science Division Staff (2017), *Soil Survey Manual*, USDA
    Handbook 18, chapter 3. Used only to name the topsoil pH class (for example 6.1-6.5 "slightly acid")
    on My Fields; no suitability verdict is drawn from it.

## Data-status vocabulary

- `LIVE` - retrieved or streamed from the source during the current session.
- `CACHED` - retrieved earlier and stored with a retrieval timestamp.
- `DEMO` - illustrative project data, not an observation.
- `UNAVAILABLE` - the source exists but was not retrieved for this build.
- `USER-INPUT` - entered by the farmer in the interface.

No value is labelled `LIVE` unless it is actually fetched in the session. Historical climatology is
never labelled as a forecast.
