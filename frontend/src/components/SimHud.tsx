// AI-assisted: Claude Code
// Date/stage strip, time controls, parameter panel and season timeline for the field simulation.
import { useState } from 'react'
import { doyLabel } from '../engine/engine'
import { t } from '../i18n'
import type { Key } from '../i18n'
import type { SimApi } from '../sim/useSim'
import type { DayRecord, SimEvent, SimState } from '../sim/types'
import { cropName } from './PlanCards'

const tk = (k: string, p?: Record<string, string | number>) => t(k as Key, p)

export function stageName(stage: string) {
  return tk(`sim.stage.${stage}`)
}

export function eventText(e: SimEvent) {
  const p: Record<string, string | number> = { ...e.params }
  if (typeof p.crop === 'string') p.crop = cropName(p.crop)
  if (typeof p.stage === 'string') p.stage = stageName(p.stage)
  return tk(`sim.event.${e.kind}`, p)
}

export function SimStatus({ sim }: { sim: SimState }) {
  const variety = sim.variety ? ` (${sim.variety})` : ''
  return (
    <div className="sim-status" aria-live="polite">
      <b>{t('sim.day', { n: sim.day })}</b>
      <span>{doyLabel(sim.doy)}</span>
      <span>{sim.crop ? cropName(sim.crop) + variety : t('sim.noCrop')}</span>
      <span className="sim-stage">{stageName(sim.stage)}</span>
      {sim.variety && <span className="badge badge-demo">{t('status.DEMO')}</span>}
    </div>
  )
}

export function SimControls({ api }: { api: SimApi }) {
  const off = api.phase !== 'growing'
  return (
    <div className="sim-controls" role="group" aria-label={t('sim.controls')}>
      <button onClick={api.togglePlay} disabled={off} aria-keyshortcuts="Space" className="primary">
        {api.playing ? `❚❚ ${t('sim.pause')}` : `▶ ${t('sim.play')}`}
      </button>
      <button onClick={() => api.skip(7)} disabled={off} aria-keyshortcuts="]">{t('sim.week')}</button>
      <button onClick={() => api.skip(14)} disabled={off} aria-keyshortcuts="}">{t('sim.twoWeeks')}</button>
      <button onClick={api.nextStage} disabled={off} aria-keyshortcuts="N">{t('sim.nextStage')}</button>
      <button onClick={api.toHarvest} disabled={off} aria-keyshortcuts="H">{t('sim.toHarvest')}</button>
      <button onClick={api.restart} aria-keyshortcuts="R">{t('sim.restart')}</button>
    </div>
  )
}

function Spark({ rows, pick, max }: { rows: DayRecord[]; pick: (r: DayRecord) => number | null; max: number }) {
  const pts = rows.slice(-120).map((r) => pick(r)).filter((v): v is number => v !== null)
  if (pts.length < 2) return <svg className="spark" viewBox="0 0 100 24" aria-hidden="true" />
  const d = pts.map((v, i) => `${(i / (pts.length - 1)) * 100},${22 - Math.min(1, v / max) * 20}`).join(' ')
  return (
    <svg className="spark" viewBox="0 0 100 24" preserveAspectRatio="none" aria-hidden="true">
      <polyline points={d} fill="none" stroke="currentColor" strokeWidth="1.6" vectorEffect="non-scaling-stroke" />
    </svg>
  )
}

function Row({ label, value, src, children }: { label: string; value: string; src: 'nasa' | 'sim'; children?: React.ReactNode }) {
  return (
    <div className="sim-row">
      <div className="sim-row-head">
        <span>{label}</span>
        <span className={`badge ${src === 'nasa' ? 'badge-nasa' : 'badge-sim'}`}>
          {src === 'nasa' ? t('sim.srcNasa') : t('sim.srcSim')}
        </span>
      </div>
      <div className="sim-row-body">
        <b>{value}</b>
        {children}
      </div>
    </div>
  )
}

