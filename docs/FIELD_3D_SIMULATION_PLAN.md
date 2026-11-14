# Field view 3D simulation: implementation plan

Status: plan, not built. Target: NASA Space Apps 2026 demo (deadline 15 Nov 2026).
Audience: the coding agent that will build it. Read this file in full before editing.

## 1. What we are building

Clicking a demo field on the map takes the user **into the field**: a Three.js scene with a
farmer-agent character standing in front of the field. Floating, animated cards beside the field
show the rotation options the engine already ranks. The user picks one. The agent plants it. A time
control lets the user skip ahead, and the field and its parameter panel change over the season.
A **Map** button switches back to the map at any time, and the user can go back and forth.

Demo script, which must work end to end without internet:

1. Open the app and click field **F-01** on the map.
2. The existing agent-travel animation plays on the map, then the view switches to the 3D field.
3. The field shows **Paw San rice** already standing (monsoon crop, close to harvest in mid-November).
4. Three cards float beside the field: Rice → Rice (usual), Rice → Mung bean, Rice → Black gram,
   each with its rank, score and top reason, taken from the engine.
5. Click **Mung bean**. The agent harvests the rice, walks the rows and sows mung bean.
6. Press **Skip 2 weeks** or **Play**. The plants grow through their stages, the soil and weather
   panel updates, and the timeline marks the events.
7. Reach harvest. A summary card compares the outcome with the usual Rice → Rice path.
8. Click **Map** to go back to the map with the same field still selected.

## 2. Non-negotiable rules (from the project's data-honesty rules)

- The simulation is **illustrative, not a yield forecast**. Every sim panel shows the badge
  `SIMULATED` and the line "Illustrative scenario, not a yield guarantee." in both EN and MY.
- Weather inside the sim comes from the field's **real NASA POWER day-of-year climatology**
  (`climatologyOf(snap, field)`). Label it "NASA POWER normals, not a forecast".
- The soil and plant state variables are produced by **team rules**, not measurements. Show them
  with the `SIMULATED` badge, never `LIVE` or `CACHED`.
- "Paw San" is a **display variety label** on the existing `rice` crop. Mark it `DEMO`. Do not add a
  new crop to `crops.json` and do not change engine scores.
- Do not change engine ranking logic. The cards display the output of `runPlans()` unchanged.
  The parity test (`npm run test:parity`) must still pass.
- No new network calls. Everything runs from `public/snapshot.json` plus the bundled assets.
- Same inputs give the same output: the sim is a deterministic pure function, with no `Math.random()`
  (if visual jitter needs randomness, use a seeded PRNG).

## 3. Current code you build on

| Thing | Where | Use it for |
|---|---|---|
| App shell, field selection, tabs | `frontend/src/App.tsx` | add a `view: 'map' \| 'field'` state |
| Map + click handler | `frontend/src/components/MapView.tsx` (`eventHandlers.click → onSelect(id)`) | trigger entering the field |
| Agent travel animation on the map | `MapView.tsx` + `field.agent_run` (`travel_ms`, `waypoints`) | play first, then switch view |
| Ranked plans | `runPlans(snap, field, priorities, econ)` in `src/data.ts` → `evaluate()` in `src/engine/engine.ts` | card content (`plans[]`: `id`, `rank`, `score`, `sequence`, `dry_crop`, `reasons_for`, `reasons_against`, `calendar`) |
| Crop facts | `TABLE.crops[id]` in `src/engine/crops.ts` (generated, **do not edit**) | `cycle_days`, `sow_window`, `legume`, `water_category`, `temp_abs_max_c`, `waterlogging_tolerance` |
| Sow and harvest days | `plan.calendar` → `{ sow_day, harvest_day, sow, harvest, onset_doy }` | the sim timeline |
| Field climatology | `climatologyOf(snap, field)` → `{ rain_mm[], t2m_max[], t2m_min?, rh2m?, onset_doy? }` indexed by day of year | daily weather inside the sim |
| Current field state | `field.values` (`gwetroot`, `soil_ph`, `clay_pct`, `sand_pct`, `t2m`, `rain_30d`, `ndvi`, …) | sim day-0 initial values |
| Text | `src/i18n/en.json`, `src/i18n/my.json` via `t(key, params)` | every new string |

