export type Status = 'LIVE' | 'CACHED' | 'DEMO' | 'NOT_CONNECTED' | 'USER-INPUT'

export interface Provenance {
  source?: string
  detail?: string
  version?: string | null
  as_of?: string | null
  retrieved_utc?: string | null
  status?: Status
}

export interface FieldProps {
  id: string
  name: string
  centroid: [number, number]
  area_ha: number
  crop_history: string[]
  irrigation?: string
  drainage?: string
  irrigated: boolean
  geometry?: any
  coverage?: { supported: boolean; region?: string }
}

export interface FieldDetail extends FieldProps {
  weather: null | {
    as_of: string
    t2m: number | null
    t2m_max: number | null
    t2m_min: number | null
    rh2m: number | null
    rain_7d: number | null
    rain_30d: number | null
    clim_month: null | { month: number; rain_mm: number | null; t2m: number | null }
  }
  wetness: null | {
    as_of: string
    gwetroot: number | null
    gwettop: number | null
    gwetroot_7d_change: number | null
  }
  soil: null | {
    ph: number | null
    clay_pct: number | null
    silt_pct: number | null
    sand_pct: number | null
  }
  smap: null | { as_of: string; value: number }
  ndvi: null | { as_of: string; value: number }
  power_cell?: string
  climatology?: any
  provenance: Record<string, Provenance>
}

export interface Reason {
  rule: string
  component?: string
  points?: number
  text: string
}

export interface Plan {
  id: string
  rank: number | null
  is_existing: boolean
  eligibility?: 'suitable' | 'unsuitable'
  sequence: { slot: string; slot_label: string; crop_id: string; crop_name: string }[]
  score: number | null
  breakdown: {
    income: number | null
    soil: number | null
    water: number | null
    adjustment: number | null
    weights?: Record<string, number>
  }
  reasons_for: Reason[]
  reasons_against: Reason[]
  notes: Reason[]
  evidence: { label: string; value: string; source: string }[]
  gaps: string[]
  check_locally: string[]
}

export interface PlanResult {
  considered: number
  income_basis: string
  plans: Plan[]
  existing_note: string | null
  rejected: { sequence: string[]; reasons: string[] }[]
  rejected_count: number
  assessment_status?: string
}

export interface AgentEvent {
  key: string
  t_ms: number
  sim_time: string
  text: string
  source: string | null
  status: Status | null
  ok: boolean
}

export interface AgentRun {
  waypoints: [number, number][]
  travel_ms: number
  distance_km: number
  events: AgentEvent[]
}

export interface Crop {
  id: string
  name: string
  family?: string
  duration_days?: number
  water_class?: string
  legume?: boolean
}

export interface Priorities {
  income: number
  soil: number
  water: number
}

export interface ScenarioRequest {
  rainfall_change_percent?: number
  planting_delay_days?: number
  irrigation?: 'available' | 'unavailable' | 'unknown'
  drainage?: 'good' | 'moderate' | 'poor' | 'unknown'
}

export interface AnalysisRequest {
  field_id?: string
  geometry?: any
  field_context?: {
    name?: string
    crop_history?: string[]
    irrigation?: string
    drainage?: string
  }
  priorities?: Priorities
  returns?: Record<string, number>
  scenario?: ScenarioRequest
}

export interface AnalysisResult {
  analysis_id: string
  engine_version: string
  field: FieldDetail
  baseline: PlanResult
  scenario: (PlanResult & { assumptions: ScenarioRequest }) | null
  limitations: string[]
  processing: { step: string; status: 'complete' | 'unavailable'; details?: string }[]
}

export interface MLTrack {
  id: string
  name: string
  description: string
  status: 'experimental' | 'blocked' | 'validated'
  used_in_recommendations: boolean
  reason?: string
  metrics?: Record<string, { mae: number; rmse: number }>
  evaluation?: any
}

async function get<T>(path: string): Promise<T> {
  const res = await fetch(path)
  if (!res.ok) throw new Error(`${path}: ${res.status}`)
  return res.json()
}

export const api = {
  fields: () =>
    get<GeoJSON.FeatureCollection & { agent_base: { lat: number; lon: number; name: string } }>(
      '/api/fields',
    ),
  crops: () => get<{ crops: Crop[] }>('/api/crops'),
  field: (id: string) => get<FieldDetail>(`/api/fields/${id}`),
  agentRun: (id: string) => get<AgentRun>(`/api/fields/${id}/agent-run`),
  health: () => get<{ power_live: { ok: boolean | null } }>('/api/health'),
  status: () =>
    get<{
      layers: (Provenance & { layer: string })[]
      power_live: any
      cleaning_report: any
    }>('/api/datasets/status'),
  modelsStatus: () => get<{ tracks: MLTrack[] }>('/api/models/status'),
  plan: async (
    id: string,
    priorities: Priorities,
    returns: Record<string, number>,
  ): Promise<PlanResult> => {
    const res = await fetch(`/api/fields/${id}/plan`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        priorities,
        returns: Object.keys(returns).length ? returns : null,
      }),
    })
    if (!res.ok) throw new Error(`plan: ${res.status}`)
    return res.json()
  },
  analysis: async (req: AnalysisRequest): Promise<AnalysisResult> => {
    const res = await fetch('/api/analysis', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(req),
    })
    if (!res.ok) throw new Error(`analysis: ${res.status}`)
    return res.json()
  },
}