export function SimParams({ sim, noClim }: { sim: SimState; noClim: boolean }) {
  const h = sim.history
  return (
    <section className="sim-params" aria-label={t('sim.params')}>
      <h4>{t('sim.params')}</h4>
      {noClim && <p className="note warn">{t('field3d.noClim')}</p>}
      <Row label={t('sim.moisture')} value={`${Math.round(sim.moisture * 100)}%`} src="sim">
        <Spark rows={h} pick={(r) => r.moisture} max={1} />
      </Row>
      <Row label={t('sim.nIndex')} value={`${Math.round(sim.nIndex)} / 100`} src="sim">
        <Spark rows={h} pick={(r) => r.nIndex} max={100} />
      </Row>
      <Row label={t('sim.health')} value={sim.health === null ? '—' : `${Math.round(sim.health)} / 100`} src="sim">
        <Spark rows={h} pick={(r) => r.health} max={100} />
      </Row>
      <Row label={t('sim.rain')} value={`${sim.rainToday.toFixed(1)} mm`} src="nasa">
        <Spark rows={h} pick={(r) => r.rain} max={20} />
      </Row>
      <p className="note">{t('sim.rainNote')}</p>
      <Row label={t('sim.tmax')} value={`${sim.tmaxToday ? sim.tmaxToday.toFixed(1) : '—'} °C`} src="nasa">
        <Spark rows={h} pick={(r) => r.tmax} max={42} />
      </Row>
      <Row label={t('sim.stress')} value={`${sim.heatDays} · ${sim.droughtDays} · ${sim.waterlogDays}`} src="sim" />
      <Row label={t('sim.irrigation')} value={`${Math.round(sim.irrigationMm)} mm`} src="sim" />
      <p className="note">{t('sim.normalsNote')}</p>
    </section>
  )
}

const MARK: Partial<Record<SimEvent['kind'], string>> = {
  harvest: '✂', sow: '🌱', heat: '🔥', drought: '☀', waterlog: '≋', rain: '☂', no_irrigation: '⚠',
  late_sowing: '⏱', stage: '•', season_end: '★', data_gap: '?',
}

// When several events share a day, the marker shows the one that matters most to the farmer.
const RANK: SimEvent['kind'][] = ['harvest', 'sow', 'season_end', 'no_irrigation', 'drought', 'heat', 'waterlog',
  'late_sowing', 'rain', 'land_prep', 'data_gap', 'stage', 'start']

export function SimTimeline({ sim }: { sim: SimState }) {
  const [picked, setPicked] = useState<number | null>(null)  // the first day of a marker's group
  const sch = sim.schedule
  const total = sch ? sch.sowDay + sch.cycleDays + 2 : 30
  const pos = (d: number) => `${Math.min(100, (d / total) * 100)}%`
  // markers are 22 px wide and centred on their day: keep them inside the bar at both ends
  const markPos = (d: number) => `calc(11px + (100% - 22px) * ${Math.min(1, d / total)})`
  const events = sim.events.filter((e) => e.kind !== 'data_gap' || sim.events.indexOf(e) === sim.events.findIndex((x) => x.kind === 'data_gap'))
  // events closer than ~6% of the bar share one marker, so no marker hides another
  const gap = Math.max(1, Math.round(total * 0.06))
  const groups: { day: number; list: SimEvent[] }[] = []
  for (const e of [...events].sort((a, b) => a.day - b.day)) {
    const last = groups[groups.length - 1]
    if (last && e.day - last.day <= gap) last.list.push(e)
    else groups.push({ day: e.day, list: [e] })
  }
  const marks = groups.map((g) => ({ ...g, top: [...g.list].sort((a, b) => RANK.indexOf(a.kind) - RANK.indexOf(b.kind))[0] }))
  const latest = sim.events.slice(-3).reverse()
  const pickedGroup = picked !== null ? groups.find((g) => g.day === picked) : undefined
  const shown = pickedGroup ? pickedGroup.list : latest
  return (
    <section className="sim-timeline" aria-label={t('sim.timeline')}>
      <div className="tl-bar">
        {sch && <div className="tl-crop" style={{ left: pos(sch.sowDay), width: pos(sch.cycleDays) }} />}
        <div className="tl-now" style={{ width: pos(sim.day) }} />
        {marks.map(({ day, list, top }) => (
          <button key={day} className={`tl-mark tl-${top.kind}`} style={{ left: markPos(day) }}
            title={list.map(eventText).join('\n')}
            aria-label={list.map((e) => `${t('sim.day', { n: e.day })}: ${eventText(e)}`).join('; ')}
            aria-pressed={picked === day} onClick={() => setPicked(picked === day ? null : day)}>
            {MARK[top.kind] ?? '•'}
          </button>
        ))}
      </div>
      <div className="tl-log">
        {shown.map((e, i) => (
          <div key={i}><b>{t('sim.day', { n: e.day })}</b> · {doyLabel(e.doy)} · {eventText(e)}</div>
        ))}
      </div>
    </section>
  )
}
