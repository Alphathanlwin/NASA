// AI-assisted: Claude Code
// Demo starting point: the monsoon rice (shown as Paw San, a DEMO label) is standing near harvest.
import type { Climatology } from '../engine/types'
import { buildSchedule, initialState } from './model'
import type { Schedule, SimContext, SimState } from './types'

/** 14 Nov, the demo date. */
export const DEMO_START_DOY = 318
export const DEMO_VARIETY = 'Paw San'

export interface FieldLike {
  id: string
  irrigation: string
  values: Record<string, { value: number | string | null } | undefined>
}

function num(f: FieldLike, key: string): number | null {
  const v = f.values[key]?.value
  return typeof v === 'number' ? v : null
}

export function contextFor(field: FieldLike, clim: Climatology | null): SimContext {
  return {
    clim,
    irrigation: field.irrigation,
    clayPct: num(field, 'clay_pct'),
    sandPct: num(field, 'sand_pct'),
    fallbackTmax: num(field, 't2m_max') ?? 32,
  }
}

export function demoState(field: FieldLike, startDoy = DEMO_START_DOY): SimState {
  return initialState({
    fieldId: field.id,
    startDoy,
    moisture: num(field, 'gwetroot'),
    standingCrop: 'rice',
    variety: DEMO_VARIETY,
    standingProgress: 0.95,
  })
}

export function scheduleFor(plan: { id: string; dry_crop: string; calendar: { sow_day: number; harvest_day: number } | null },
  startDoy = DEMO_START_DOY): Schedule {
  return buildSchedule(plan.id, plan.dry_crop, startDoy, plan.calendar)
}
