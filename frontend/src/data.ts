// AI-assisted: Claude Code
// Loads the static snapshot and detects whether the FastAPI backend is reachable.
// All calculations use the TypeScript engine (kept in parity with Python), so the
// GitHub Pages build works with the backend stopped.
import { compare, evaluate, inputsFromProfile } from './engine/engine'
import type { Climatology, Econ, Priorities, Scenario } from './engine/types'

export type Status = 'LIVE' | 'CACHED' | 'DEMO' | 'UNAVAILABLE' | 'USER-INPUT'

export interface FieldValue {
  value: number | string | null
  unit: string
  variable: string
  period: string | null
  source: string
  status?: Status
}

export interface Provenance {
  dataset: string
  product: string
  spatial_resolution: string
  retrieved_at: string | null
  status: Status
  scale: string
}

export interface AgentEvent {
  key: string
  label: string
  t_ms: number
  sim_time: string
  text: string
  source: string | null
  status: Status | null
  ok: boolean
}

export interface AgentRun {
  field_id: string
  waypoints: [number, number][]
  distance_km: number
  travel_ms: number
  sim_clock_note: string
  metaphor: string
  events: AgentEvent[]
}

export interface SnapshotField {
  id: string
  name: string
  centroid: [number, number]
  area_acres: number
  town_id: string
  town_name: string
  town_distance_km: number
  power_grid: [number, number]
  crop_history: string[]
  irrigation: string
  status: Status
  values: Record<string, FieldValue>
  provenance: Record<string, Provenance>
  nearest_reference?: string
  ndvi_series?: { date: string; value: number | null }[]
  plans?: ReturnType<typeof evaluate>
  scenarios?: unknown[]
  agent_run?: AgentRun
}

export interface SourceRecord {
  id: string
  name: string
  nasa: boolean
  product: string
  version: string
  variables: string
  spatial_resolution: string
  period: string
  url: string
  files: string
  licence: string
  retrieved_at: string
  used_for: string
}

export interface CleaningEntry {
  rows_in: number
  rows_out: number
  dropped: { reason: string; rows: number }[]
  values_set_missing: { reason: string; values: number }[]
  date_range: [string, string]
  retrieved_at: string
  api_version?: string
}

export interface Snapshot {
  generated_at: string
  retrieved_at: string
  engine_version: string
  mode: string
  geojson: {
    type: 'FeatureCollection'
    generated_at: string
    retrieved_at: string
    agent_base: { lat: number; lon: number; name: string }
    note: string
    features: {
      type: 'Feature'
      id: string
      properties: { id: string; name: string; area_acres: number }
      geometry: { type: 'Polygon'; coordinates: [number, number][][] }
    }[]
  }
  fields: Record<string, SnapshotField>
  climatology: Record<string, unknown>
  sources: SourceRecord[]
  sources_retrieved_at: string
  cleaning_report: {
    generated_at: string
    retrieved_at: string
    sources: Record<string, CleaningEntry>
  }
  scenario_definitions: { id: string; group: string; label: string; assumptions: Scenario }[]
  defaults: { priorities: Priorities; econ: Econ }
  disclaimer: string
}

let cached: Snapshot | null = null
let backend: boolean | null = null

export async function loadSnapshot(): Promise<Snapshot> {
  if (cached) return cached
  const url = `${import.meta.env.BASE_URL}snapshot.json`
  // snapshot.json keeps the same name between data updates, so ask the server every time
  // instead of trusting a browser-cached copy (it is small, and 304 responses are cheap).
  const res = await fetch(url, { cache: 'no-cache' })
  if (!res.ok) throw new Error(`snapshot: ${res.status}`)
  cached = (await res.json()) as Snapshot
  return cached
}

/** Probe the FastAPI service once. A static host usually answers /api/health with HTML or 404. */
export async function backendOnline(): Promise<boolean> {
  if (import.meta.env.VITE_STATIC_ONLY === '1') return false
  if (backend !== null) return backend
  try {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 1500)
    const res = await fetch('/api/health', { signal: controller.signal })
    clearTimeout(timer)
    backend = res.ok && (res.headers.get('content-type') ?? '').includes('application/json')
  } catch {
    backend = false
  }
  return backend
}

export function fieldOf(snap: Snapshot, id: string): SnapshotField {
  const rec = snap.fields[id]
  if (!rec) throw new Error(`unknown field ${id}`)
  return rec
}

export function climatologyOf(snap: Snapshot, rec: SnapshotField): Climatology | null {
  return (snap.climatology[rec.town_id] as Climatology | undefined) ?? null
}

export function runPlans(snap: Snapshot, rec: SnapshotField, priorities: Priorities, econ: Econ,
  scenario?: Scenario | null) {
  return evaluate(inputsFromProfile(rec, climatologyOf(snap, rec)), scenario, priorities, econ)
}

export function runCompare(snap: Snapshot, rec: SnapshotField, scenario: Scenario, priorities: Priorities, econ: Econ) {
  return compare(inputsFromProfile(rec, climatologyOf(snap, rec)), scenario, priorities, econ)
}
