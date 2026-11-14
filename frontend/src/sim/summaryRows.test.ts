// AI-assisted: Claude Code
import { describe, expect, it } from 'vitest'
import { summaryRows, verdictCount } from './summaryRows'

const plan = { nChange: 26.6, irrigationMm: 0, stressDays: 0, days: 100 }
const usual = { nChange: -26.0, irrigationMm: 0, stressDays: 45, days: 135 }

describe('season summary rows', () => {
  it('judges each measure in the farmer\'s favour: more nitrogen, less water, fewer stress days, sooner', () => {
    const rows = Object.fromEntries(summaryRows(plan, usual).map((r) => [r.id, r]))
    expect(rows.nitrogen.verdict).toBe('better')
    expect(rows.water.verdict).toBe('same')
    expect(rows.stress.verdict).toBe('better')
    expect(rows.stress.diff).toBe(45)
    expect(rows.days.verdict).toBe('better')
    expect(rows.days.diff).toBe(35)
  })

  it('calls it worse when the plan loses, and counts the wins', () => {
    const rows = summaryRows({ ...plan, irrigationMm: 120 }, usual)
    expect(rows.find((r) => r.id === 'water')!.verdict).toBe('worse')
    expect(verdictCount(rows)).toEqual({ better: 3, same: 0, worse: 1, total: 4 })
  })

  it('has no verdict without a usual rotation to compare with', () => {
    expect(summaryRows(plan, null).every((r) => r.verdict === null)).toBe(true)
  })
})
