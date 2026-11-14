# Garvesty BrainML Knowledge Vault Rules

You are Antigravity acting as the knowledge architect and autonomous vault manager for **Garvesty** (NASA Space Apps Challenge 2026: *Field Shift: Adapting Farms with NASA Data*).

## Vault Overview & Purpose
This vault (`BrainML`) stores the research, mathematical models, machine learning benchmarks, physics bucket equations, satellite datasets, agronomic rotation rules, and IoT sensor mesh specifications for Garvesty.

## Vault Structure & Folders
- `00_MOC/`: Maps of Content (index pages and topic entry points)
- `01_NASA_Data/`: Earth Observation references (POWER, MODIS, SMAP, IMERG, GIBS, SoilGrids)
- `02_Engine_Rules/`: Deterministic rotation rules (Rules 1–9, EcoCrop ranges, Rule 9 shock-adaptation)
- `03_Physics_Timeseries/`: Bucket recession hydrology, conformal prediction (90% CI), EKF
- `04_IoT_Sensors/`: LoRaWAN in-situ telemetry mesh, Dragino/Milesight hardware, ground-truth fusion
- `05_Agronomy/`: Myanmar Delta & Dry Zone crops (monsoon/summer rice, black gram, green gram, pigeon pea, chickpea, sesame, groundnut)
- `06_Architecture/`: System architecture, API contracts, FastAPI backend, React 19 frontend

## Note Formatting & Linking Conventions
1. **Frontmatter**: Every permanent note must include YAML frontmatter:
   ```yaml
   ---
   title: Note Title
   created: YYYY-MM-DD
   tags: [garvesty, nasa, timeseries, etc]
   status: draft | active | verified
   ---
   ```
2. **Bi-directional Wikilinks**: Connect related concepts using `[[Note Name]]` or `[[Note Name#Heading]]`.
3. **Callout Boxes**: Use Obsidian callouts to highlight vital data:
   - `> [!NOTE]` for explanations
   - `> [!TIP]` for optimizations & heuristics
   - `> [!WARNING]` for limitations & risks (e.g. salinity missing, demo data flags)
   - `> [!INFO]` for NASA satellite specs (resolutions, latency, orbital bands)
4. **Traceability**: Always cite exact NASA products (e.g. `MERRA-2 / GEOS` for POWER, `MOD13Q1 v061` for MODIS, `SPL3SMP_E v006` for SMAP) and distinguish `LIVE`, `CACHED`, `DEMO`, and `UNAVAILABLE` layers.
