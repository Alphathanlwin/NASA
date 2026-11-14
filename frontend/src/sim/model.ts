// AI-assisted: Claude Code
// Daily step model for the field simulation. Pure and deterministic: same inputs, same output.
//
// Weather comes from the field's NASA POWER day-of-year normals. Every other number here is a team
// rule chosen to show the direction of change (wetter, drier, more nitrogen, more stress). None of it
// is calibrated, and none of it predicts yield.
import { TABLE } from '../engine/crops'
import type { DayRecord, Schedule, SimContext, SimEvent, SimState, Stage } from './types'

export const SIM_RULES = {
  /** soil moisture gained per mm of rain (0..1 scale) */
  kRain: 0.02,
  /** evaporation + crop use per day at full canopy and 35 °C, before the temperature factor */
  kEt: 0.0075,
  /** moisture above this drains away, faster on sandy soil, slower on clay */
  fieldCapacity: 0.78,
  drainRate: 0.06,
  /** flooded paddy is held at this level while irrigation allows */
  paddyLevel: 0.92,
  /** water depth (mm) represented by the whole 0..1 moisture range, for irrigation totals */
  bucketMm: 150,
  droughtBelow: 0.2,
  waterlogAbove: 0.86,
  heavyRainMm: 8,
  /** crop health points lost per stress day, and regained per calm day */
  heatLoss: 1.5,
  droughtLoss: 2,
  waterlogLoss: 3,
  recovery: 0.25,
  /** soil nitrogen index change per growing day */
  legumeGain: 0.35,
  cerealDraw: 0.25,
  /** progress thresholds for each stage */
  stages: [
    [0.04, 'germination'],
    [0.15, 'vegetative'],
    [0.5, 'flowering'],
    [0.7, 'fill'],
    [0.95, 'mature'],
  ] as [number, Stage][],
  harvestPrevDay: 1,
  prepDays: 3,
  minSowDay: 5,
}

const GROWING: Stage[] = ['sown', 'germination', 'vegetative', 'flowering', 'fill', 'mature']

export function wrapDoy(day: number): number {
  return ((day - 1) % 366 + 366) % 366 + 1
}

export function crop(id: string) {
  const c = (TABLE.crops as Record<string, any>)[id]
  if (!c) throw new Error(`unknown crop ${id}`)
  return {
    id,
    name: c.name as string,
    legume: Boolean(c.legume.value),
    cycle: c.cycle_days.value as [number, number],
    sowWindow: c.sow_window.value as [number, number],
    tempMax: Number(c.temp_abs_max_c.value),
    waterlogTolerance: String(c.waterlogging_tolerance.value),
    water: String(c.water_category.value),
  }
}

export function cycleMidpoint(id: string): number {
  const [lo, hi] = crop(id).cycle
  return Math.floor((lo + hi) / 2)
}

export function stageFor(progress: number): Stage {
  let stage: Stage = 'sown'
  for (const [threshold, s] of SIM_RULES.stages) if (progress >= threshold) stage = s
  return stage
}

function clamp(x: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, x))
}

function round(x: number, d = 3) {
  const k = 10 ** d
  return Math.round(x * k) / k
}

function weather(ctx: SimContext, doy: number, prev: { rain: number; tmax: number }) {
  const rainRaw = ctx.clim?.rain_mm?.[doy - 1]
  const tmaxRaw = ctx.clim?.t2m_max?.[doy - 1]
  const gap = rainRaw == null || tmaxRaw == null
  return {
    rain: rainRaw == null ? prev.rain : Number(rainRaw),
    tmax: tmaxRaw == null ? prev.tmax : Number(tmaxRaw),
    gap,
  }
}

function drainFactor(ctx: SimContext) {
  const clay = ctx.clayPct ?? 30
  const sand = ctx.sandPct ?? 30
  return clamp(1 + (sand - 30) / 60 - (clay - 30) / 80, 0.4, 1.6)
}

/** Crop water use relative to full canopy. Bare soil still evaporates. */
function canopyFactor(stage: Stage, progress: number) {
  if (!GROWING.includes(stage)) return 0.45
  if (stage === 'mature') return 0.6
  return 0.45 + 0.55 * clamp(progress / 0.5, 0, 1)
}

function canIrrigate(ctx: SimContext, day: number) {
  if (ctx.irrigation === 'available') return true
  if (ctx.irrigation === 'sometimes') return day % 3 === 0
  return false
}

