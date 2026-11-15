// AI-assisted: Claude Code
/**
 * TypeScript port of backend/app/engine/engine.py.
 *
 * The static GitHub Pages build runs this in the browser, so sliders and scenarios
 * work with no backend. scripts/parity_test.mjs asserts that this file and the
 * Python engine produce identical scores for the snapshot inputs. Keep them in step.
 */
import { TABLE } from './crops.ts'
import { MY } from './templates_my.ts'
import type {
  Climatology, CropTable, Econ, EngineInputs, Findings, Priorities, Scenario, Unknown,
} from './types'

export const ENGINE_VERSION = TABLE.engine_version
const MONTH_DAYS = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
export const SCENARIO_KEYS = ['irrigation', 'planting_delay_days', 'residual_moisture', 'drainage', 'rainfall_change_percent']

// Language of the reason text. English unless the app switches it; the parity test never does.
let LANG: 'en' | 'my' = 'en'
export function setEngineLang(lang: 'en' | 'my') { LANG = lang }
/** A crop name, family, texture list or local risk in the current language. */
function word(s: string): string {
  return LANG === 'my' ? s.split(', ').map((w) => MY.words[w] ?? w).join('၊ ') : s
}

export function fmt(x: unknown): string {
  if (typeof x === 'string') return x
  const n = Number(x)
  if (Number.isInteger(n)) return String(n)
  return n.toFixed(2).replace(/0+$/, '').replace(/\.$/, '')
}

export function round1(x: number): number {
  return Math.floor(x * 10 + 0.5) / 10
}

function clamp(x: number, lo = 0, hi = 100): number {
  return Math.max(lo, Math.min(hi, x))
}

function wrapDoy(day: number): number {
  return ((day - 1) % 366 + 366) % 366 + 1
}

export function doyLabel(day: number): string {
  let d = wrapDoy(day)
  for (let i = 0; i < MONTH_DAYS.length; i++) {
    if (d <= MONTH_DAYS[i]) return `${d} ${MONTHS[i]}`
    d -= MONTH_DAYS[i]
  }
  return ''
}

function render(code: string, params: Record<string, unknown>): string {
  let text = (LANG === 'my' && MY.templates[code]) || TABLE.templates[code]
  for (const [k, v] of Object.entries(params)) text = text.split(`{${k}}`).join(typeof v === 'string' ? word(v) : fmt(v))
  return text
}

function finding(code: string, component: string, delta: number, params: Record<string, unknown>,
  refs: string[], table: CropTable = TABLE): Findings {
  let unverified = false
  for (const ref of refs) {
    const parts = ref.split('.')
    if (parts[0] === 'crops') unverified = unverified || !table.crops[parts[1]][parts[2]].verified
    else if (parts[0] === 'assumptions') unverified = true
  }
  return { rule: code, component, score_delta: delta, reason: render(code, params), evidence_refs: refs, assumption: unverified }
}

function unknown(code: string, params: Record<string, unknown> = {}): Unknown {
  return { rule: code, reason: render(code, params) }
}

export function onsetDoy(clim: Climatology | null): number | null {
  if (!clim || !clim.rain_mm) return null
  const rain = clim.rain_mm
  const threshold = Number(TABLE.assumptions.onset_rule.value)
  for (let day = 61; day < 245; day++) {
    const window = rain.slice(day - 7, day)
    if (window.some((v) => v === null)) continue
    const sum = window.reduce((a: number, v) => a + Number(v), 0)
    if (sum / 7 >= threshold) return day
  }
  return null
}

function textureClass(clay: number, sand: number | null): string {
  if (clay >= 35) return 'heavy'
  if (clay < 18 && sand !== null && sand > 65) return 'light'
  return 'medium'
}