Plans available today: `rice_rice` (baseline), `rice_mung_bean`, `rice_black_gram`. Fields: F-01…F-04.

**Climatology format (checked 14 Nov 2026 against `public/snapshot.json`):** `snap.climatology` is
keyed by town (`bogale`, `myaungmya`, `pathein`, `twante`), and fields link to it through `town_id`
(F-01 → `myaungmya`). `rain_mm`, `t2m_max`, `t2m_min` and `rh2m` are **daily arrays of 366 values**,
indexed `[doy - 1]`, with no nulls. `rain_mm` is **mm per day** (the mean for that calendar day over
the years used). There is no `onset_doy` key; compute it with `onsetDoy(clim)` from `engine.ts`.
On 14 Nov, Myaungmya reads 0.19 mm rain and 34.0 °C max.

**Rainfall is low in absolute terms.** The annual totals are Twante 2,773 mm, Bogale 1,377,
Myaungmya 934 and Pathein 810 mm. Delta stations usually report about 2,500–3,000 mm. The pipeline
already says so in the `power_clim` provenance note (`backend/app/data_sources/clean_all.py:253`), and
it excludes 11 of 30 years as inhomogeneous. In the sim:

- Use rainfall for **timing and relative change** (dry season versus monsoon, wet or dry spells),
  not as a calibrated water balance. Tune the bucket constants (`k_rain`, `k_et`) so the dry and wet
  seasons look plausible on all four towns. Do not rescale the data itself.
- Show the same caveat in the HUD next to the rain value: "Modelled rainfall, lower than local gauge
  totals. Indicative only."
- Add a test that runs a full year for each of the four towns and checks that `soilMoisture` stays
  inside 0..1 and is higher in August than in February.

## 4. Libraries

Add to `frontend/package.json`, pinning exact versions after a successful local install:

| Package | Why |
|---|---|
| `three` | renderer |
| `@react-three/fiber` (v9, React 19 compatible) | React bindings |
| `@react-three/drei` (v10) | camera controls, `Sky`, `ContactShadows`, `Instances`, `useGLTF` |
| `@types/three` (dev) | types |
| `vitest` (dev) | unit tests for the sim model |

No physics engine, no game engine, no state library. Keep React state plus one reducer.

**Assets:** build the field, plants, agent and props from primitive geometry (boxes, cylinders,
cones, planes) with flat low-poly materials. That avoids licensing questions and keeps the bundle
small. If a nicer agent model is wanted, use a **CC0** GLB (for example from Kenney or Quaternius),
put it in `frontend/public/models/`, and record its source and licence in `docs/REFERENCES.md`.

**Bundle:** lazy-load the 3D view with `const FieldScene = lazy(() => import('./field3d/FieldScene'))`
so the map view does not pay for Three.js.

## 5. File layout (new)

```text
frontend/src/
  sim/
    types.ts          SimState, SimEvent, Stage, Action types
    model.ts          pure step(state, clim, crop, days) -> state; no React, no Three
    timeline.ts       builds the season plan (harvest rice -> sow chosen crop -> stages -> harvest)
    presets.ts        demo preset: field F-01, Paw San rice standing, start day = 14 Nov
    model.test.ts     vitest
  field3d/
    FieldScene.tsx    <Canvas>, lights, sky, camera, composition (lazy-loaded entry)
    Terrain.tsx       field plot, bunds, water layer for flooded paddy, soil colour by moisture
    Crops.tsx         instanced plants; mesh and scale by crop + stage
    Agent.tsx         farmer character; idle / walk / plant / harvest animations along a path
    Props.tsx         hut, tree line, water channel (static, cheap)
    Weather.tsx       rain particles when sim rain > threshold, sun angle by time of day
    useSim.ts         reducer + play loop (requestAnimationFrame, fixed sim speed)
  components/
    FieldView.tsx     page wrapper: lazy FieldScene + DOM overlays below
    PlanCards.tsx     floating recommendation cards (DOM overlay, CSS animation)
    SimHud.tsx        parameter panel, time controls, timeline, badges
    SimSummary.tsx    end-of-season comparison card
    WebGLFallback.tsx 2D version if WebGL is missing
```

Cards and HUD are **DOM overlays on top of the canvas**, not 3D text. That way Burmese text uses the
bundled Noto Sans Myanmar font, screen readers work, and i18n stays the same as the rest of the app.
Use drei `<Html>` only for small in-world labels (for example, a stage name above the field).