/** Starting point for the demo: the monsoon crop is standing, close to harvest. */
export function initialState(opts: {
  fieldId: string
  startDoy: number
  moisture: number | null
  standingCrop?: string
  variety?: string | null
  standingProgress?: number
}): SimState {
  const standing = opts.standingCrop ?? 'rice'
  const progress = opts.standingProgress ?? 0.95
  const cycle = cycleMidpoint(standing)
  const moisture = clamp(opts.moisture ?? 0.6, 0, 1)
  return {
    fieldId: opts.fieldId,
    startDoy: opts.startDoy,
    day: 0,
    doy: opts.startDoy,
    crop: standing,
    variety: opts.variety ?? null,
    sownDay: -Math.round(progress * cycle),
    cycleDays: cycle,
    stage: stageFor(progress),
    progress,
    moisture,
    nIndex: 50,
    health: 90,
    heatDays: 0,
    droughtDays: 0,
    waterlogDays: 0,
    irrigationMm: 0,
    rainToday: 0,
    tmaxToday: 0,
    schedule: null,
    finished: false,
    events: [{ day: 0, doy: opts.startDoy, kind: 'start', params: { crop: standing } }],
    history: [],
  }
}

/**
 * Turns a plan's engine calendar (sow and harvest day of year) into sim days.
 * If the sowing window has already passed, sowing happens as soon as the land is ready.
 */
export function buildSchedule(planId: string, cropId: string, startDoy: number,
  calendar: { sow_day: number; harvest_day: number } | null): Schedule {
  const sowDoy = calendar ? calendar.sow_day : crop(cropId).sowWindow[0]
  const cycleDays = calendar ? calendar.harvest_day - calendar.sow_day : cycleMidpoint(cropId)
  let offset = wrapDoy(sowDoy) - startDoy
  if (offset > 183) offset -= 366
  if (offset < -183) offset += 366
  const ready = SIM_RULES.harvestPrevDay + SIM_RULES.prepDays + 1
  const sowDay = Math.max(ready, SIM_RULES.minSowDay, offset)
  return {
    planId,
    cropId,
    harvestPrevDay: SIM_RULES.harvestPrevDay,
    prepStartDay: SIM_RULES.harvestPrevDay + 1,
    sowDay,
    cycleDays,
    lateSowing: offset < sowDay,
  }
}

export function withSchedule(state: SimState, schedule: Schedule): SimState {
  return { ...state, schedule }
}