export function resolveScenario(inputs: EngineInputs, scenario?: Scenario | null): Required<Scenario> {
  const s = scenario ?? {}
  let moisture = s.residual_moisture ?? inputs.field_moisture ?? null
  if (moisture === null) {
    const g = inputs.gwetroot
    moisture = g === null ? 'unknown' : (g < Number(TABLE.assumptions.moisture_threshold.value) ? 'low' : 'normal')
  }
  return {
    irrigation: s.irrigation || inputs.field_irrigation || 'unavailable',
    planting_delay_days: s.planting_delay_days || 0,
    residual_moisture: moisture,
    drainage: s.drainage || inputs.field_drainage || 'unknown',
    rainfall_change_percent: s.rainfall_change_percent || 0,
  }
}

type Rule = (cid: string, crop: Record<string, any>, inputs: EngineInputs, sc: Required<Scenario>) => [Findings[], Unknown[]]

const ruleFamily: Rule = (cid, crop) => {
  const w = TABLE.weights
  const p = { crop: crop.name, family: crop.family.value }
  const refs = [`crops.${cid}.family`, 'assumptions.pest_break']
  if (crop.family.value === TABLE.crops.rice.family.value) {
    return [[finding('family_same', 'soil_health', w.family_same, p, refs)], []]
  }
  return [[finding('family_break', 'soil_health', w.family_break, p, refs)], []]
}

const ruleLegume: Rule = (cid, crop) => {
  if (!crop.legume.value) return [[], []]
  return [[finding('legume', 'soil_health', TABLE.weights.legume, { crop: crop.name },
    [`crops.${cid}.legume`, 'assumptions.legume_soil_benefit'])], []]
}

const rulePh: Rule = (cid, crop, inputs) => {
  const ph = inputs.ph
  if (ph === null) return [[], [unknown('unknown_ph')]]
  const w = TABLE.weights
  const [lo, hi] = crop.ph_opt.value
  const [alo, ahi] = crop.ph_abs.value
  const p = { ph, crop: crop.name, lo, hi, alo, ahi }
  const refs = ['values.soil_ph', `crops.${cid}.ph_opt`, `crops.${cid}.ph_abs`]
  const code = lo <= ph && ph <= hi ? 'ph_opt' : (alo <= ph && ph <= ahi ? 'ph_abs' : 'ph_out')
  return [[finding(code, 'soil_health', w[code], p, refs)], []]
}

const ruleTexture: Rule = (cid, crop, inputs) => {
  const clay = inputs.clay_pct
  if (clay === null) return [[], [unknown('unknown_texture')]]
  const w = TABLE.weights
  const tex = textureClass(clay, inputs.sand_pct)
  const opt: string[] = crop.texture_opt.value
  const absolute: string[] = crop.texture_abs.value
  const refs = ['values.clay_pct', `crops.${cid}.texture_opt`, `crops.${cid}.texture_abs`, 'assumptions.texture_classes']
  let code: string
  let list: string[]
  if (opt.includes(tex) || opt.includes('wide')) { code = 'texture_opt'; list = opt }
  else if (absolute.includes(tex) || absolute.includes('wide')) { code = 'texture_abs'; list = opt }
  else { code = 'texture_out'; list = absolute }
  return [[finding(code, 'soil_health', w[code], { texture: tex, clay, crop: crop.name, list: list.join(', ') }, refs)], []]
}

const ruleWaterNeed: Rule = (cid, crop) => {
  const code = crop.water_category.value === 'very_high' ? 'water_very_high' : 'water_low'
  return [[finding(code, 'water_saving', TABLE.weights[code], { crop: crop.name }, [`crops.${cid}.water_category`])], []]
}

const ruleIrrigation: Rule = (cid, crop, _inputs, sc) => {
  const w = TABLE.weights
  const p = { crop: crop.name }
  const refs = [`crops.${cid}.needs_irrigation_in_dry_season`, 'scenario.irrigation']
  if (crop.needs_irrigation_in_dry_season.value) {
    const code = `irrigated_crop_${sc.irrigation}`
    return [[finding(code, 'water_saving', w[code] ?? 0, p, refs)], []]
  }
  if (sc.irrigation === 'available') {
    return [[finding('rainfed_crop_irrigation_available', 'water_saving', w.rainfed_crop_irrigation_available, p, refs)], []]
  }
  return [[], []]
}