## 6. Navigation (map ↔ field)

In `App.tsx`:

- Add `const [view, setView] = useState<'map' | 'field'>('map')`.
- Mirror it in the URL: `?view=field&field=F-01` (use `history.replaceState`, as `setLang` does),
  so a reload lands on the same screen. Read it on load.
- **Map → field:** clicking a polygon in `MapView` calls `onSelect(id)` as now and also
  `onEnter(id)`. `App` waits for the agent travel animation (`agent_run.travel_ms`, capped at 2.5 s)
  and then sets `view = 'field'`. Also add an **Enter field** button in the map panel and on the
  selected field chip, for keyboard users.
- **Field → map:** a fixed **Map** button (top-left in the field view, `aria-label`, shortcut `M`)
  sets `view = 'map'`. Keep `selectedId`, the chosen plan and the sim state in `App`, so going back
  into the field resumes where the user left off. Add a **Restart** button in the HUD.
- The top bar, language toggle and footer stay visible in both views. In field view the tabs are
  hidden, and the field view takes the main area.
- Transition: a 300 ms fade/zoom with CSS. Skip it under `prefers-reduced-motion`.

## 7. Simulation model (`src/sim/`)

Pure TypeScript, deterministic, daily step. This is the part that must be tested.

### State

```ts
type Stage = 'fallow' | 'land_prep' | 'sown' | 'germination' | 'vegetative' | 'flowering'
  | 'pod_or_grain_fill' | 'mature' | 'harvested'

interface SimState {
  fieldId: string
  doy: number                 // day of year, wraps at 366
  dayIndex: number            // days since sim start
  crop: string | null         // crop id from TABLE.crops ('rice', 'mung_bean', ...)
  varietyLabel?: string       // 'Paw San' for the demo rice (DEMO)
  sowDoy: number | null
  stage: Stage
  stageProgress: number       // 0..1 through the whole cycle
  soilMoisture: number        // 0..1, starts from field.values.gwetroot
  soilNIndex: number          // 0..100, illustrative; starts at 50
  heatStressDays: number
  waterlogDays: number
  droughtDays: number
  cropHealth: number          // 0..100, illustrative
  waterUsedMm: number         // irrigation the team rules say this crop would need
  events: SimEvent[]          // { dayIndex, doy, kind, labelKey, params }
}
```

### Daily step (team rules; put every constant in one exported `SIM_RULES` object with a comment)

1. **Weather for the day:** `rain = clim.rain_mm[doy-1]`, `tmax = clim.t2m_max[doy-1]`. If
   either is missing, use the last known value and add one `data_gap` event per gap.
2. **Soil moisture bucket:** `m += rain * k_rain - et(tmax, stage) * k_et`, clamped to 0..1.
   Paddy rice keeps `m ≥ 0.9` while it is in the field (flooded). Clay% from `field.values.clay_pct`
   slows drainage, and sand% speeds it up.
3. **Stage:** `stageProgress = (doy - sowDoy) / cycleMidpoint`, where `cycleMidpoint` is the mean of
   `crop.cycle_days.value`, the same assumption the engine uses. Stage thresholds come from a fixed
   table, e.g. germination 0.05, vegetative 0.15, flowering 0.5, fill 0.7, mature 0.95.
4. **Stress counters:**
   - heat: `tmax > crop.temp_abs_max_c.value` → `heatStressDays++`
   - waterlogging: `m > 0.85` and `crop.waterlogging_tolerance.value === 'low'` → `waterlogDays++`
   - drought: `m < 0.25` → `droughtDays++`
   - Each first occurrence adds an event (shown on the timeline and as a toast).
5. **Crop health:** starts at 100 at sowing and loses fixed points per stress day. Floor 0.
6. **Soil N index:** legume crops (`crop.legume.value`) gain per day in the vegetative to fill
   stages, a non-legume loses per day, and fallow is unchanged. This only shows the direction; label it.
7. **Water use:** if the crop's `water_category` is high or very high in the dry season and rain is
   below need, add the deficit to `waterUsedMm`. When `field.irrigation === 'unavailable'`, add a
   `no_irrigation` warning event instead. That matches the engine's `irrigated_crop_unavailable` rule.

