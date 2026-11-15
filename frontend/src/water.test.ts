// AI-assisted: Claude Code
import { describe, expect, it } from 'vitest'
import { isWaterPixel, tilePixel } from './water'

// Raw tile pixels run from red (rarely water) to blue (always water); blue and opacity both equal
// how often the spot was water, 0-255. Values below are read from real Delta tiles.
describe('surface water colours', () => {
  it('blue (water in most years: rivers, ponds) is water', () => {
    expect(isWaterPixel(10, 0, 244, 245)).toBe(true)
    expect(isWaterPixel(0, 0, 255, 255)).toBe(true)
  })
  it('purple (narrow river, blended at the tile edge, about half the years) is water', () => {
    expect(isWaterPixel(128, 0, 127, 128)).toBe(true)
    expect(isWaterPixel(150, 0, 105, 106)).toBe(true)
  })
  it('red with little opacity (paddies flooded only in some monsoons) is not water', () => {
    expect(isWaterPixel(252, 0, 2, 3)).toBe(false)
    expect(isWaterPixel(200, 0, 55, 55)).toBe(false)
  })
  it('transparent (never water) is not water', () => {
    expect(isWaterPixel(0, 0, 0, 0)).toBe(false)
  })
})

describe('tilePixel', () => {
  it('finds the tile and pixel under a point', () => {
    // the Pathein river point used to check the service by hand: tile 13/6251/3707
    const r = tilePixel([16.8106, 94.7367], 13)
    expect([r.x, r.y]).toEqual([6251, 3707])
    expect(r.px).toBeGreaterThanOrEqual(0)
    expect(r.px).toBeLessThan(256)
    expect(r.py).toBeGreaterThanOrEqual(0)
    expect(r.py).toBeLessThan(256)
  })
})