const ruleMoisture: Rule = (_cid, crop, _inputs, sc) => {
  const w = TABLE.weights
  const m = sc.residual_moisture
  const p = { crop: crop.name }
  const refs = ['values.gwetroot', 'scenario.residual_moisture', 'assumptions.moisture_threshold']
  if (m === 'unknown') return [[], [unknown('unknown_moisture')]]
  if (crop.needs_irrigation_in_dry_season.value) {
    if (m === 'low') return [[finding('moisture_low_irrigated_crop', 'water_saving', w.moisture_low_irrigated_crop, p, refs)], []]
    return [[], []]
  }
  const code = m === 'normal' ? 'moisture_normal' : `moisture_low_irrigation_${sc.irrigation}`
  return [[finding(code, 'water_saving', w[code], p, [...refs, 'scenario.irrigation'])], []]
}

const ruleRainChange: Rule = (_cid, _crop, inputs, sc) => {
  const pct = sc.rainfall_change_percent
  if (pct === 0) return [[], []]
  const rain = inputs.dry_rain_mm
  if (rain === null) return [[], [unknown('unknown_rain')]]
  const after = round1(rain * (1 + pct / 100))
  const delta = Math.floor((after - rain) / 10 + 0.5)
  return [[finding('rain_change', 'water_saving', delta, { pct, from: rain, to: after },
    ['values.dry_season_rain_normal', 'scenario.rainfall_change_percent'])], []]
}

function calendar(crop: Record<string, any>, inputs: EngineInputs, sc: Required<Scenario>) {
  const [lo, hi] = crop.cycle_days.value
  const sow = crop.sow_window.value[0] + sc.planting_delay_days
  const harvest = sow + Math.floor((lo + hi) / 2)
  return { sow_day: sow, harvest_day: harvest, sow: doyLabel(sow), harvest: doyLabel(harvest),
    onset_doy: onsetDoy(inputs.clim) }
}

const ruleSeason: Rule = (cid, crop, inputs, sc) => {
  const cal = calendar(crop, inputs, sc)
  const onset = cal.onset_doy
  if (onset === null) return [[], [unknown('unknown_climatology')]]
  const w = TABLE.weights
  const daysBefore = cal.harvest_day > 366 ? onset - (cal.harvest_day - 366) : 366
  const p = { sow: cal.sow, crop: crop.name, harvest: cal.harvest, onset: doyLabel(onset), days: Math.abs(daysBefore) }
  const refs = ['climatology.rain_mm', `crops.${cid}.sow_window`, `crops.${cid}.cycle_days`, 'assumptions.onset_rule',
    'assumptions.cycle_midpoint', 'scenario.planting_delay_days']
  const code = daysBefore <= 0 ? 'harvest_after_onset' : (daysBefore <= w.near_onset_days ? 'harvest_near_onset' : 'harvest_clear')
  return [[finding(code, 'season_field_fit', w[code], p, refs)], []]
}

const ruleHeat: Rule = (cid, crop, inputs, sc) => {
  const clim = inputs.clim
  if (!clim || !clim.t2m_max) return [[], []]
  const w = TABLE.weights
  const cal = calendar(crop, inputs, sc)
  const limit = crop.temp_abs_max_c.value
  let n = 0
  for (let day = cal.sow_day; day <= cal.harvest_day; day++) {
    const v = clim.t2m_max[wrapDoy(day) - 1]
    if (v !== null && v !== undefined && v > limit) n++
  }
  const p = { n, limit, crop: crop.name }
  const refs = ['climatology.t2m_max', `crops.${cid}.temp_abs_max_c`, `crops.${cid}.sow_window`, 'scenario.planting_delay_days']
  if (n >= w.heat_many_days) return [[finding('heat_many', 'season_field_fit', w.heat_many, p, refs)], []]
  if (n >= w.heat_some_days) return [[finding('heat_some', 'season_field_fit', w.heat_some, p, refs)], []]
  return [[finding('heat_none', 'season_field_fit', 0, p, refs)], []]
}

