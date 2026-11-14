// AI-assisted: Claude Code
// Climate and soil suitability of a crop at a place, by the FAO EcoCrop method
// (Hijmans et al. 2001; Ramirez-Villegas et al. 2013): each factor scores 0-1 on a ramp from the
// absolute limit to the optimal range; the crop's score is the weakest factor.
// Annual crops: the season lasts the mean of EcoCrop's min and max growing period; every sowing
// month is tried and the best kept; temperature is checked month by month, rain is the season total.
// Perennials: the whole year. A suitability score, not a probability and not a yield.

export type EcoCrop = {
  scientific_name: string; ecoport_code: string; perennial: boolean; fruit: boolean; life_form: string
  t_min: number; t_opt_min: number; t_opt_max: number; t_max: number
  r_min: number; r_opt_min: number; r_opt_max: number; r_max: number
  ph_min: number | null; ph_opt_min: number | null; ph_opt_max: number | null; ph_max: number | null
  cycle_min_days: number | null; cycle_max_days: number | null
}
export type MonthlyClimate = { tmean: number[]; rain: number[] }   // 12 values, Jan..Dec
export type Limit = 'too_cold' | 'too_hot' | 'too_dry' | 'too_wet' | 'ph_low' | 'ph_high' | null
export type Suitability = {
  score: number                    // 0-100
  best_start: number | null        // month index 0-11 to sow (annuals), null for perennials
  season_months: number
  limiting: Limit
  components: { temp: number; rain: number; ph: number | null }
}

export function ramp(x: number, min: number, optMin: number, optMax: number, max: number): number {
  if (x <= min || x >= max) return 0
  if (x < optMin) return (x - min) / (optMin - min)
  if (x > optMax) return (max - x) / (max - optMax)
  return 1
}

const MONTH_START = [0, 31, 60, 91, 121, 152, 182, 213, 244, 274, 305, 335, 366] // leap-year day-of-year

/** Daily day-of-year climatology (366 values) -> monthly rain totals and mean temperature. */
export function monthlyClimate(c: { rain_mm: number[]; t2m_max: number[]; t2m_min: number[] }): MonthlyClimate {
  const rain: number[] = [], tmean: number[] = []
  for (let m = 0; m < 12; m++) {
    let r = 0, t = 0, n = 0
    for (let d = MONTH_START[m]; d < MONTH_START[m + 1]; d++) {
      r += c.rain_mm[d] ?? 0
      t += ((c.t2m_max[d] ?? 0) + (c.t2m_min[d] ?? 0)) / 2
      n++
    }
    rain.push(r)
    tmean.push(t / n)
  }
  return { rain, tmean }
}

function seasonMonths(c: EcoCrop): number {
  if (c.perennial) return 12
  const days = ((c.cycle_min_days ?? 0) + (c.cycle_max_days ?? 0)) / 2
  return Math.min(12, Math.max(1, Math.round(days / 30.4)))
}

export function suitability(c: EcoCrop, clim: MonthlyClimate, ph: number | null, irrigated: boolean): Suitability {
  const len = seasonMonths(c)
  const starts = c.perennial ? [0] : Array.from({ length: 12 }, (_, i) => i)
  let best: { s: number; temp: number; rain: number; tWorst: number; rTotal: number } | null = null
  for (const s of starts) {
    let temp = 1, tWorst = clim.tmean[s], rTotal = 0
    for (let i = 0; i < len; i++) {
      const m = (s + i) % 12
      const f = ramp(clim.tmean[m], c.t_min, c.t_opt_min, c.t_opt_max, c.t_max)
      if (f < temp) { temp = f; tWorst = clim.tmean[m] }
      rTotal += clim.rain[m]
    }
    // irrigation makes up for too little rain, never for too much
    const rain = irrigated && rTotal < c.r_opt_min ? 1 : ramp(rTotal, c.r_min, c.r_opt_min, c.r_opt_max, c.r_max)
    const v = Math.min(temp, rain)
    if (!best || v > Math.min(best.temp, best.rain)) best = { s, temp, rain, tWorst, rTotal }
  }
  const b = best!
  const phF = ph === null || c.ph_min === null || c.ph_opt_min === null || c.ph_opt_max === null || c.ph_max === null
    ? null : ramp(ph, c.ph_min, c.ph_opt_min, c.ph_opt_max, c.ph_max)
  const parts: [Limit, number][] = [
    [b.tWorst < c.t_opt_min ? 'too_cold' : 'too_hot', b.temp],
    [b.rTotal < c.r_opt_min ? 'too_dry' : 'too_wet', b.rain] as [Limit, number],
    ...(phF === null ? [] : [[ph! < (c.ph_opt_min ?? 0) ? 'ph_low' : 'ph_high', phF] as [Limit, number]]),
  ]
  const worst = parts.reduce((a, p) => (p[1] < a[1] ? p : a))
  const score = Math.round(worst[1] * 100)
  return {
    score,
    best_start: c.perennial ? null : b.s,
    season_months: len,
    limiting: score >= 100 ? null : worst[0],
    components: { temp: b.temp, rain: b.rain, ph: phF },
  }
}

export type Ranked = Suitability & { key: string; crop: EcoCrop; irrigated_score: number | null }

/** Every crop in the table, best first. irrigated_score is filled when the field can be irrigated. */
export function rankCrops(table: Record<string, EcoCrop>, clim: MonthlyClimate, ph: number | null,
  canIrrigate: boolean): Ranked[] {
  return Object.entries(table)
    .map(([key, crop]) => ({
      key, crop, ...suitability(crop, clim, ph, false),
      irrigated_score: canIrrigate ? suitability(crop, clim, ph, true).score : null,
    }))
    .sort((a, b) => b.score - a.score || (b.irrigated_score ?? 0) - (a.irrigated_score ?? 0) || a.key.localeCompare(b.key))
}
