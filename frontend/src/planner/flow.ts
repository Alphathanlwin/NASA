// AI-assisted: Claude Code
// Farmer planner flow: turns the farmer's validated answers into the engine's existing inputs
// (priority weights + scenario), and builds the cross-checks and plain-words reasons.
// Pure functions only. The engine (engine.ts, crops.ts) is not changed.
//
// What maps onto the engine, and what does not:
//   priority + trade-off  -> priority weights (team mapping, shown in Details)
//   dry-season water      -> scenario.irrigation
//   water stays long      -> scenario.drainage
//   flood + water stays   -> scenario.planting_delay_days (team rule: wait for the water to drain)
//   drought + no water    -> scenario.residual_moisture = low
//   fertiliser / pesticide / cash -> reasons only, from crop facts (legume, crop family)
//   seed, fuel, selling price, labour, tractor, storm, heat, erosion -> NOT scored; listed as
//     "check locally" so the farmer's answer is never silently dropped.
import { TABLE } from '../engine/crops'
import type { Priorities, Scenario } from '../engine/types'

export type Tri = 'yes' | 'no' | 'unsure'
export type PriorityId = 'money' | 'soil' | 'water' | 'safe'
export type Disaster = 'flood' | 'drought' | 'storm' | 'heat' | 'pest' | 'erosion' | 'none'
export type Water = 'available' | 'sometimes' | 'unavailable' | 'unsure'

export const PRIORITY_IDS: PriorityId[] = ['money', 'soil', 'water', 'safe']
export const DISASTERS: Disaster[] = ['flood', 'drought', 'storm', 'heat', 'pest', 'erosion', 'none']
/** Step 3: what prices did. "yes" always means the pressure is there. */
export const PRICE_KEYS = ['fert', 'seed', 'fuel', 'sell'] as const
/** Step 4: what the farmer has. "yes" always means it is short. Water is asked separately. */
export const LIMIT_KEYS = ['labour', 'machine', 'pesticide', 'cash'] as const
export type PriceKey = (typeof PRICE_KEYS)[number]
export type LimitKey = (typeof LIMIT_KEYS)[number]

export interface Answers {
  priority: PriorityId | null
  tradeoff: 'keep' | 'switch' | null
  disasters: Disaster[]
  waterStays: Tri | null
  water: Water | null
  prices: Partial<Record<PriceKey, Tri>>
  limits: Partial<Record<LimitKey, Tri>>
}

export const EMPTY: Answers = {
  priority: null, tradeoff: null, disasters: [], waterStays: null, water: null, prices: {}, limits: {},
}

export const STEPS = 6

/** Team mapping from a confirmed priority to the engine's existing weights. Shown in Details. */
const WEIGHTS: Record<PriorityId, Priorities> = {
  money: { income: 60, soil_health: 20, water_saving: 20 },
  soil: { income: 15, soil_health: 60, water_saving: 25 },
  water: { income: 15, soil_health: 25, water_saving: 60 },
  safe: { income: 20, soil_health: 40, water_saving: 40 },
}
const BALANCED: Priorities = { income: 34, soil_health: 33, water_saving: 33 }

export function prioritiesFor(a: Answers): Priorities {
  if (!a.priority || a.tradeoff === 'switch') return BALANCED
  return WEIGHTS[a.priority]
}

/** Days sowing waits after a flood. Team rule, not a measurement. */
export const FLOOD_DELAY = { stays: 14, drains: 7 }

export function scenarioFor(a: Answers): Scenario {
  const s: Scenario = {}
  if (a.water && a.water !== 'unsure') s.irrigation = a.water
  if (a.waterStays === 'yes') s.drainage = 'poor'
  if (a.waterStays === 'no') s.drainage = 'good'
  if (a.disasters.includes('flood')) s.planting_delay_days = a.waterStays === 'yes' ? FLOOD_DELAY.stays : FLOOD_DELAY.drains
  if (a.disasters.includes('drought') && a.water === 'unavailable') s.residual_moisture = 'low'
  return s
}

// ---------- step gates ----------

export function stepDone(step: number, a: Answers): boolean {
  switch (step) {
    case 1: return !!a.priority && !!a.tradeoff
    case 2: return a.disasters.length > 0 && !!a.waterStays
    case 3: return PRICE_KEYS.every((k) => !!a.prices[k])
    case 4: return !!a.water && LIMIT_KEYS.every((k) => !!a.limits[k])
    default: return true
  }
}