function premonsonOverlap(crop: Record<string, any>, inputs: EngineInputs, sc: Required<Scenario>) {
  const clim = inputs.clim
  if (!clim || !clim.t2m_max) return null
  const onset = onsetDoy(clim)
  if (onset === null) return null
  const cal = calendar(crop, inputs, sc)
  const start = 60 + 366
  const end = onset + 366
  const lo = Math.max(cal.sow_day, start)
  const hi = Math.min(cal.harvest_day, end)
  if (hi < lo) return { days: 0, hot_days: 0, onset, calendar: cal }
  const limit = crop.temp_abs_max_c.value
  let hot = 0
  for (let day = lo; day <= hi; day++) {
    const v = clim.t2m_max[wrapDoy(day) - 1]
    if (v !== null && v !== undefined && v > limit) hot++
  }
  return { days: hi - lo + 1, hot_days: hot, onset, calendar: cal }
}

const rulePremonsoon: Rule = (cid, crop, inputs, sc) => {
  const w = TABLE.weights
  const ov = premonsonOverlap(crop, inputs, sc)
  if (ov === null) return [[], [unknown('unknown_climatology')]]
  const cal = ov.calendar
  const p = { sow: cal.sow, harvest: cal.harvest, crop: crop.name, n: ov.days, hot: ov.hot_days,
    onset: doyLabel(ov.onset), limit: crop.temp_abs_max_c.value }
  const refs = ['climatology.t2m_max', 'climatology.rain_mm', 'assumptions.premonsoon_window',
    `crops.${cid}.sow_window`, `crops.${cid}.cycle_days`, `crops.${cid}.temp_abs_max_c`, 'scenario.planting_delay_days']
  if (ov.days === 0) return [[finding('premonsoon_clear', 'season_field_fit', w.premonsoon_clear, p, refs)], []]
  const delta = -Math.min(w.premonsoon_cap, round1(ov.hot_days * w.premonsoon_per_hot_day))
  return [[finding('premonsoon_hot', 'season_field_fit', delta, p, refs)], []]
}

const ruleDrainage: Rule = (cid, crop, _inputs, sc) => {
  const w = TABLE.weights
  const p = { crop: crop.name }
  const refs = [`crops.${cid}.waterlogging_tolerance`, 'scenario.drainage']
  if (crop.waterlogging_tolerance.value === 'high') return [[finding('drainage_rice', 'season_field_fit', 0, p, refs)], []]
  if (sc.drainage === 'unknown') return [[], [unknown('unknown_drainage', p)]]
  const code = `drainage_${sc.drainage}`
  return [[finding(code, 'season_field_fit', w[code], p, refs)], []]
}

const RULES: Rule[] = [ruleFamily, ruleLegume, rulePh, ruleTexture, ruleWaterNeed, ruleIrrigation,
  ruleMoisture, ruleRainChange, ruleSeason, ruleHeat, rulePremonsoon, ruleDrainage]

