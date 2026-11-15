// AI-assisted: Claude Code
// Houses, buildings and village areas from OpenStreetMap (© OpenStreetMap contributors, ODbL) around the
// four reference towns, downloaded once by pipeline/fetch_buildings.py and shipped with the app (asking the
// live service while drawing took 25-45 s). Houses are kept as occupied ~20 m squares. A field with a house
// inside it, or one that is mostly a village, is not farmland. Outside the downloaded areas buildings are
// not checked.
import type { LatLng } from './userfields'
export { buildingsInside } from './geo'

export type Built = { buildings: LatLng[][]; villages: LatLng[][] }
export type BuildingsFile = {
  boxes: { south: number; west: number; north: number; east: number }[]
  grid: number                 // square size in degrees
  origin: [number, number]     // [lat, lon] square index of the first square
  width: number                // squares per row
  cells_delta: number[]        // sorted square indices, each stored as the step from the previous one
  villages: LatLng[][]
}

const decoded = new WeakMap<BuildingsFile, Set<number>>()
function squares(file: BuildingsFile): Set<number> {
  let s = decoded.get(file)
  if (!s) {
    s = new Set()
    let i = 0
    for (const d of file.cells_delta) { i += d; s.add(i) }
    decoded.set(file, s)
  }
  return s
}

let cache: Promise<BuildingsFile | null> | null = null
export function loadBuildings(): Promise<BuildingsFile | null> {
  cache ??= fetch(`${import.meta.env.BASE_URL}buildings.json`)
    .then((r) => (r.ok ? r.json() : null))
    .catch(() => null)
  return cache
}

/** Houses (each as a one-point outline at its square's centre) and village areas near a shape;
 *  null where nothing was downloaded. */
export function builtNear(file: BuildingsFile | null, points: LatLng[]): Built | null {
  if (!file || points.length === 0) return null
  const las = points.map((p) => p[0]), los = points.map((p) => p[1])
  const pad = 0.0005
  const [s, n, w, e] = [Math.min(...las) - pad, Math.max(...las) + pad, Math.min(...los) - pad, Math.max(...los) + pad]
  if (!file.boxes.some((b) => s >= b.south && n <= b.north && w >= b.west && e <= b.east)) return null
  const g = file.grid, set = squares(file), [la0, lo0] = file.origin
  const buildings: LatLng[][] = []
  for (let la = Math.round(s / g); la <= Math.round(n / g); la++) {
    for (let lo = Math.round(w / g); lo <= Math.round(e / g); lo++) {
      if (set.has((la - la0) * file.width + (lo - lo0))) buildings.push([[la * g, lo * g]])
    }
  }
  const near = (p: LatLng) => p[0] >= s && p[0] <= n && p[1] >= w && p[1] <= e
  return {
    buildings,
    villages: file.villages.filter((v) => v.some(near) || (v.some((p) => p[0] <= s) && v.some((p) => p[0] >= n))),
  }
}
