// AI-assisted: Claude Code
import { describe, expect, it } from 'vitest'
import { monthlyClimate, ramp, rankCrops, suitability } from './suitability'
import type { EcoCrop, MonthlyClimate } from './suitability'

const crop = (over: Partial<EcoCrop> = {}): EcoCrop => ({
  scientific_name: 'Testus cropus', ecoport_code: '0', perennial: false, fruit: false, life_form: 'herb annual',
  t_min: 10, t_opt_min: 20, t_opt_max: 30, t_max: 40,
  r_min: 200, r_opt_min: 400, r_opt_max: 800, r_max: 1600,
  ph_min: 4.5, ph_opt_min: 5.5, ph_opt_max: 7, ph_max: 8.5,
  cycle_min_days: 90, cycle_max_days: 150, ...over,
})

// 25 C all year; 300 mm a month in May-Sep (index 4-8), 10 mm otherwise
const delta: MonthlyClimate = {
  tmean: Array(12).fill(25),
  rain: Array.from({ length: 12 }, (_, m) => (m >= 4 && m <= 8 ? 300 : 10)),
}

describe('ramp', () => {
  it('is 1 in the optimal range, 0 outside the absolute range, linear between', () => {
    expect(ramp(25, 10, 20, 30, 40)).toBe(1)
    expect(ramp(5, 10, 20, 30, 40)).toBe(0)
    expect(ramp(45, 10, 20, 30, 40)).toBe(0)
    expect(ramp(15, 10, 20, 30, 40)).toBeCloseTo(0.5)
    expect(ramp(35, 10, 20, 30, 40)).toBeCloseTo(0.5)
  })
})

describe('suitability', () => {
  it('an annual crop sown at the best month: a 4-month season (120 days) catching 400-800 mm', () => {
    const r = suitability(crop(), delta, null, false)
    expect(r.score).toBe(100)
    expect(r.season_months).toBe(4)
    // the season total must sit in the optimal band for the chosen start
    const total = [0, 1, 2, 3].map((i) => delta.rain[(r.best_start! + i) % 12]).reduce((a, b) => a + b)
    expect(total).toBeGreaterThanOrEqual(400)
    expect(total).toBeLessThanOrEqual(800)
  })

  it('a perennial is judged on the whole year and has no sowing month', () => {
    const r = suitability(crop({ perennial: true, r_opt_min: 1500, r_opt_max: 2500, r_min: 800, r_max: 4000 }), delta, null, false)
    expect(r.best_start).toBeNull()
    // annual rain = 5*300 + 7*10 = 1570 -> optimal
    expect(r.score).toBe(100)
  })

  it('names the limiting factor: too wet when rain is above the optimum', () => {
    const wet: MonthlyClimate = { tmean: Array(12).fill(25), rain: Array(12).fill(900) }
    const r = suitability(crop(), wet, null, false)
    expect(r.limiting).toBe('too_wet')
    expect(r.score).toBeLessThan(100)
  })

  it('irrigation removes the rainfall limit but not temperature or soil', () => {
    const dry: MonthlyClimate = { tmean: Array(12).fill(25), rain: Array(12).fill(0) }
    expect(suitability(crop(), dry, null, false).score).toBe(0)
    expect(suitability(crop(), dry, null, true).score).toBe(100)
    expect(suitability(crop(), dry, 9.0, true).limiting).toBe('ph_high')
  })

  it('irrigation cannot fix too much rain', () => {
    const wet: MonthlyClimate = { tmean: Array(12).fill(25), rain: Array(12).fill(900) }
    const rainfed = suitability(crop(), wet, null, false)
    const irrigated = suitability(crop(), wet, null, true)
    expect(irrigated.score).toBe(rainfed.score)
    expect(irrigated.limiting).toBe('too_wet')
  })

  it('a missing pH reading never limits the score', () => {
    expect(suitability(crop(), delta, null, false).components.ph).toBeNull()
  })
})

describe('monthlyClimate', () => {
  it('sums daily rain and averages daily mean temperature per calendar month', () => {
    const days = 366
    const m = monthlyClimate({ rain_mm: Array(days).fill(1), t2m_max: Array(days).fill(30), t2m_min: Array(days).fill(20) })
    expect(m.rain[0]).toBeCloseTo(31)
    expect(m.rain[1]).toBeCloseTo(29)
    expect(m.tmean[6]).toBeCloseTo(25)
  })
})

describe('rankCrops', () => {
  it('sorts best first and keeps every crop', () => {
    const table = { a: crop({ t_opt_min: 30, t_opt_max: 35, t_min: 26, t_max: 40 }), b: crop() }
    const out = rankCrops(table, delta, null, false)
    expect(out.map((r) => r.key)).toEqual(['b', 'a'])
  })
})
