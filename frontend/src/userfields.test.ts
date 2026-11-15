// AI-assisted: Claude Code
import { describe, expect, it } from 'vitest'
import { outline } from './userfields'
import type { LatLng } from './userfields'

/** True when two edges that do not share a corner cross each other. */
function crosses(poly: LatLng[]): boolean {
  const n = poly.length
  const side = (a: LatLng, b: LatLng, c: LatLng) => Math.sign((b[1] - a[1]) * (c[0] - a[0]) - (b[0] - a[0]) * (c[1] - a[1]))
  for (let i = 0; i < n; i++) {
    for (let j = i + 2; j < n; j++) {
      if (i === 0 && j === n - 1) continue
      const [a, b, c, d] = [poly[i], poly[(i + 1) % n], poly[j], poly[(j + 1) % n]]
      if (side(a, b, c) * side(a, b, d) < 0 && side(c, d, a) * side(c, d, b) < 0) return true
    }
  }
  return false
}

const perms = (xs: LatLng[]): LatLng[][] => xs.length <= 1 ? [xs]
  : xs.flatMap((x, i) => perms([...xs.slice(0, i), ...xs.slice(i + 1)]).map((p) => [x, ...p]))

describe('outline', () => {
  it('keeps every corner', () => {
    const pts: LatLng[] = [[16.7, 95.2], [16.701, 95.201], [16.7, 95.201], [16.701, 95.2]]
    expect(outline(pts)).toHaveLength(4)
    expect(new Set(outline(pts).map(String))).toEqual(new Set(pts.map(String)))
  })

  it('never crosses for a rectangle tapped in any order', () => {
    const rect: LatLng[] = [[16.7, 95.2], [16.7, 95.203], [16.702, 95.203], [16.702, 95.2]]
    for (const p of perms(rect)) expect(crosses(outline(p))).toBe(false)
  })

  it('never crosses for a dented four-corner field tapped in any order', () => {
    // one corner pushed far inside: sorting by angle around the average point crosses here
    const dart: LatLng[] = [[16.7, 95.2], [16.7, 95.21], [16.71, 95.21], [16.7009, 95.2091]]
    for (const p of perms(dart)) expect(crosses(outline(p))).toBe(false)
  })

  it('never crosses for random fields of 4 to 7 corners', () => {
    let seed = 7
    const rnd = () => ((seed = (seed * 16807) % 2147483647) / 2147483647)
    for (let k = 0; k < 400; k++) {
      const n = 4 + (k % 4)
      const pts: LatLng[] = Array.from({ length: n }, () => [16.7 + rnd() * 0.01, 95.2 + rnd() * 0.01])
      expect(crosses(outline(pts))).toBe(false)
    }
  })
})
