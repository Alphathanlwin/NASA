import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from './api'
import type { AgentEvent, Crop, FieldDetail, PlanResult, Priorities, Provenance } from './api'
import { FarmMap } from './components/FarmMap'
import { Badge, Conditions, FieldHeader, Plans, PrioritySliders, ReturnsForm } from './components/Panel'
import { t } from './i18n'
import './app.css'

type Fields = Awaited<ReturnType<typeof api.fields>>

const ease = (x: number) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2)

export default function App() {
  const [fields, setFields] = useState<Fields | null>(null)
  const [crops, setCrops] = useState<Crop[]>([])
  const [layers, setLayers] = useState<(Provenance & { layer: string })[]>([])
  const [error, setError] = useState(false)
  const [powerOk, setPowerOk] = useState<boolean | null>(null)

  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<FieldDetail | null>(null)
  const [plan, setPlan] = useState<PlanResult | null>(null)
  const [events, setEvents] = useState<AgentEvent[]>([])
  const [agentPos, setAgentPos] = useState<[number, number] | null>(null)
  const [route, setRoute] = useState<[number, number][] | null>(null)
  const [priorities, setPriorities] = useState<Priorities>({ income: 40, soil: 30, water: 30 })
  const [returns, setReturns] = useState<Record<string, number>>({})

  const runRef = useRef(0)
  const timers = useRef<number[]>([])
  const raf = useRef(0)
  const logRef = useRef<HTMLOListElement>(null)

  const refreshStatus = useCallback(() => {
    api.status().then((s) => setLayers(s.layers)).catch(() => {})
    api.health().then((h) => setPowerOk(h.power_live.ok)).catch(() => {})
  }, [])

  useEffect(() => {
    Promise.all([api.fields(), api.crops()])
      .then(([f, c]) => { setFields(f); setCrops(c.crops); setAgentPos([f.agent_base.lat, f.agent_base.lon]) })
      .catch(() => setError(true))
    refreshStatus()
  }, [refreshStatus])

  useEffect(() => { logRef.current?.scrollTo({ top: logRef.current.scrollHeight }) }, [events])

  const cancelRun = () => {
    timers.current.forEach(clearTimeout)
    timers.current = []
    cancelAnimationFrame(raf.current)
  }

  const selectField = useCallback(async (id: string) => {
    cancelRun()
    const run = ++runRef.current
    setSelectedId(id); setDetail(null); setPlan(null); setEvents([]); setRoute(null)
    try {
      const [d, a, p] = await Promise.all([api.field(id), api.agentRun(id), api.plan(id, priorities, returns)])
      if (run !== runRef.current) return
      setRoute(a.waypoints)
      const start = performance.now()
      const step = (now: number) => {
        const k = Math.min(1, (now - start) / a.travel_ms)
        const pos = ease(k) * (a.waypoints.length - 1)
        const i = Math.min(a.waypoints.length - 2, Math.floor(pos))
        const f = pos - i
        const [p0, p1] = [a.waypoints[i], a.waypoints[i + 1]]
        setAgentPos([p0[0] + (p1[0] - p0[0]) * f, p0[1] + (p1[1] - p0[1]) * f])
        if (k < 1) raf.current = requestAnimationFrame(step)
      }
      raf.current = requestAnimationFrame(step)
      for (const ev of a.events) {
        timers.current.push(window.setTimeout(() => {
          if (run !== runRef.current) return
          setEvents((prev) => [...prev, ev])
          if (ev.key === 'arrived') setDetail(d)
          if (ev.key === 'plan_ready') { setPlan(p); refreshStatus() }
        }, ev.t_ms))
      }
    } catch {
      if (run === runRef.current) setError(true)
    }
  }, [priorities, returns, refreshStatus])

  // Deep link: /?field=F-03 sends the agent to that field on load.
  const autoRan = useRef(false)
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('field')
    if (fields && id && !autoRan.current) { autoRan.current = true; selectField(id) }
  }, [fields, selectField])

  // Sliders and returns re-rank the plans without re-running the agent.
  useEffect(() => {
    if (!selectedId || !plan) return
    const id = window.setTimeout(() => {
      api.plan(selectedId, priorities, returns).then(setPlan).catch(() => {})
    }, 150)
    return () => clearTimeout(id)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [priorities, returns])

  const seen = new Set(events.map((e) => e.key))
  const arrived = seen.has('arrived')
  const scanning = arrived && !seen.has('plan_ready')
  const last = events[events.length - 1]

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-mark">FS</div>
          <div>
            <b>{t('appName')}</b>
            <small>{t('tagline')}</small>
          </div>
        </div>
        <div className="side-section">
          <h4>{t('dataSources')}</h4>
          <ul className="sources">
            {layers.filter((l) => l.layer !== 'wetness').map((l) => (
              <li key={l.layer}><Badge p={{ ...l, as_of: null }} /></li>
            ))}
          </ul>
        </div>
        <p className="side-foot">{t('disclaimer')}</p>
      </aside>

      <main className="main">
        <div className="banner demo">{t('demoBanner')}</div>
        {powerOk === false && <div className="banner offline">{t('offlineBanner')}</div>}
        {error && <div className="banner offline">{t('loadError')}</div>}
        <div className="content">
          <div className="map-col">
            {fields && (
              <FarmMap fields={fields} selectedId={selectedId} agentPos={agentPos} route={route} scanning={scanning} onSelect={selectField} />
            )}
            <div className="log">
              <div className="log-head">
                <b>{t('eventLog')}</b>
                {last && <span className="clock">{last.sim_time} <small>{t('simTime')}</small></span>}
              </div>
              <ol ref={logRef}>
                {events.length === 0 && <li className="muted">{t('pickField')}</li>}
                {events.map((e, i) => (
                  <li key={i} className={e.ok ? '' : 'skipped'}>
                    <time>{e.sim_time}</time>
                    <span>{e.text}{e.source && <small> {e.source}{e.status ? ` · ${e.status.replace('_', ' ')}` : ''}</small>}</span>
                  </li>
                ))}
              </ol>
            </div>
          </div>

          <div className="panel">
            {!selectedId && (
              <div className="empty">
                <h2>{t('pickField')}</h2>
                <p>{t('pickFieldHint')}</p>
              </div>
            )}
            {selectedId && !detail && <div className="empty"><h2>{t('agentEnRoute')}</h2><div className="skeleton tall" /></div>}
            {detail && (
              <>
                <FieldHeader f={detail} crops={crops} />
                <Conditions f={detail} seen={seen} />
                {plan && (
                  <>
                    <PrioritySliders value={priorities} onChange={setPriorities} />
                    <ReturnsForm crops={crops} value={returns} onChange={setReturns} />
                    <Plans result={plan} />
                  </>
                )}
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
