// AI-assisted: Claude Code
// Field-level view: 3D scene (lazy) with floating plan cards, HUD and time controls on top.
import { Suspense, lazy, useEffect, useMemo, useState } from 'react'
import { climatologyOf } from '../data'
import type { Snapshot, SnapshotField, runPlans } from '../data'
import type { Action } from '../field3d/layout'
import { t, townName, fieldName } from '../i18n'
import { contextFor } from '../sim/presets'
import { ACTION_MS, useSim } from '../sim/useSim'
import { PlanCards, cropName } from './PlanCards'
import { SimControls, SimParams, SimStatus, SimTimeline } from './SimHud'
import { SimSummary } from './SimSummary'
import { WebGLFallback, hasWebGL } from './WebGLFallback'
import { IoTDemo } from './IoTDemo'

const FieldScene = lazy(() => import('../field3d/FieldScene'))

export function FieldView({ snap, field, plans, onMap }: {
  snap: Snapshot
  field: SnapshotField
  plans: ReturnType<typeof runPlans> | null
  onMap: () => void
}) {
  const clim = climatologyOf(snap, field)
  const ctx = useMemo(() => contextFor(field, clim), [field, clim])
  const list = plans?.plans ?? []
  const api = useSim(field, ctx, list)
  const [webgl] = useState(hasWebGL)
  const [showSensors, setShowSensors] = useState(false)

  const action: Action | null = useMemo(() => {
    if (api.phase === 'harvesting') return { kind: 'cut', crop: 'rice', start: api.since, duration: ACTION_MS.harvest }
    if (api.phase === 'sowing' && api.sim.schedule) {
      return { kind: 'sow', crop: api.sim.schedule.cropId, start: api.since, duration: ACTION_MS.sow }
    }
    return null
  }, [api.phase, api.since, api.sim.schedule])

  const chosen = list.find((p) => p.id === api.planId) ?? null

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement | null
      if (el && (el.tagName === 'INPUT' || el.tagName === 'TEXTAREA' || el.tagName === 'BUTTON' || el.tagName === 'SELECT' || el.isContentEditable)) return
      if (e.key === 'm' || e.key === 'M') onMap()
      else if (e.key === ' ') { e.preventDefault(); api.togglePlay() }
      else if (e.key === ']') api.skip(7)
      else if (e.key === '}') api.skip(14)
      else if (e.key === 'n' || e.key === 'N') api.nextStage()
      else if (e.key === 'h' || e.key === 'H') api.toHarvest()
      else if (e.key === 'r' || e.key === 'R') api.restart()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [api, onMap])

  const working = api.phase === 'harvesting' ? t('field3d.harvesting')
    : api.phase === 'sowing' ? t('field3d.sowing', { crop: cropName(api.sim.schedule?.cropId) }) : null

  return (
    <section className="field-view" aria-label={t('field3d.title', { name: fieldName(field) })}>
      <div className="fv-stage">
        <div className="fv-canvas">
          {webgl ? (
            <Suspense fallback={<div className="fv-loading">{t('field3d.loading')}</div>}>
              <FieldScene sim={api.sim} action={action} sweepMode={action ? action.kind : null} showSensors={showSensors} />
            </Suspense>
          ) : (
            <WebGLFallback sim={api.sim} showSensors={showSensors} />
          )}
        </div>

        <div className="fv-top">
          <button className="fv-map-btn" onClick={onMap} title={t('field3d.mapHint')} aria-keyshortcuts="M">
            ← {t('field3d.map')}
          </button>
          <div className="fv-title">
            <b>{fieldName(field)}</b>
            <span>{townName(field.town_id, field.town_name)}</span>
          </div>
          <SimStatus sim={api.sim} />
          <span className="badge badge-sim fv-badge">{t('field3d.badge')}</span>
        </div>

        {!webgl && <div className="fv-note">{t('field3d.noWebgl')}</div>}
        {working && <div className="fv-working" aria-live="polite">{working}</div>}

        {/* while the harvester or the farmer is working, the side panel steps aside so the whole field shows */}
        {api.phase !== 'harvesting' && api.phase !== 'sowing' && <div className="fv-side">
          {plans && list.length > 0 ? (
            api.phase === 'choose' ? (
              <PlanCards result={plans} chosenId={api.planId} disabled={api.phase !== 'choose'} onChoose={(plan) => { setShowSensors(true); api.choose(plan) }} />
            ) : (
              <SimParams sim={api.sim} noClim={!clim} />
            )
          ) : (
            <div className="plan-card">{t('field3d.noPlans')}</div>
          )}
        </div>}

        {api.summary && (
          <div className="fv-summary-wrap">
            <SimSummary summary={api.summary} baseline={api.baseline} plan={chosen} total={list.length}
              onRestart={api.restart} onMap={onMap} />
          </div>
        )}
      </div>

      <button type="button" className="sensor-toggle" aria-expanded={showSensors} aria-controls="iot-panel" onClick={() => {
        if (!showSensors) requestAnimationFrame(() => document.getElementById('iot-panel')?.scrollIntoView({ block: 'start' }))
        setShowSensors(v => !v)
      }}>
        {t(showSensors ? 'iot.removeSensors' : 'iot.addSensors')}
      </button>
      <div className="fv-bottom">
        <SimControls api={api} />
        <SimTimeline sim={api.sim} />
      </div>
      <IoTDemo key={field.id} visible={showSensors} />
    </section>
  )
}
