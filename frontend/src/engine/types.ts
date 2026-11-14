// AI-assisted: Claude Code
// Shapes shared by the TypeScript port of the rotation engine.
export type Verified = { value: unknown; source: string; verified: boolean; label?: string }
export type CropEntry = { name: string; scientific_name: string } & Record<string, any>

export interface CropTable {
  engine_version: string
  plans: { id: string; monsoon: string; dry: string; baseline: boolean }[]
  crops: Record<string, CropEntry>
  assumptions: Record<string, Verified>
  weights: Record<string, number>
  templates: Record<string, string>
  categories: Record<string, string>
  scenarios: { id: string; group: string; label: string; assumptions: Record<string, string | number> }[]
}

export type Findings = {
  rule: string
  component: string
  score_delta: number
  reason: string
  evidence_refs: string[]
  assumption: boolean
}

export type Unknown = { rule: string; reason: string }

export interface EngineInputs {
  ph: number | null
  clay_pct: number | null
  sand_pct: number | null
  gwetroot: number | null
  dry_rain_mm: number | null
  field_irrigation: string
  smap_sm?: number | null
  imerg_rain_30d?: number | null
  clim: Climatology | null
}

export interface Climatology {
  rain_mm: (number | null)[]
  t2m_max: (number | null)[]
  t2m_min?: (number | null)[]
  rh2m?: (number | null)[]
  onset_doy?: number
}

export interface Scenario {
  irrigation?: string
  planting_delay_days?: number
  residual_moisture?: string
  drainage?: string
  rainfall_change_percent?: number
}

export interface Priorities {
  income: number
  soil_health: number
  water_saving: number
}

export type Econ = Record<string, { price?: number | null; cost?: number | null }>
