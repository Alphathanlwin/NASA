// AI-assisted: Claude Code
// React glue for the field simulation: action phases, play loop, skip controls.
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { step, stepToEnd, stepToNextStage, summarise, withSchedule } from './model'
import { demoState, scheduleFor } from './presets'
import type { FieldLike } from './presets'
import type { SimContext, SimState } from './types'

export type Phase = 'choose' | 'harvesting' | 'sowing' | 'growing' | 'done'

export interface PlanLike {
  id: string
  dry_crop: string
  calendar: { sow_day: number; harvest_day: number } | null
}

interface Machine {
  phase: Phase
  sim: SimState
  planId: string | null
  playing: boolean
  /** performance.now() when the current phase began, for the 3D action timing */
  since: number
}

/** Kept per field so leaving for the map and coming back resumes where the user was. */
const cache = new Map<string, Machine>()

const reducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

export const ACTION_MS = { harvest: 6500, sow: 2600 }  // harvest: time to watch the machine work
const PLAY_MS = 450

export function useSim(field: FieldLike, ctx: SimContext, plans: PlanLike[]) {
  const fresh = useCallback((): Machine => ({ phase: 'choose', sim: demoState(field), planId: null, playing: false, since: 0 }), [field])
  const [m, setM] = useState<Machine>(() => cache.get(field.id) ?? fresh())
  const timers = useRef<number[]>([])
  // FieldView is keyed by field id, so a new field always mounts a new hook; no reset effect needed.

  useEffect(() => {
    cache.set(field.id, { ...m, playing: false })
  }, [m, field.id])

  const clearTimers = () => {
    timers.current.forEach((id) => window.clearTimeout(id))
    timers.current = []
  }
  useEffect(() => clearTimers, [])

  const later = (ms: number, fn: () => void) => {
    timers.current.push(window.setTimeout(fn, reducedMotion() ? 0 : ms))
  }

  const choose = (plan: PlanLike) => {
    clearTimers()
    const sim = withSchedule(demoState(field), scheduleFor(plan))
    setM({ phase: 'harvesting', sim, planId: plan.id, playing: false, since: performance.now() })
    later(ACTION_MS.harvest, () => {
      setM((cur) => {
        const sch = cur.sim.schedule!
        return { ...cur, phase: 'sowing', since: performance.now(), sim: step(cur.sim, ctx, sch.sowDay - 1 - cur.sim.day) }
      })
      later(ACTION_MS.sow, () => {
        setM((cur) => ({ ...cur, phase: 'growing', sim: step(cur.sim, ctx, 1) }))
      })
    })
  }

  const apply = (fn: (s: SimState) => SimState) => {
    setM((cur) => {
      if (cur.phase !== 'growing') return cur
      const sim = fn(cur.sim)
      return { ...cur, sim, phase: sim.finished ? 'done' : 'growing', playing: sim.finished ? false : cur.playing }
    })
  }

  const skip = (days: number) => apply((s) => step(s, ctx, days))
  const nextStage = () => apply((s) => stepToNextStage(s, ctx))
  const toHarvest = () => apply((s) => stepToEnd(s, ctx))
  const togglePlay = () => setM((cur) => (cur.phase === 'growing' ? { ...cur, playing: !cur.playing } : cur))
  const restart = () => {
    clearTimers()
    setM(fresh())
  }

  useEffect(() => {
    if (!m.playing) return
    const id = window.setInterval(() => apply((s) => step(s, ctx, 1)), PLAY_MS)
    return () => window.clearInterval(id)
  }, [m.playing, ctx])

  // Baseline (usual rotation) run with the same inputs, for the end-of-season comparison.
  const baseline = useMemo(() => {
    const base = plans.find((p) => p.id === 'rice_rice') ?? plans[0]
    if (!base) return null
    return summarise(stepToEnd(withSchedule(demoState(field), scheduleFor(base)), ctx))
  }, [plans, field, ctx])

  return {
    phase: m.phase, sim: m.sim, planId: m.planId, playing: m.playing, since: m.since,
    choose, skip, nextStage, toHarvest, togglePlay, restart,
    summary: m.phase === 'done' ? summarise(m.sim) : null, baseline,
  }
}

export type SimApi = ReturnType<typeof useSim>