`step(state, clim, crop, days)` loops the daily step `days` times and returns a new state. It must
never mutate its input.

### Timeline for the demo (`timeline.ts`, `presets.ts`)

- Start: **14 Nov** (doy 318). F-01 has Paw San rice at `mature`, `stageProgress ≈ 0.95`.
- Choosing a plan schedules: harvest rice (day 0–2, with an agent animation) → land prep (2–5 days)
  → sow the dry crop on `plan.calendar.sow_day` (if that is earlier than today, sow on day 5 and
  add a `late_sowing` event) → grow → harvest at `plan.calendar.harvest_day` → `harvested`.
- Choosing the usual Rice → Rice schedules a dry-season rice crop instead. Use its own calendar.
- The season can cross the year end. Wrap `doy`, and keep `dayIndex` increasing.

### Tests (`model.test.ts`, `npm run test:sim`)

- The same inputs produce the same state twice (determinism).
- Mung bean on F-01 reaches `mature` close to `cycleMidpoint` days after sowing.
- The legume raises `soilNIndex`, and dry-season rice lowers it.
- Missing climatology values produce `data_gap` events, not `NaN`.
- `step(s, …, 10)` equals ten calls of `step(s, …, 1)`.
- An unirrigated field with dry-season rice produces a `no_irrigation` event.

## 8. 3D scene (`src/field3d/`)

Keep it light: it must hold 60 fps on a mid-range laptop and stay usable at 30 fps.

- **Camera:** a fixed, slightly elevated three-quarter view of the field, with the agent in the
  foreground. `OrbitControls` limited (azimuth ±40°, polar 35–70°, zoom range small). Double-click
  resets the view.
- **Terrain:** one plane for the plot, with low raised bunds around it. Soil colour lerps from dry
  tan to wet dark brown by `soilMoisture`. A semi-transparent water plane is visible only for flooded
  rice. A water channel along one side.
- **Crops:** one `InstancedMesh` per crop type, laid out as a grid of rows (about 20 × 30). Rice is
  thin green-to-gold blades (colour by stage). Mung bean is a small bushy low-poly plant with pods in
  the fill stage. Height and scale follow `stageProgress`. Stressed plants tint yellow-brown in
  proportion to `100 - cropHealth`. Change only the instance matrices and colours each frame; never
  rebuild geometry.
- **Agent:** a farmer built from primitives (body, head, conical hat, arms), with a simple procedural
  animation (bob, arm swing). Actions are scripted paths: walk to a row, bend to plant or harvest,
  return. While the agent acts, the sim pauses, and it resumes after.
- **Weather:** rain particles when the day's sim rain is above 5 mm. The sun's position follows a
  time-of-day loop during play. Use drei `Sky`. Shadows only from `ContactShadows`, with no real-time
  shadow maps.
- **Performance guards:** `dpr={[1, 1.5]}`, `frameloop="demand"` while paused, dispose of geometry on
  unmount, and no post-processing.

## 9. UI overlays

### Floating plan cards (`PlanCards.tsx`)

- Placed to the right of the field (stacked below the canvas on narrow screens). There are three
  cards, sorted by `rank`, each with the sequence (e.g. "Rice → Mung bean"), rank, score, category
  label, the first `reasons_for` and the first `reasons_against` sentence, and an **Plant this**
  button. The baseline card is tagged "Your usual rotation".
- Animation: each card gently floats (translateY ±6 px, 4 s loop, staggered). Hover or focus lifts it
  and draws a dashed outline on the matching area of the field. The selected card pins to the top and
  the others fade to 40%. CSS only, and disabled under `prefers-reduced-motion`.
- A **Why?** link expands to the full reasons and evidence, reusing the existing `PlansPanel`
  rendering if possible.

### HUD (`SimHud.tsx`)

- **Date and stage:** "Day 23 · 7 Dec · Mung bean · Vegetative".
- **Controls:** Play/Pause · Skip 1 week · Skip 2 weeks · Skip to next stage · Skip to harvest ·
  Restart. Speed while playing: 1 sim day per 0.5 s. Each control has an `aria-label` and a
  keyboard shortcut (Space, `]`, `}`, `N`, `H`, `R`).
