// AI-assisted: Claude Code
// Shapes for the illustrative field simulation. Nothing here is a measurement or a yield forecast.
import type { Climatology } from '../engine/types'

export type Stage =
  | 'fallow' | 'land_prep' | 'sown' | 'germination' | 'vegetative'
  | 'flowering' | 'fill' | 'mature' | 'harvested'

export type EventKind =
  | 'start' | 'harvest' | 'land_prep' | 'sow' | 'late_sowing' | 'stage'
  | 'heat' | 'drought' | 'waterlog' | 'rain' | 'no_irrigation' | 'data_gap' | 'season_end'

export interface SimEvent {
  day: number
  doy: number
  kind: EventKind
  params: Record<string, string | number>
}

/** What the chosen rotation schedules, in days since the sim start. */
export interface Schedule {
  planId: string
  cropId: string
  harvestPrevDay: number
  prepStartDay: number
  sowDay: number
  cycleDays: number
  lateSowing: boolean
}

export interface DayRecord {
  day: number
  moisture: number
  nIndex: number
  health: number | null
  rain: number
  tmax: number
}

export interface SimState {
  fieldId: string
  startDoy: number
  day: number
  doy: number
  crop: string | null
  variety: string | null
  sownDay: number | null
  cycleDays: number
  stage: Stage
  progress: number
  moisture: number
  nIndex: number
  health: number | null
  heatDays: number
  droughtDays: number
  waterlogDays: number
  irrigationMm: number
  rainToday: number
  tmaxToday: number
  schedule: Schedule | null
  finished: boolean
  events: SimEvent[]
  history: DayRecord[]
}

/** Everything the step function reads besides the state. */
export interface SimContext {
  clim: Climatology | null
  irrigation: string
  clayPct: number | null
  sandPct: number | null
  fallbackTmax: number
}
