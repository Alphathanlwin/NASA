// AI-assisted: Claude Code
import { describe, expect, it } from 'vitest'
import { buildingsInside, builtNear } from './buildings'
import type { BuildingsFile } from './buildings'
import { checkField } from './landcover'
import type { LatLng } from './userfields'

const field: LatLng[] = [[16.7, 95.2], [16.7, 95.21], [16.71, 95.21], [16.71, 95.2]]
const house = (lat: number, lon: number, d = 0.0001): LatLng[] =>
  [[lat, lon], [lat, lon + d], [lat + d, lon + d], [lat + d, lon]]

describe('buildingsInside', () => {
  it('finds a house inside the field', () => {
    expect(buildingsInside(field, [house(16.705, 95.205)])).toHaveLength(1)
  })
  it('ignores a house outside the field', () => {
    expect(buildingsInside(field, [house(16.72, 95.205)])).toHaveLength(0)
  })
  it('counts a house on the edge of the field', () => {
    expect(buildingsInside(field, [house(16.70995, 95.205)])).toHaveLength(1)
  })
})

describe('checkField with buildings', () => {
  it('blocks a field with a house inside', () => {
    const r = checkField(null, field, undefined, { buildings: [house(16.705, 95.205)], villages: [] })
    expect(r).toMatchObject({ plantable: false, ground: 'buildings' })
  })
  it('blocks a field that is mostly a village area', () => {
    const village: LatLng[] = [[16.699, 95.199], [16.699, 95.211], [16.711, 95.211], [16.711, 95.199]]
    const r = checkField(null, field, undefined, { buildings: [], villages: [village] })
    expect(r).toMatchObject({ plantable: false, ground: 'town' })
  })
  it('keeps a field with no buildings plantable', () => {
    expect(checkField(null, field, undefined, { buildings: [house(16.72, 95.205)], villages: [] }).plantable).toBe(true)
  })
})

/** The same encoding scripts/build_snapshot.py writes. */
function encode(points: LatLng[], g = 0.0002) {
  const cells = points.map(([la, lo]) => [Math.round(la / g), Math.round(lo / g)])
  const la0 = Math.min(...cells.map((c) => c[0])), lo0 = Math.min(...cells.map((c) => c[1]))
  const width = Math.max(...cells.map((c) => c[1])) - lo0 + 1
  const idx = [...new Set(cells.map(([a, b]) => (a - la0) * width + (b - lo0)))].sort((x, y) => x - y)
  return { grid: g, origin: [la0, lo0] as [number, number], width, cells_delta: idx.map((v, i) => (i ? v - idx[i - 1] : v)) }
}

describe('builtNear', () => {
  const file: BuildingsFile = {
    boxes: [{ south: 16.6, west: 95.1, north: 16.8, east: 95.3 }],
    ...encode([[16.705, 95.205], [16.75, 95.25]]),
    villages: [[[16.7, 95.2], [16.7, 95.201], [16.701, 95.201]]],
  }
  it('keeps only the houses near the shape', () => {
    const r = builtNear(file, field)!
    expect(r.buildings).toHaveLength(1)
    expect(r.buildings[0][0][0]).toBeCloseTo(16.705, 3)
    expect(r.buildings[0][0][1]).toBeCloseTo(95.205, 3)
    expect(r.villages).toHaveLength(1)
  })
  it('a house inside the field blocks it', () => {
    expect(checkField(null, field, undefined, builtNear(file, field))).toMatchObject({ plantable: false, ground: 'buildings' })
  })
  it('says nothing outside the downloaded areas', () => {
    expect(builtNear(file, [[10, 80], [10, 80.01], [10.01, 80.01]])).toBeNull()
  })
})