// ---------- field reading ----------

type Values = Record<string, { value: number | string | null; period?: string | null } | undefined>

export function numOf(values: Values, key: string): number | null {
  const v = values[key]?.value
  return typeof v === 'number' && Number.isFinite(v) ? v : null
}

export type Wetness = 'wet' | 'moist' | 'dry' | 'unknown'
export const MOISTURE_THRESHOLD = Number(TABLE.assumptions.moisture_threshold.value)

/** Plain-words band for POWER root-zone wetness. Below the engine's threshold counts as dry. */
export function wetness(g: number | null): Wetness {
  if (g === null) return 'unknown'
  if (g < MOISTURE_THRESHOLD) return 'dry'
  return g >= 0.75 ? 'wet' : 'moist'
}

export interface FieldFacts {
  gwetroot: number | null
  wet: Wetness
  rain30: number | null
  rainNormal: number | null
  rainAbove: number | null
  irrigation: string
}

export function factsOf(field: { values: Values; irrigation: string }): FieldFacts {
  const g = numOf(field.values, 'gwetroot')
  const rain30 = numOf(field.values, 'rain_30d')
  const rainNormal = numOf(field.values, 'rain_30d_normal')
  return {
    gwetroot: g, wet: wetness(g), rain30, rainNormal,
    rainAbove: rain30 !== null && rainNormal !== null ? Math.round(rain30 - rainNormal) : null,
    irrigation: field.irrigation,
  }
}

// ---------- cross-checks (validation rule 2 and 3) ----------

export type CheckKind = 'agree' | 'conflict' | 'gap'
export interface Check {
  id: string
  kind: CheckKind
  /** step that the "Change" link returns to */
  step: number
  params: Record<string, string | number>
}

export function crossChecks(a: Answers, f: FieldFacts, incomeEnabled: boolean): Check[] {
  const out: Check[] = []
  const wetNow = f.wet === 'wet' || f.wet === 'moist'
  const g = f.gwetroot === null ? '—' : f.gwetroot.toFixed(2)
  const rain = f.rain30 === null ? '—' : Math.round(f.rain30)
  const above = f.rainAbove ?? 0

  if (a.priority === 'money' && a.tradeoff === 'keep' && !incomeEnabled) {
    out.push({ id: 'money_no_prices', kind: 'gap', step: 1, params: {} })
  }
  if (a.priority === 'water' && a.tradeoff === 'keep' && wetNow) {
    out.push({ id: 'water_but_wet', kind: 'conflict', step: 1, params: { g } })
  }
  if (a.disasters.includes('flood') && wetNow) {
    out.push({ id: 'flood_agrees', kind: 'agree', step: 2, params: { g, rain, above } })
  }
  if (a.disasters.includes('drought') && wetNow) {
    out.push({ id: 'drought_but_wet', kind: 'conflict', step: 2, params: { g, rain } })
  }
  if (a.disasters.includes('none') && f.rainAbove !== null && f.rainAbove >= 50) {
    out.push({ id: 'none_but_wet_month', kind: 'conflict', step: 2, params: { rain, above } })
  }
  if (a.water && a.water !== 'unsure' && a.water !== f.irrigation) {
    out.push({ id: 'water_vs_record', kind: 'conflict', step: 4, params: { record: f.irrigation, said: a.water } })
  }
  if (f.gwetroot === null) out.push({ id: 'no_moisture', kind: 'gap', step: 5, params: {} })
  return out
}

// ---------- the answer ----------

interface PlanLike {
  id: string
  dry_crop: string
  rank: number
  category: string
  is_baseline: boolean
  reasons_for: { rule: string; score_delta: number }[]
  reasons_against: { rule: string; score_delta: number }[]
}

export function topPlan<P extends PlanLike>(plans: P[]): P | null {
  const ok = plans.filter((p) => p.category !== 'not_workable')
  return ok.find((p) => p.rank === Math.min(...ok.map((q) => q.rank))) ?? plans[0] ?? null
}

