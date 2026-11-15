// AI-assisted: Claude Code
// What covers the ground where the farmer draws: NASA MODIS MCD12Q1 land cover (IGBP classes, 500 m),
// downloaded once for the Delta by pipeline/fetch_landcover.py. Used to say that no crop or fruit can be
// planted on a river, forested hills, a town or wetland. A 500 m square is coarse: a field mostly on
// cropland with one corner on a bank is still accepted.
import type { LatLng } from './userfields'

export type LandTile = { xllcorner: number; yllcorner: number; cellsize: number; nrows: number; ncols: number; classes: string }
export type Land = { year: string; tiles: LandTile[] }
export type Ground = 'farmland' | 'water' | 'forest' | 'town' | 'wetland' | 'other' | 'outside'
export type FieldCheck = { plantable: boolean; ground: Ground; badCorners: number[] }

const R = 6371007.181 // MODIS sinusoidal sphere radius, m

export function toSinusoidal([lat, lon]: LatLng): [number, number] {
  const phi = (lat * Math.PI) / 180
  return [R * ((lon * Math.PI) / 180) * Math.cos(phi), R * phi]
}

/** IGBP class (1-17) of the 500 m square under a point, or null outside the downloaded tiles. */
export function igbpAt(land: Land, p: LatLng): number | null {
  const [x, y] = toSinusoidal(p)
  for (const t of land.tiles) {
    const col = Math.floor((x - t.xllcorner) / t.cellsize)
    const fromBottom = Math.floor((y - t.yllcorner) / t.cellsize)
    if (col < 0 || col >= t.ncols || fromBottom < 0 || fromBottom >= t.nrows) continue
    const v = t.classes.charCodeAt((t.nrows - 1 - fromBottom) * t.ncols + col) - 65
    return v >= 1 && v <= 17 ? v : null
  }
  return null
}

/** IGBP classes grouped by what a farmer would call them. */
export function groundOf(cls: number | null): Ground {
  if (cls === null) return 'outside'
  if (cls === 17) return 'water'
  if (cls >= 1 && cls <= 5) return 'forest'          // evergreen / deciduous / mixed forest: the hills
  if (cls === 13) return 'town'
  if (cls === 11) return 'wetland'                   // permanent wetland, mangrove
  if (cls === 15 || cls === 16) return 'other'       // snow, barren
  return 'farmland'                                  // cropland, cropland mosaic, grass, savanna, shrub
}

const centroid = (pts: LatLng[]): LatLng =>
  [pts.reduce((s, p) => s + p[0], 0) / pts.length, pts.reduce((s, p) => s + p[1], 0) / pts.length]

function inside([la, lo]: LatLng, poly: LatLng[]): boolean {
  let ok = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [ai, oi] = poly[i], [aj, oj] = poly[j]
    if ((oi > lo) !== (oj > lo) && la < ((aj - ai) * (lo - oi)) / (oj - oi) + ai) ok = !ok
  }
  return ok
}

/** Corners, the centre and a grid of points inside the shape, so a river through the middle is seen
 *  even when every corner sits on a bank. */
export function samplePoints(points: LatLng[]): LatLng[] {
  if (points.length < 3) return [...points, ...(points.length ? [centroid(points)] : [])]
  const las = points.map((p) => p[0]), los = points.map((p) => p[1])
  const [la0, la1, lo0, lo1] = [Math.min(...las), Math.max(...las), Math.min(...los), Math.max(...los)]
  const N = 9, grid: LatLng[] = []
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      const p: LatLng = [la0 + ((i + 0.5) / N) * (la1 - la0), lo0 + ((j + 0.5) / N) * (lo1 - lo0)]
      if (inside(p, points)) grid.push(p)
    }
  }
  return [...points, centroid(points), ...grid]
}

/** A field can be planted unless most of it (corners, centre and inside) is not farmland. */
export function checkField(land: Land | null, points: LatLng[], water?: (p: LatLng) => boolean | null | undefined): FieldCheck {
  if ((!land && !water) || points.length === 0) return { plantable: true, ground: 'farmland', badCorners: [] }
  // the 18 m surface-water map catches rivers too narrow for the 500 m land cover
  const at = (p: LatLng): Ground => (water?.(p) === true ? 'water' : land ? groundOf(igbpAt(land, p)) : 'farmland')
  const corners = points.map(at)
  const centre = at(centroid(points))
  const badCorners = corners.flatMap((g, i) => (g === 'farmland' ? [] : [i]))
  const samples = samplePoints(points).map(at)
  const bad = samples.filter((g) => g !== 'farmland')
  // a single point or a line has no inside: there the centre decides
  const plantable = points.length < 3 ? centre === 'farmland' && bad.length * 2 <= samples.length : bad.length * 2 <= samples.length
  if (plantable) return { plantable, ground: 'farmland', badCorners }
  // name the most common reason, the centre first on a tie
  const count = (g: Ground) => bad.filter((b) => b === g).length
  const ground = bad.reduce((best, g) => (count(g) > count(best) ? g : best), centre !== 'farmland' ? centre : bad[0])
  return { plantable, ground, badCorners }
}

let cache: Promise<Land | null> | null = null
/** Loaded once, on first use; null if the file is missing, so nothing is blocked by a failed download. */
export function loadLand(): Promise<Land | null> {
  cache ??= fetch(`${import.meta.env.BASE_URL}landcover.json`)
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null)
  return cache
}