export function normaliseWeights(priorities: Partial<Priorities> | null | undefined, incomeEnabled: boolean) {
  const p: Priorities = { income: 40, soil_health: 30, water_saving: 30, ...(priorities ?? {}) }
  const raw: Record<string, number> = {
    income: Math.max(0, Number(p.income)), soil_health: Math.max(0, Number(p.soil_health)),
    water_saving: Math.max(0, Number(p.water_saving)),
  }
  if (!incomeEnabled) raw.income = 0
  let total = raw.income + raw.soil_health + raw.water_saving
  if (total === 0) {
    raw.income = incomeEnabled ? 1 : 0
    raw.soil_health = 1
    raw.water_saving = 1
    total = raw.income + raw.soil_health + raw.water_saving
  }
  const round2 = (x: number) => Math.round(x * 100) / 100
  const weights: Record<string, number> = {
    income: round2(100 * raw.income / total),
    soil_health: round2(100 * raw.soil_health / total),
  }
  weights.water_saving = round2(100 - weights.income - weights.soil_health)
  return { income: weights.income, soil_health: weights.soil_health, water_saving: weights.water_saving }
}

export function evaluate(inputs: EngineInputs, scenario?: Scenario | null, priorities?: Partial<Priorities> | null, econ?: Econ | null) {
  const sc = resolveScenario(inputs, scenario)
  const w = TABLE.weights
  const money = econ ?? {}
  if (!TABLE.plans.some((plan) => plan.baseline)) throw new Error('the crop table must include a baseline plan')
  const nets: Record<string, number> = {}
  for (const plan of TABLE.plans) {
    const e = money[plan.dry] ?? {}
    if (e.price !== null && e.price !== undefined && e.cost !== null && e.cost !== undefined) {
      nets[plan.id] = Number(e.price) - Number(e.cost)
    }
  }
  const incomeEnabled = Object.keys(nets).length === TABLE.plans.length
  const weights = normaliseWeights(priorities, incomeEnabled)
  const incomeNote = incomeEnabled ? null : 'Not calculated — enter your price and cost.'

  const plans = TABLE.plans.map((plan) => {
    const cid = plan.dry
    const crop = TABLE.crops[cid]
    let findings: Findings[] = []
    let unknowns: Unknown[] = []
    for (const rule of RULES) {
      const [f, u] = rule(cid, crop, inputs, sc)
      findings = findings.concat(f)
      unknowns = unknowns.concat(u)
    }
    const sumFor = (component: string) => findings.filter((f) => f.component === component)
      .reduce((a, f) => a + f.score_delta, 0)
    const soil = clamp(w.soil_base + sumFor('soil_health'))
    const water = clamp(w.water_base + sumFor('water_saving'))
    const fit = sumFor('season_field_fit')
    let income: number | null = null
    if (incomeEnabled) {
      const values = Object.values(nets)
      const lo = Math.min(...values)
      const hi = Math.max(...values)
      income = hi > lo ? round1(100 * (nets[plan.id] - lo) / (hi - lo)) : 50
      findings.push(finding('income_relative', 'income', 0, { net: nets[plan.id], crop: crop.name }, ['user_input.price', 'user_input.cost']))
    } else {
      unknowns.push(unknown('unknown_income'))
    }
    unknowns.push(unknown('unknown_salinity'))
    if (inputs.smap_sm == null) unknowns.push(unknown('unknown_smap'))
    if (inputs.imerg_rain_30d == null) unknowns.push(unknown('unknown_imerg'))
    const weighted = (weights.soil_health * soil + weights.water_saving * water + weights.income * (income ?? 0)) / 100
    const score = round1(clamp(weighted + fit))
    const blocked = findings.some((f) => f.rule === 'irrigated_crop_unavailable')
    let category: string
    if (blocked) category = 'not_workable'
    else if (score >= w.category_worth) category = 'worth_investigating'
    else if (score >= w.category_caution) category = 'possible_with_caution'
    else category = 'weak_fit'
    const local = [render('local_sowing', {}), render('local_rain', {})]
    if (crop.waterlogging_tolerance.value === 'low') local.push(render('local_drainage', {}))
    local.push(...(crop.local_risks.value as string[]).map(word), render('local_general', {}))
    const refs: string[] = []
    for (const f of findings) for (const ref of f.evidence_refs) if (!refs.includes(ref)) refs.push(ref)
    return {
      id: plan.id, is_baseline: plan.baseline, rank: 0,
      sequence: [word(TABLE.crops[plan.monsoon].name), word(crop.name)], dry_crop: cid,
      score, category, category_label: (LANG === 'my' && MY.categories[category]) || TABLE.categories[category],
      score_components: { income, soil_health: soil, water_saving: water, season_field_fit: fit },
      weights,
      reasons_for: findings.filter((f) => f.score_delta > 0),
      reasons_against: findings.filter((f) => f.score_delta < 0),
      notes: findings.filter((f) => f.score_delta === 0),
      evidence_refs: refs, unknowns, local_checks: local,
      calendar: calendar(crop, inputs, sc), engine_version: ENGINE_VERSION,
      _index: TABLE.plans.indexOf(plan),
    }
  })
  const order = [...plans].sort((a, b) => b.score - a.score || a._index - b._index)
  for (const p of order) p.rank = 1 + plans.filter((q) => q.score > p.score).length
  const clean = order.map(({ _index, ...rest }) => rest)
  return {
    engine_version: ENGINE_VERSION, scenario: sc, weights, income_enabled: incomeEnabled, income_note: incomeNote,
    plans: clean,
    disclaimer: 'Decision support only — not a yield forecast or agronomic prescription. Check with local extension officers.',
  }
}

