# Submission notes

**Event:** NASA Space Apps Challenge 2026, Yangon  
**Challenge:** 07 - Field Shift: Adapting Farms with NASA Data  
**Project:** Garvesty — Space+Ground Fused Agricultural Decision-Support System  
**Team:** Garvesty  
**Public demo (no login):** https://alphathanlwin.github.io/NASA/  
**Source:** https://github.com/Alphathanlwin/NASA  

## What the judges can do in five minutes

1. Open the public URL. It loads in English and Burmese with no login and full responsive navigation.
2. Explore the **Farmer Workspace (F1–F6)**:
   - **F1 Overview**: Township reference context, soil properties, and NASA POWER environmental conditions.
   - **F2 My Farm**: Field layout, acre metrics, and crop history.
   - **F3 Environment**: Multi-tenses time context (past dry/wet spells & NDVI drops, present state with stress flags, and 28-day physics-informed root-zone projection).
   - **F4 Compare**: Multi-criteria rotation planner scoring soil health, water demand, and farmer priorities.
   - **F5 Scenarios**: Rule 9 input-shock adaptation testing fertilizer constraints, pesticide availability, and tight cash flow.
   - **F6 Report**: Exportable summary of recommendations and verified agronomic findings.
3. Explore the **Analyst Workspace (A1–A4)**:
   - **A1 Overview**: Regional observation coverage and live sensor mesh telemetry.
   - **A2 Field Intelligence**: Conformal prediction uncertainty bands and in-situ IoT probe ground truth fusion.
   - **A3 Catalogue**: NASA & open dataset provenance, spatial resolutions, and license attribution.
   - **A4 Quality & Models**: Gated model verification manifest (Track 1 Ridge experimental, Tracks 2 & 3 blocked).
4. Test **Scenarios**: Choose planting delays or input shocks; view transparent adjustments with farmer-reported justifications.
5. Review **Data & Quality**: Check the complete data cleaning report and data usage provenance.
6. Switch to Burmese via the header language toggle.

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
