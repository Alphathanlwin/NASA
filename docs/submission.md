# Submission notes

**Event:** NASA Space Apps Challenge 2026, Yangon
**Challenge:** 07 - Field Shift: Adapting Farms with NASA Data
**Project:** Field Shift - seasonal crop-rotation decision support for the Ayeyarwady Delta
**Team:** Field Shift
**Public demo (no login):** https://alphathanlwin.github.io/NASA/
**Source:** https://github.com/Alphathanlwin/NASA

## What the judges can do in five minutes

1. Open the public URL. It loads in English with no login and no backend.
2. Pick a field (Myaungmya, Pathein, Bogale, Twante). Note the nearest-reference line: the values
   are for a NASA POWER grid cell, not the field.
3. Open **Overview** and expand any value. The panel shows dataset, product, variable, unit,
   spatial resolution, period, retrieval time and status.
4. Open **Compare crops**. Three rotations are scored. Rice to rice is the baseline. Each plan
   shows reasons for, reasons against, evidence references, missing information and local checks.
   Change the priority sliders; the weights renormalise to 100. Enter a price and a cost for all
   three crops to enable income.
5. Open **Scenarios**, choose a 14-day planting delay. Rice-to-rice falls from 14.7 to 11.2 while
   the legumes hold. The screen lists the changed assumptions and the reason text that moved.
6. Open **Data & Quality** for the source catalogue and the cleaning report.
7. Switch to Burmese with the toggle or `?lang=my`.

## What is included

- Four demo fields, one per reference town, at real coordinates with illustrative geometry.
- NASA POWER recent and 30-year climatology, NASA GPM IMERG (Late run) rainfall, NASA SMAP soil
  moisture, MODIS NDVI, SoilGrids topsoil, source catalogue and cleaning report.
- A deterministic rules engine with a Python canonical implementation and a parity-tested
  TypeScript port.
- Twelve hero scenarios and a what-if comparison screen.
- A deterministic nine-step agent log with a clearly labelled visual metaphor.
- English and Burmese UI strings, self-hosted Myanmar font, acres only.
- A static snapshot build that works with the backend stopped.

## Deliberate limitations

- No yield, profit, or price prediction. Income ranks farmer-entered numbers only.
- SMAP has no recommended-quality reading for the Twante cell in the last 120 days; that field shows
  `UNAVAILABLE` and lists it as missing information.
- Salinity is not in these datasets.
- Field geometry, crop history and irrigation flags are `DEMO`.
- Crop rules have not been reviewed by a local agronomist; the `verified` flag separates FAO
  EcoCrop ranges from team assumptions.
- The Burmese dictionary is a first draft and has not been reviewed by a native speaker.
- The map uses keyless OpenStreetMap tiles because CARTO's keyless light basemap was retired in
  2026. The Satellite view uses Esri World Imagery (not NASA), credited on the map.

- Fertiliser amounts are not predicted. The Fertiliser guide shows the Department of Agriculture's
  published trial rate for black gram and mung bean with its source; rice shows no rate because the
  original could not be checked.

## Future work: a fertiliser model

A model that recommends fertiliser for a specific field, to keep the soil healthy over many seasons,
needs data this prototype does not have: Delta trial plots or farmer fields where the fertiliser
applied, soil tests before and after, and the harvest are recorded over several seasons, ideally
collected with township extension officers. With that data a model could be trained on part of the
fields and judged on fields it has never seen, season by season, before any number is shown to a
farmer. Until then Field Shift shows published rates with their source and does not calculate one.

## AI disclosure

Claude Code (Anthropic) was used as a coding assistant for the pipeline, engines, tests, React
interface and documentation. The app makes no LLM calls at runtime. All displayed environmental
values come from the project datasets and the deterministic engine. AI-assisted files carry an
`AI-assisted: Claude Code` header.

## Before a real pilot

The open questions in the project brief still apply: which townships and boundaries, which local
extension partner reviews the crop rules, how farmer consent and crop history are collected, which
local soil and salinity data are trustworthy, and which Burmese terms and units farmers actually
use. Until those are answered this is a prototype decision-support tool, not a validated advisory
service.
