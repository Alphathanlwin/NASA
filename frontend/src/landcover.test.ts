// AI-assisted: Claude Code
import { describe, expect, it } from 'vitest'
import { checkField, groundOf, igbpAt, samplePoints, toSinusoidal } from './landcover'
import type { Land } from './landcover'

// A 4 x 4 tile of 500 m squares whose lower-left corner sits at a known point.
const [x0, y0] = toSinusoidal([16.7, 95.2])
const rows = [
  'MMRR', // top row: cropland, cropland, water, water  (M = 12, R = 17)
  'MMRR',
  'MMCC', // C = 2, evergreen forest
  'MMCC',
]
const land: Land = { year: '2023', tiles: [{ xllcorner: x0, yllcorner: y0, cellsize: 500, nrows: 4, ncols: 4, classes: rows.join('') }] }
// centre of the square at (row, col), rows counted from the top
const at = (row: number, col: number): [number, number] => {
  const x = x0 + (col + 0.5) * 500, y = y0 + (4 - row - 0.5) * 500
  const lat = (y / 6371007.181) * 180 / Math.PI
  const lon = (x / (6371007.181 * Math.cos(lat * Math.PI / 180))) * 180 / Math.PI
  return [lat, lon]
}

describe('land cover lookup', () => {
  it('reads the class of the square under a point', () => {
    expect(igbpAt(land, at(0, 0))).toBe(12)
    expect(igbpAt(land, at(0, 3))).toBe(17)
    expect(igbpAt(land, at(3, 3))).toBe(2)
  })
  it('returns null outside the downloaded area', () => {
    expect(igbpAt(land, [10, 80])).toBeNull()
  })
  it('names what is on the ground', () => {
    expect(groundOf(12)).toBe('farmland')
    expect(groundOf(14)).toBe('farmland')
    expect(groundOf(17)).toBe('water')
    expect(groundOf(2)).toBe('forest')
    expect(groundOf(13)).toBe('town')
    expect(groundOf(11)).toBe('wetland')
    expect(groundOf(null)).toBe('outside')
  })
})

describe('checkField', () => {
  it('accepts a field on cropland', () => {
    const r = checkField(land, [at(0, 0), at(0, 1), at(1, 1), at(1, 0)])
    expect(r.plantable).toBe(true)
  })
  it('rejects a field on the river', () => {
    const r = checkField(land, [at(0, 2), at(0, 3), at(1, 3), at(1, 2)])
    expect(r).toMatchObject({ plantable: false, ground: 'water' })
  })
  it('rejects a field on forested hills', () => {
    const r = checkField(land, [at(2, 2), at(2, 3), at(3, 3), at(3, 2)])
    expect(r).toMatchObject({ plantable: false, ground: 'forest' })
  })
  it('rejects a single point outside the area', () => {
    expect(checkField(land, [[10, 80]])).toMatchObject({ plantable: false, ground: 'outside' })
  })
  it('accepts a field that is mostly cropland with one corner on the bank', () => {
    const r = checkField(land, [at(0, 0), at(0, 1), at(1, 2), at(1, 0)])
    expect(r.plantable).toBe(true)
  })
  it('lists which corners are not plantable', () => {
    const r = checkField(land, [at(0, 0), at(0, 3)])
    expect(r.badCorners).toEqual([1])
  })
  it('passes everything when no land cover is loaded', () => {
    expect(checkField(null, [at(0, 3)]).plantable).toBe(true)
  })
})

describe('checkField with the surface-water map', () => {
  it('rejects a narrow river the 500 m land cover calls cropland', () => {
    const pts = [at(0, 0), at(0, 1), at(1, 1), at(1, 0)]
    expect(checkField(land, pts, () => true)).toMatchObject({ plantable: false, ground: 'water' })
  })
  it('keeps the land cover answer where the water map says dry or cannot be read', () => {
    const pts = [at(0, 0), at(0, 1), at(1, 1), at(1, 0)]
    expect(checkField(land, pts, () => false).plantable).toBe(true)
    expect(checkField(land, pts, () => null).plantable).toBe(true)
  })
  it('works with only the water map loaded', () => {
    expect(checkField(null, [at(0, 0)], () => true).plantable).toBe(false)
  })
})

describe('the inside of the field counts, not only its corners', () => {
  // a long field drawn along a river: corners on both banks, the middle all water
  const river = (p: [number, number]) => p[0] > 16.7003 && p[0] < 16.7012
  const bank: [number, number][] = [[16.7, 95.2], [16.7, 95.21], [16.7015, 95.21], [16.7015, 95.2]]
  it('samples points inside the shape', () => {
    const s = samplePoints(bank)
    expect(s.length).toBeGreaterThan(20)
    for (const [la, lo] of s) {
      expect(la).toBeGreaterThanOrEqual(16.7); expect(la).toBeLessThanOrEqual(16.7015)
      expect(lo).toBeGreaterThanOrEqual(95.2); expect(lo).toBeLessThanOrEqual(95.21)
    }
  })
  it('rejects a field whose corners are on the banks but whose middle is river', () => {
    expect(checkField(null, bank, (p) => river(p))).toMatchObject({ plantable: false, ground: 'water' })
  })
  it('accepts a field with a thin strip of water along one side', () => {
    const edge = (p: [number, number]) => p[0] < 16.7002
    expect(checkField(null, bank, (p) => edge(p)).plantable).toBe(true)
  })
})