/** Advance one day. Never mutates its input. */
function stepDay(s: SimState, ctx: SimContext): SimState {
  const day = s.day + 1
  const doy = wrapDoy(s.startDoy + day)
  const events: SimEvent[] = []
  const add = (kind: SimEvent['kind'], params: SimEvent['params'] = {}) => events.push({ day, doy, kind, params })

  const w = weather(ctx, doy, { rain: s.rainToday, tmax: s.tmaxToday || ctx.fallbackTmax })
  if (w.gap) add('data_gap')

  let { crop: cropId, variety, sownDay, cycleDays, stage, progress, moisture, nIndex, health } = s
  let { heatDays, droughtDays, waterlogDays, irrigationMm, finished } = s
  const sch = s.schedule

  // Scheduled field work.
  if (sch) {
    if (day === sch.harvestPrevDay && cropId) {
      add('harvest', { crop: cropId })
      cropId = null
      variety = null
      stage = 'harvested'
      progress = 0
      health = null
    } else if (day === sch.prepStartDay) {
      add('land_prep')
      stage = 'land_prep'
    } else if (day === sch.sowDay) {
      if (sch.lateSowing) add('late_sowing', { crop: sch.cropId })
      add('sow', { crop: sch.cropId })
      cropId = sch.cropId
      variety = null
      sownDay = day
      cycleDays = sch.cycleDays
      stage = 'sown'
      progress = 0
      health = 100
      heatDays = 0
      droughtDays = 0
      waterlogDays = 0
      const c = crop(cropId)
      if (c.water === 'very_high' || c.water === 'high') {
        if (ctx.irrigation === 'unavailable') add('no_irrigation', { crop: cropId })
      }
    }
  }

  // Crop development.
  if (cropId && sownDay !== null && GROWING.includes(stage)) {
    progress = clamp((day - sownDay) / cycleDays, 0, 1)
    const next = stageFor(progress)
    if (next !== stage) add('stage', { crop: cropId, stage: next })
    stage = next
    if (sch && cropId === sch.cropId && day >= sownDay + cycleDays) {
      add('harvest', { crop: cropId })
      add('season_end', { crop: cropId })
      stage = 'harvested'
      finished = true
    }
  }

  // Soil water bucket.
  const tFactor = clamp((w.tmax - 15) / 20, 0.2, 1.4)
  moisture += w.rain * SIM_RULES.kRain
  moisture -= SIM_RULES.kEt * tFactor * canopyFactor(stage, progress)
  if (moisture > SIM_RULES.fieldCapacity) {
    moisture -= (moisture - SIM_RULES.fieldCapacity) * SIM_RULES.drainRate * drainFactor(ctx) * 4
  }
  const inField = cropId !== null && GROWING.includes(stage)
  const c = cropId ? crop(cropId) : null
  if (inField && c && c.id === 'rice' && moisture < SIM_RULES.paddyLevel) {
    // Paddy is kept flooded by rain or by irrigation if the field has it.
    if (w.rain >= 5 || canIrrigate(ctx, day)) {
      if (w.rain < 5) irrigationMm += (SIM_RULES.paddyLevel - moisture) * SIM_RULES.bucketMm
      moisture = SIM_RULES.paddyLevel
    }
  }
  moisture = clamp(moisture, 0, 1)

  // Stress, only while a crop is growing.
  if (inField && c && health !== null) {
    let stressed = false
    if (w.tmax > c.tempMax) {
      if (heatDays === 0) add('heat', { crop: c.id, t: round(w.tmax, 1), limit: c.tempMax })
      heatDays++
      health -= SIM_RULES.heatLoss
      stressed = true
    }
    if (moisture < SIM_RULES.droughtBelow) {
      if (droughtDays === 0) add('drought', { crop: c.id })
      droughtDays++
      health -= SIM_RULES.droughtLoss
      stressed = true
    }
    if (moisture > SIM_RULES.waterlogAbove && c.waterlogTolerance === 'low') {
      if (waterlogDays === 0) add('waterlog', { crop: c.id })
      waterlogDays++
      health -= SIM_RULES.waterlogLoss
      stressed = true
    }
    if (!stressed) health += SIM_RULES.recovery
    health = clamp(health, 0, 100)

    if (['vegetative', 'flowering', 'fill'].includes(stage)) {
      nIndex += c.legume ? SIM_RULES.legumeGain : -SIM_RULES.cerealDraw
    }
  }
  nIndex = clamp(nIndex, 0, 100)
  if (w.rain >= SIM_RULES.heavyRainMm) add('rain', { mm: round(w.rain, 1) })

  const record: DayRecord = {
    day, moisture: round(moisture), nIndex: round(nIndex, 2),
    health: health === null ? null : round(health, 2), rain: round(w.rain, 2), tmax: round(w.tmax, 1),
  }

  return {
    ...s,
    day, doy, crop: finished ? s.crop ?? cropId : cropId, variety, sownDay, cycleDays, stage, progress: round(progress, 4),
    moisture: round(moisture), nIndex: round(nIndex, 2), health: health === null ? null : round(health, 2),
    heatDays, droughtDays, waterlogDays, irrigationMm: round(irrigationMm, 1),
    rainToday: w.rain, tmaxToday: w.tmax, finished,
    events: events.length ? s.events.concat(events) : s.events,
    history: s.history.concat(record),
  }
}

/** Advance `days` days, stopping early once the season is finished. */
export function step(state: SimState, ctx: SimContext, days = 1): SimState {
  let s = state
  for (let i = 0; i < days && !s.finished; i++) s = stepDay(s, ctx)
  return s
}

/** Advance until the stage changes (or the season ends). */
export function stepToNextStage(state: SimState, ctx: SimContext, maxDays = 200): SimState {
  const from = state.stage
  let s = state
  for (let i = 0; i < maxDays && !s.finished && s.stage === from; i++) s = stepDay(s, ctx)
  return s
}

export function stepToEnd(state: SimState, ctx: SimContext, maxDays = 400): SimState {
  return step(state, ctx, maxDays)
}

/** One-line comparison numbers for the end-of-season summary. */
export function summarise(s: SimState) {
  const first = s.history[0]
  const last = s.history[s.history.length - 1]
  return {
    planId: s.schedule?.planId ?? null,
    crop: s.schedule?.cropId ?? s.crop,
    days: s.day,
    nChange: last && first ? round(last.nIndex - 50, 1) : 0,
    irrigationMm: s.irrigationMm,
    stressDays: s.heatDays + s.droughtDays + s.waterlogDays,
    heatDays: s.heatDays,
    droughtDays: s.droughtDays,
    waterlogDays: s.waterlogDays,
    endHealth: s.history.reduce<number | null>((h, r) => (r.health === null ? h : r.health), null),
    finished: s.finished,
  }
}