export function compare(inputs: EngineInputs, scenario: Scenario, priorities?: Partial<Priorities> | null, econ?: Econ | null) {
  const base = evaluate(inputs, null, priorities, econ)
  const scen = evaluate(inputs, scenario, priorities, econ)
  const changed = SCENARIO_KEYS.filter((k) => (base.scenario as any)[k] !== (scen.scenario as any)[k])
    .map((k) => ({ assumption: k, from: (base.scenario as any)[k], to: (scen.scenario as any)[k] }))
  const plans = base.plans.map((b) => {
    const s = scen.plans.find((p) => p.id === b.id)!
    const before: Record<string, Findings> = {}
    for (const f of [...b.reasons_for, ...b.reasons_against, ...b.notes] as Findings[]) before[f.rule] = f
    const why = ([...s.reasons_for, ...s.reasons_against, ...s.notes] as Findings[])
      .filter((f) => !(f.rule in before) || before[f.rule].reason !== f.reason)
    const comps: Record<string, { from: unknown; to: unknown }> = {}
    for (const k of Object.keys(b.score_components) as (keyof typeof b.score_components)[]) {
      if (b.score_components[k] !== s.score_components[k]) {
        comps[k] = { from: b.score_components[k], to: s.score_components[k] }
      }
    }
    return {
      id: b.id, sequence: b.sequence, score_from: b.score, score_to: s.score,
      category_from: b.category, category_to: s.category, rank_from: b.rank, rank_to: s.rank,
      component_changes: comps, why_it_changed: why.map((f) => f.reason), reasons: why,
    }
  })
  return {
    original: base, scenario_result: scen, changed_assumptions: changed, plans,
    note: 'What-if comparison on the same rules. Not a forecast.',
  }
}

export function inputsFromProfile(profile: any, climatology: Climatology | null): EngineInputs {
  const v = profile?.values ?? {}
  const val = (name: string) => (v[name]?.value ?? null)
  return {
    ph: val('soil_ph'), clay_pct: val('clay_pct'), sand_pct: val('sand_pct'), gwetroot: val('gwetroot'),
    dry_rain_mm: val('dry_season_rain_normal'), field_irrigation: profile?.irrigation ?? 'unavailable',
    smap_sm: val('smap_soil_moisture'), imerg_rain_30d: val('imerg_rain_30d'),
    // The farmer's own observations, when entered, are the defaults for the scenario.
    field_moisture: profile?.user_moisture ?? null, field_drainage: profile?.user_drainage ?? null,
    clim: climatology,
  }
}
