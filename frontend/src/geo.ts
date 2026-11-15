// AI-assisted: Claude Code
// Small plane-geometry helpers on [lat, lon] points; fields are a few hundred metres across,
// so treating degrees as flat is accurate enough for "is this point inside that shape".
import type { LatLng } from './userfields'

export function inside([la, lo]: LatLng, poly: LatLng[]): boolean {
  let ok = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [ai, oi] = poly[i], [aj, oj] = poly[j]
    if ((oi > lo) !== (oj > lo) && la < ((aj - ai) * (lo - oi)) / (oj - oi) + ai) ok = !ok
  }
  return ok
}

/** Buildings with any corner or their centre inside the field. */
export function buildingsInside(field: LatLng[], buildings: LatLng[][]): LatLng[][] {
  if (field.length < 3) return []
  return buildings.filter((b) => {
    const c: LatLng = [b.reduce((s, p) => s + p[0], 0) / b.length, b.reduce((s, p) => s + p[1], 0) / b.length]
    return inside(c, field) || b.some((p) => inside(p, field))
  })
}
