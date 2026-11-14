// AI-assisted: Claude Code
// The farmer's own fields and field readings. Both are USER-INPUT: they come from the farmer,
// not from a sensor or satellite, and they are kept only in this browser (localStorage).
//
// A drawn field gets its weather, rainfall and soil-moisture context from the nearest reference
// town (grid-cell values, labelled as such). Soil and vegetation values belong to one 250 m
// location, so they are NOT copied to a new field: they show as unavailable until the farmer
// enters a soil test.
import type { FieldValue, Provenance, Snapshot, SnapshotField, Status } from './data'

export type LatLng = [number, number]

export interface UserField {
  id: string
  name: string
  points: LatLng[]          // [lat, lon] corners as drawn
  irrigation: 'available' | 'sometimes' | 'unavailable'
  created_at: string
}

export interface Readings {
  soil_ph?: number | null              // from a soil test
  moisture?: 'dry' | 'moist' | 'wet' | null   // what the farmer sees / feels now
  standing_water?: 'yes' | 'no' | null // water stays 2+ days after heavy rain
  irrigation?: 'available' | 'sometimes' | 'unavailable' | null
  rain_gauge_mm?: number | null        // own rain gauge, last 30 days
  measured_on?: string | null          // YYYY-MM-DD
}

const FIELDS_KEY = 'fieldshift.userFields.v1'
const READINGS_KEY = 'fieldshift.readings.v1'

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function save(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Private mode or blocked storage: the data still works for this visit.
  }
}

export const loadUserFields = () => load<UserField[]>(FIELDS_KEY, [])
export const saveUserFields = (f: UserField[]) => save(FIELDS_KEY, f)
export const loadReadings = () => load<Record<string, Readings>>(READINGS_KEY, {})
export const saveReadings = (r: Record<string, Readings>) => save(READINGS_KEY, r)

// --------------------------------------------------------------------------- geometry
const R = 6371008.8 // mean Earth radius, m