- **Parameter panel:** soil moisture, soil N index, today's rain and max temperature, crop health,
  heat, waterlogging and drought stress days, and irrigation water used. Each value shows its badge
  (`NASA POWER normal` or `SIMULATED`) and a small sparkline of the season so far (SVG, no chart
  library).
- **Timeline:** a horizontal bar from start to harvest, with stage bands and event markers (harvest,
  sowing, heat, rain, drought, waterlogging, data gap). Clicking a marker shows its sentence.
- **Persistent footer:** "Illustrative scenario, not a yield guarantee."

### Summary (`SimSummary.tsx`)

At harvest, compare the chosen plan with the baseline Rice → Rice run in the background with the same
inputs: soil N index change, irrigation water used, stress days, and days the field was in use. Use
the engine's scores for the ranking statement, never the sim, and repeat the disclaimer. Buttons:
**Try another option** (resets to day 0 with the rice standing) and **Back to map**.

## 10. Fallbacks and states

- **No WebGL** (`!renderer.capabilities` / context creation fails): show `WebGLFallback`, a 2D SVG
  field with the same cards, HUD and sim. The sim model is independent of Three, so it still works.
- **Loading:** a skeleton over the canvas while the lazy chunk loads.
- **No climatology for the field:** the sim still runs on `field.values` (with constant weather) and
  shows a "Weather normals unavailable" banner.
- **No plans** (`runPlans` returns none): show the existing error copy and the Map button only.

## 11. i18n

Add every new string to both `src/i18n/en.json` and `src/i18n/my.json` under the prefixes `field3d.*`
and `sim.*` (stage names, controls, event sentences, badges, disclaimer). If a Burmese translation is
missing, leave the English value in `my.json` and list the key in the PR description for the team to
translate. Never hard-code text in components.

## 12. Build order (each step leaves the app working)

| # | Step | Done when |
|---|---|---|
| 1 | `src/sim/` model, presets, tests | `npm run test:sim` passes; the state for F-01 + mung bean can be printed in a script |
| 2 | `view` state, URL sync, Enter field / Map buttons, empty `FieldView` | can switch back and forth and reload into either view |
| 3 | Map click → agent travel → field view | clicking F-01 lands in the field view after the travel animation |
| 4 | `FieldScene` with terrain, props, camera, standing Paw San rice | the 3D scene renders, the map chunk stays free of Three (check the build output) |
| 5 | `PlanCards` from `runPlans()` | three cards with real ranks and reasons; matches the Compare tab |
| 6 | Planting flow: choose a card → agent harvests → sows → sim starts | mung bean appears in rows after the agent animation |
| 7 | `SimHud` time controls, parameter panel, timeline | skipping updates plants, soil colour and numbers consistently |
| 8 | Stress visuals, rain particles, events | a heat or rain day visibly changes the scene and logs an event |
| 9 | `SimSummary` + background baseline run | harvest shows the comparison and the disclaimer |
| 10 | Fallback, reduced motion, keyboard, i18n in MY | works with WebGL disabled, with only the keyboard, and with `?lang=my` |
| 11 | Polish + performance pass | ≥ 30 fps on the demo laptop, with no console errors |

If time runs short, steps 1–7 are the demo. Steps 8–11 are polish.

## 13. Acceptance checklist

- [ ] Clicking F-01 on the map enters the field view, and **Map** returns with the selection kept.
- [ ] Paw San rice is standing and labelled `DEMO`.
- [ ] The cards show the same plans, ranks and scores as the Compare tab.
- [ ] Choosing Mung bean triggers the harvest and sowing animation, and the plants appear.
- [ ] Skip and Play move the date, the stages, the plants and the parameter panel together.
- [ ] Every sim value carries a `NASA POWER normal` or `SIMULATED` badge, and the disclaimer is always visible.
- [ ] The same choices give the same result twice (determinism test).
- [ ] `npm run build`, `npm run lint`, `npm run test:parity` and `npm run test:sim` all pass.
- [ ] Works offline from `public/snapshot.json`.
- [ ] Usable without a mouse, with reduced motion, without WebGL, and in Burmese.
- [ ] No change to `backend/app/engine/crops.json`, `src/engine/crops.ts` or the engine scores.

## 14. Out of scope

Real yield prediction, live sensor data in the sim (that is the IoT plan), multiplayer, saving
games to the backend, crops beyond the three plans, physics, sound (optional extra, off by default).
