// AI-assisted: Claude Code
import { describe, expect, it } from 'vitest'
import { pctOfNormal, phClass, tempNormalFor } from './envHelpers'

describe('environment badges', () => {
  it('names soil reaction with the USDA Soil Survey Manual classes', () => {
    expect(phClass(4.0)).toBe('extremely_acid')
    expect(phClass(5.3)).toBe('strongly_acid')
    expect(phClass(5.8)).toBe('moderately_acid')
    expect(phClass(6.4)).toBe('slightly_acid')
    expect(phClass(7.0)).toBe('neutral')
    expect(phClass(7.6)).toBe('slightly_alkaline')
    expect(phClass(8.2)).toBe('moderately_alkaline')
    expect(phClass(null)).toBeNull()
  })

  it('says how a total compares with its normal, as a whole percent', () => {
    expect(pctOfNormal(85.6, 80)).toBe(107)
    expect(pctOfNormal(10, 0)).toBeNull()
    expect(pctOfNormal(null, 50)).toBeNull()
  })

  it('takes the long-term mean temperature for the day of year of a date', () => {
    const clim = { t2m_max: Array(366).fill(30), t2m_min: Array(366).fill(20) }
    clim.t2m_max[313] = 32 // 10 Nov is day 315 on a leap-year calendar (index 314); neighbour must not be used
    clim.t2m_max[314] = 31
    expect(tempNormalFor(clim, '2026-11-10')).toBeCloseTo(25.5)
    expect(tempNormalFor(null, '2026-11-10')).toBeNull()
  })
})