export function distanceKm(a: LatLng, b: LatLng): number {
  const [la1, lo1, la2, lo2] = [a[0], a[1], b[0], b[1]].map((x) => (x * Math.PI) / 180)
  const h = Math.sin((la2 - la1) / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin((lo2 - lo1) / 2) ** 2
  return (2 * R * Math.asin(Math.sqrt(h))) / 1000
}

/** Area of a small polygon on the sphere, in acres (spherical excess formula used by Leaflet.Draw / turf). */
export function areaAcres(points: LatLng[]): number {
  if (points.length < 3) return 0
  let sum = 0
  for (let i = 0; i < points.length; i++) {
    const [la1, lo1] = points[i]
    const [la2, lo2] = points[(i + 1) % points.length]
    sum += ((lo2 - lo1) * Math.PI) / 180 * (2 + Math.sin((la1 * Math.PI) / 180) + Math.sin((la2 * Math.PI) / 180))
  }
  const m2 = Math.abs((sum * R * R) / 2)
  return m2 / 4046.8564224
}

export function centroid(points: LatLng[]): LatLng {
  const n = points.length
  return [points.reduce((s, p) => s + p[0], 0) / n, points.reduce((s, p) => s + p[1], 0) / n]
}

// --------------------------------------------------------------------------- profiles
const USER_PROV: Provenance = {
  dataset: 'Farmer-entered', product: 'Field drawn by the farmer on the map', spatial_resolution: 'field boundary',
  retrieved_at: null, status: 'USER-INPUT', scale: 'Drawn by the farmer; area measured from the drawn corners.',
}

/** Build a full field profile for a drawn field from the nearest reference town's demo field. */
export function profileForUserField(snap: Snapshot, uf: UserField): SnapshotField {
  const c = centroid(uf.points)
  const towns = snap.towns ?? []
  const town = towns.slice().sort((a, b) => distanceKm(c, [a.lat, a.lon]) - distanceKm(c, [b.lat, b.lon]))[0]
  const ref = Object.values(snap.fields).find((f) => f.town_id === town?.id) ?? Object.values(snap.fields)[0]
  const dist = Math.round(distanceKm(c, town ? [town.lat, town.lon] : ref.centroid) * 10) / 10
  const note = `Nearest reference: ${ref.town_name}, ${dist} km. Grid-cell value, not a field measurement.`

  // Grid-cell values carry over (they describe a 9-55 km cell); point values (250 m) do not.
  const POINT_VALUES = new Set(['soil_ph', 'clay_pct', 'silt_pct', 'sand_pct', 'ndvi'])
  const values: Record<string, FieldValue> = {}
  for (const [k, v] of Object.entries(ref.values)) {
    values[k] = POINT_VALUES.has(k) ? { ...v, value: null, source: 'not_here', period: null } : v
  }
  const provenance: Record<string, Provenance> = {}
  for (const [k, p] of Object.entries(ref.provenance)) {
    provenance[k] = { ...p, scale: p.scale.replace(/Nearest reference:[^.]*\./, `Nearest reference: ${ref.town_name}, ${dist} km.`) }
  }
  provenance.field = USER_PROV
  provenance.not_here = {
    dataset: 'Not available for a drawn field', product: '—', spatial_resolution: '250 m point',
    retrieved_at: null, status: 'UNAVAILABLE',
    scale: 'Soil and vegetation maps are only fetched for the demo fields. Enter a soil test below to use your own value.',
  }

  return {
    ...ref,
    id: uf.id,
    name: uf.name,
    centroid: c,
    area_acres: Math.round(areaAcres(uf.points) * 10) / 10,
    town_distance_km: dist,
    crop_history: ['rice', 'rice'],
    irrigation: uf.irrigation,
    status: 'USER-INPUT' as Status,
    values,
    provenance,
    nearest_reference: note,
    ndvi_series: [],
    plans: undefined,
    scenarios: [],
    agent_run: ref.agent_run ? userRun(ref, uf.id, c, snap) : undefined,
  }
}

function userRun(ref: SnapshotField, id: string, c: LatLng, snap: Snapshot) {
  const base = snap.geojson.agent_base
  const steps = 30
  const waypoints: [number, number][] = Array.from({ length: steps + 1 }, (_, i) => [
    base.lat + ((c[0] - base.lat) * i) / steps, base.lon + ((c[1] - base.lon) * i) / steps])
  const run = ref.agent_run!
  return {
    ...run, field_id: id, waypoints, distance_km: Math.round(distanceKm([base.lat, base.lon], c) * 100) / 100,
    events: run.events.map((e) => {
      if (e.key === 'field_selected') return { ...e, text: `Your field selected.`, status: 'USER-INPUT' as Status }
      if (e.key === 'geometry_resolved') {
        return { ...e, text: `Field boundary drawn by you. Nearest reference: ${ref.town_name}.`, source: 'Your drawing', status: 'USER-INPUT' as Status }
      }
      return e
    }),
  }
}

/** Apply the farmer's readings to a profile. Each reading becomes a USER-INPUT value. */
export function withReadings(rec: SnapshotField, r: Readings | undefined): SnapshotField {
  if (!r) return rec
  const out: SnapshotField = { ...rec, values: { ...rec.values }, provenance: { ...rec.provenance } }
  const period = r.measured_on ? `measured ${r.measured_on}` : 'farmer observation'
  out.provenance.user = {
    dataset: 'Farmer-entered', product: 'Your own measurement or observation', spatial_resolution: 'your field',
    retrieved_at: null, status: 'USER-INPUT', scale: 'Entered by the farmer for this field; not checked by the app.',
  }
  const mk = (value: number | string, unit: string, variable: string): FieldValue =>
    ({ value, unit, variable, period, source: 'user', status: 'USER-INPUT' })
  if (r.soil_ph != null) out.values.soil_ph = mk(r.soil_ph, 'pH', 'soil test pH')
  if (r.rain_gauge_mm != null) out.values.user_rain_30d = mk(r.rain_gauge_mm, 'mm', 'rain gauge, last 30 days')
  if (r.moisture) {
    out.values.user_moisture = mk(r.moisture, '', 'soil moisture by hand')
    out.user_moisture = r.moisture === 'dry' ? 'low' : 'normal'
  }
  if (r.standing_water) {
    out.values.user_drainage = mk(r.standing_water, '', 'standing water after rain')
    out.user_drainage = r.standing_water === 'yes' ? 'poor' : 'good'
  }
  if (r.irrigation) out.irrigation = r.irrigation
  return out
}
