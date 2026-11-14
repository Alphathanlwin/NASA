// AI-assisted: Claude Code
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import type { Climatology } from '../engine/types'
import { cycleMidpoint, step, stepToEnd, summarise, withSchedule } from './model'
import { contextFor, demoState, scheduleFor } from './presets'

const snap = JSON.parse(readFileSync(new URL('../../public/snapshot.json', import.meta.url), 'utf8'))
const field = (id: string) => snap.fields[id]
const climOf = (f: any) => snap.climatology[f.town_id] as Climatology

function run(fieldId: string, planId: string, dry: string) {
  const f = field(fieldId)
  const plan = { id: planId, dry_crop: dry, calendar: null }
  const ctx = contextFor(f, climOf(f))
  return { ctx, end: stepToEnd(withSchedule(demoState(f), scheduleFor(plan)), ctx) }
}

describe('field simulation', () => {
  it('is deterministic', () => {
    const a = run('F-01', 'rice_mung_bean', 'mung_bean').end
    const b = run('F-01', 'rice_mung_bean', 'mung_bean').end
    expect(a).toEqual(b)
  })

  it('mung bean on F-01 matures about one cycle midpoint after sowing', () => {
    const { end } = run('F-01', 'rice_mung_bean', 'mung_bean')
    const sow = end.events.find((e) => e.kind === 'sow')!
    const mature = end.events.find((e) => e.kind === 'stage' && e.params.stage === 'mature')!
    const harvest = end.events.filter((e) => e.kind === 'harvest').pop()!
    expect(end.finished).toBe(true)
    expect(mature.day - sow.day).toBeGreaterThan(cycleMidpoint('mung_bean') * 0.9)
    expect(harvest.day - sow.day).toBe(cycleMidpoint('mung_bean'))
  })

  it('a legume raises the soil nitrogen index and dry-season rice lowers it', () => {
    expect(summarise(run('F-02', 'rice_mung_bean', 'mung_bean').end).nChange).toBeGreaterThan(0)
    expect(summarise(run('F-02', 'rice_rice', 'rice').end).nChange).toBeLessThan(0)
  })

  it('stepping 10 days at once equals 10 single steps', () => {
    const f = field('F-01')
    const ctx = contextFor(f, climOf(f))
    const s0 = withSchedule(demoState(f), scheduleFor({ id: 'rice_mung_bean', dry_crop: 'mung_bean', calendar: null }))
    let s = s0
    for (let i = 0; i < 10; i++) s = step(s, ctx, 1)
    expect(step(s0, ctx, 10)).toEqual(s)
  })

  it('missing climatology gives data_gap events, not NaN', () => {
    const f = field('F-01')
    const clim = { ...climOf(f), rain_mm: climOf(f).rain_mm.map(() => null) }
    const ctx = contextFor(f, clim)
    const s = step(demoState(f), ctx, 5)
    expect(s.events.some((e) => e.kind === 'data_gap')).toBe(true)
    expect(Number.isFinite(s.moisture)).toBe(true)
  })

  it('dry-season rice on an unirrigated field warns about irrigation', () => {
    const { end } = run('F-01', 'rice_rice', 'rice')
    expect(field('F-01').irrigation).toBe('unavailable')
    expect(end.events.some((e) => e.kind === 'no_irrigation')).toBe(true)
  })

  it('soil moisture stays in 0..1 and is wetter in August than February for every town', () => {
    for (const f of Object.values<any>(snap.fields)) {
      const ctx = contextFor(f, climOf(f))
      // No schedule: the standing crop matures, then the field stays fallow for a full year.
      const s = step(demoState(f, 1), ctx, 365)
      for (const r of s.history) {
        expect(r.moisture).toBeGreaterThanOrEqual(0)
        expect(r.moisture).toBeLessThanOrEqual(1)
      }
      const mean = (from: number, to: number) => {
        const rows = s.history.filter((r) => r.day >= from && r.day <= to)
        return rows.reduce((a, r) => a + r.moisture, 0) / rows.length
      }
      expect(mean(213, 243), f.id).toBeGreaterThan(mean(32, 59))
    }
  })
})