function cropFacts(id: string) {
  const c = (TABLE.crops as Record<string, any>)[id]
  return {
    legume: Boolean(c?.legume?.value),
    breaksPests: c?.family?.value !== (TABLE.crops as any).rice.family.value,
    lowWater: c?.water_category?.value !== 'very_high',
  }
}

/** i18n keys (under "fp.why.") for the reasons that cite the farmer's own answers. Max 4. */
export function reasonKeys(a: Answers, cropId: string, delay: number): string[] {
  const c = cropFacts(cropId)
  const out: string[] = []
  if (a.prices.fert === 'yes' && c.legume) out.push('fert')
  if ((a.limits.pesticide === 'yes' || a.disasters.includes('pest')) && c.breaksPests) out.push('pest')
  if (a.limits.cash === 'yes' && c.legume) out.push('cash')
  if ((a.water === 'unavailable' || a.water === 'sometimes' || a.disasters.includes('drought')) && c.lowWater) out.push('water')
  if (a.priority === 'soil' && c.legume) out.push('soil')
  if (a.priority === 'water' && c.lowWater && !out.includes('water')) out.push('water')
  if (delay > 0 && !c.legume) out.push('delayRice')
  else if (delay > 0) out.push('delay')
  if (out.length === 0) out.push('fits')
  return out.slice(0, 4)
}

/** Cautions for the recommended crop that come from the farmer's answers. */
export function cautionKeys(a: Answers, cropId: string): string[] {
  const c = cropFacts(cropId)
  const out: string[] = []
  if (a.prices.fert === 'yes' && !c.legume) out.push('fertRice')
  if (a.limits.cash === 'yes' && !c.legume) out.push('cashRice')
  if (a.limits.pesticide === 'yes' && !c.breaksPests) out.push('pestRice')
  return out
}

/** Answers the score cannot use yet. Shown as "check locally", never dropped. */
export function notScored(a: Answers): string[] {
  const out: string[] = []
  for (const d of ['storm', 'heat', 'erosion'] as const) if (a.disasters.includes(d)) out.push(`d_${d}`)
  for (const k of ['seed', 'fuel', 'sell'] as const) if (a.prices[k] === 'yes') out.push(`p_${k}`)
  for (const k of ['labour', 'machine'] as const) if (a.limits[k] === 'yes') out.push(`l_${k}`)
  return out
}

/** Engine rule codes that have a short farmer sentence under "fp.rule.". Others fall back to the engine text. */
export const FARMER_RULES = new Set([
  'family_break', 'family_same', 'legume', 'ph_opt', 'ph_abs', 'ph_out', 'texture_opt', 'texture_abs', 'texture_out',
  'water_low', 'water_very_high', 'irrigated_crop_unavailable', 'irrigated_crop_sometimes', 'irrigated_crop_available',
  'rainfed_crop_irrigation_available', 'moisture_normal', 'moisture_low_irrigation_unavailable',
  'moisture_low_irrigation_sometimes', 'moisture_low_irrigation_available', 'moisture_low_irrigated_crop',
  'harvest_clear', 'harvest_near_onset', 'harvest_after_onset', 'heat_many', 'heat_some',
  'premonsoon_clear', 'premonsoon_hot', 'drainage_good', 'drainage_poor',
])

/** The three strongest engine reasons for a plan, biggest effect first (Miller: three chunks). */
export function topReasons<F extends { rule: string; score_delta: number }>(list: F[], n = 3): F[] {
  return [...list].sort((x, y) => Math.abs(y.score_delta) - Math.abs(x.score_delta)).slice(0, n)
}

// ---------- the "did you plant it?" record ----------

export type Planted = 'planted' | 'not_yet' | 'other'
const FOLLOW_KEY = 'fieldshift.followup.v1'

export function loadFollowUp(fieldId: string): { answer: Planted; at: string } | null {
  try {
    const all = JSON.parse(localStorage.getItem(FOLLOW_KEY) ?? '{}')
    return all[fieldId] ?? null
  } catch {
    return null
  }
}

export function saveFollowUp(fieldId: string, answer: Planted) {
  try {
    const all = JSON.parse(localStorage.getItem(FOLLOW_KEY) ?? '{}')
    all[fieldId] = { answer, at: new Date().toISOString() }
    localStorage.setItem(FOLLOW_KEY, JSON.stringify(all))
  } catch {
    /* storage blocked: the answer still shows for this visit */
  }
}
