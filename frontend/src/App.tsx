import { useCallback, useEffect, useRef, useState } from 'react'
import { api } from './api'
import type {
  AgentEvent,
  Crop,
  FieldDetail,
  IoTDevice,
  IoTTelemetry,
  MLTrack,
  PlanResult,
  Priorities,
  Provenance,
  ScenarioRequest,
} from './api'
import { FarmMap } from './components/FarmMap'
import type { AgentRole } from './components/FarmMap'
import { Sidebar } from './components/Sidebar'
import type { Mode, ActiveScreen } from './components/Sidebar'
import {
  F1Overview,
  F2MyFarm,
  F3Environment,
  F4Compare,
  F5Scenarios,
  F6Report,
} from './components/FarmerViews'
import {
  A1Overview,
  A2FieldIntelligence,
  A3Catalogue,
  A4QualityModels,
} from './components/AnalystViews'
import { getLanguage, setLanguage, subscribeLanguage, t } from './i18n'
import type { Lang } from './i18n'
import './app.css'

type Fields = Awaited<ReturnType<typeof api.fields>>

const ease = (x: number) =>
  x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2

export default function App() {
  const [fields, setFields] = useState<Fields | null>(null)
  const [crops, setCrops] = useState<Crop[]>([])
  const [layers, setLayers] = useState<(Provenance & { layer: string })[]>([])
  const [cleaningReport, setCleaningReport] = useState<any>(null)
  const [modelsStatus, setModelsStatus] = useState<MLTrack[]>([])
  const [error, setError] = useState(false)
  const [powerOk, setPowerOk] = useState<boolean | null>(null)
  const [iotDevices, setIotDevices] = useState<IoTDevice[]>([])
  const [iotData, setIotData] = useState<IoTTelemetry | null>(null)

  // Navigation & Mode
  const [mode, setMode] = useState<Mode>('farmer')
  const [activeScreen, setActiveScreen] = useState<ActiveScreen>('F1')
  const [currentLang, setCurrentLangState] = useState<Lang>(getLanguage())

  // Selected Field State
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [detail, setDetail] = useState<FieldDetail | null>(null)
  const [plan, setPlan] = useState<PlanResult | null>(null)

  // Scenarios State
  const [scenario, setScenario] = useState<ScenarioRequest>({
    rainfall_change_percent: 0,
    planting_delay_days: 0,
    irrigation: 'available',
    drainage: 'good',
  })
  const [scenarioResult, setScenarioResult] = useState<PlanResult | null>(null)

  // Drawing State for Custom Fields
  const [drawing, setDrawing] = useState(false)
  const [drawnPoints, setDrawnPoints] = useState<[number, number][]>([])

  // Priorities & Returns
  const [priorities, setPriorities] = useState<Priorities>({
    income: 40,
    soil: 30,
    water: 30,
  })
  const [returns, setReturns] = useState<Record<string, number>>({})

  // Agent State & Choreography
  const [agentPos, setAgentPos] = useState<[number, number] | null>(null)
  const [agentRole, setAgentRole] = useState<AgentRole>('scout')
  const [route, setRoute] = useState<[number, number][] | null>(null)
  const [events, setEvents] = useState<AgentEvent[]>([])
  const [scanning, setScanning] = useState(false)

  const runRef = useRef(0)
  const timers = useRef<number[]>([])
  const raf = useRef(0)

  // Language subscription
  useEffect(() => {
    return subscribeLanguage((l) => setCurrentLangState(l))
  }, [])

  const toggleLanguage = () => {
    setLanguage(currentLang === 'en' ? 'my' : 'en')
  }

  const refreshStatus = useCallback(() => {
    api
      .status()
      .then((s) => {
        setLayers(s.layers)
        setCleaningReport(s.cleaning_report)
      })
      .catch(() => {})
    api
      .health()
      .then((h) => setPowerOk(h.power_live?.ok ?? null))
      .catch(() => {})
    api
      .modelsStatus()
      .then((m) => setModelsStatus(m.tracks))
      .catch(() => {})
    api
      .iotDevices()
      .then((devs) => setIotDevices(devs))
      .catch(() => {})
  }, [])

  useEffect(() => {
    Promise.all([api.fields(), api.crops()])
      .then(([f, c]) => {
        setFields(f)
        setCrops(c.crops)
        setAgentPos([f.agent_base.lat, f.agent_base.lon])
      })
      .catch(() => setError(true))
    refreshStatus()
  }, [refreshStatus])

  const cancelRun = () => {
    timers.current.forEach(clearTimeout)
    timers.current = []
    cancelAnimationFrame(raf.current)
    setScanning(false)
  }

  // Field selection with Agent Choreography
  const selectField = useCallback(
    async (id: string, role: AgentRole = 'scout') => {
      cancelRun()
      const run = ++runRef.current
      setSelectedId(id)
      setAgentRole(role)
      setPlan(null)
      setEvents([])
      setRoute(null)

      try {
        api
          .fieldIoT(id)
          .then((iot) => setIotData(iot))
          .catch(() => setIotData(null))

        const [d, a, p] = await Promise.all([
          api.field(id),
          api.agentRun(id),
          api.plan(id, priorities, returns),
        ])
        if (run !== runRef.current) return

        setRoute(a.waypoints)
        setDetail(d)

        // Anticipation wind-up & travel
        const start = performance.now()
        const step = (now: number) => {
          const k = Math.min(1, (now - start) / a.travel_ms)
          const pos = ease(k) * (a.waypoints.length - 1)
          const i = Math.min(a.waypoints.length - 2, Math.floor(pos))
          const f = pos - i
          const [p0, p1] = [a.waypoints[i], a.waypoints[i + 1]]
          setAgentPos([p0[0] + (p1[0] - p0[0]) * f, p0[1] + (p1[1] - p0[1]) * f])
          if (k < 1) {
            raf.current = requestAnimationFrame(step)
          } else {
            setScanning(true)
          }
        }
        raf.current = requestAnimationFrame(step)

        for (const ev of a.events) {
          timers.current.push(
            window.setTimeout(() => {
              if (run !== runRef.current) return
              setEvents((prev) => [...prev, ev])
              if (ev.key === 'plan_ready') {
                setPlan(p)
                setScanning(false)
                refreshStatus()
              }
            }, ev.t_ms),
          )
        }
      } catch {
        if (run === runRef.current) setError(true)
      }
    },
    [priorities, returns, refreshStatus],
  )

  // Re-plan when priorities or farmer returns change
  useEffect(() => {
    if (!selectedId || !plan) return
    const timer = setTimeout(() => {
      api
        .plan(selectedId, priorities, returns)
        .then(setPlan)
        .catch(() => {})
    }, 180)
    return () => clearTimeout(timer)
  }, [selectedId, priorities, returns])

  // Run What-If Scenario Projection
  const handleRunScenario = async () => {
    if (!selectedId) return
    try {
      const res = await api.analysis({
        field_id: selectedId,
        priorities,
        returns,
        scenario,
      })
      if (res.scenario) {
        setScenarioResult(res.scenario)
      }
    } catch (e) {
      console.error(e)
    }
  }

  // Handle User-Drawn Field Submission
  const handleSaveDrawnField = async (meta: {
    name: string
    history: string[]
    irrigation: string
    drainage: string
  }) => {
    if (drawnPoints.length < 3) return
    // Construct GeoJSON Polygon in [lon, lat] format
    const closed = [...drawnPoints]
    if (
      closed[0][0] !== closed[closed.length - 1][0] ||
      closed[0][1] !== closed[closed.length - 1][1]
    ) {
      closed.push(closed[0])
    }
    const polygonCoords = closed.map((p) => [p[1], p[0]]) // Leaflet is lat,lon -> GeoJSON is lon,lat

    try {
      const result = await api.analysis({
        geometry: {
          type: 'Polygon',
          coordinates: [polygonCoords],
        },
        field_context: {
          name: meta.name,
          crop_history: meta.history,
          irrigation: meta.irrigation,
          drainage: meta.drainage,
        },
        priorities,
        returns,
      })

      // Add to local fields collection
      if (fields) {
        const newFeature: GeoJSON.Feature = {
          type: 'Feature',
          properties: {
            id: result.field.id,
            name: result.field.name,
            centroid: result.field.centroid,
            area_ha: result.field.area_ha,
            crop_history: result.field.crop_history,
            irrigated: result.field.irrigation === 'available',
          },
          geometry: result.field.geometry,
        }
        setFields({
          ...fields,
          features: [newFeature, ...fields.features],
        })
      }

      setDetail(result.field)
      setPlan(result.baseline)
      setIotData(result.iot_telemetry ?? null)
      setSelectedId(result.field.id)
      setDrawing(false)
      setDrawnPoints([])
      setActiveScreen('F1')
    } catch (err) {
      alert(`Could not analyse custom geometry: ${err}`)
    }
  }

  const handleAddVertex = (pt: [number, number]) => {
    setDrawnPoints((prev) => [...prev, pt])
  }

  // Initial field selection from URL query if present
  const autoRan = useRef(false)
  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get('field') || 'F-03'
    if (fields && id && !autoRan.current) {
      autoRan.current = true
      selectField(id)
    }
  }, [fields, selectField])

  return (
    <div className="garvesty-shell">
      {/* 1. Sidebar matching Figma Node #6:705 */}
      <Sidebar
        mode={mode}
        activeScreen={activeScreen}
        layers={layers}
        currentLang={currentLang}
        onSelectMode={(m) => setMode(m)}
        onSelectScreen={(s) => setActiveScreen(s)}
        onToggleLang={toggleLanguage}
      />

      {/* 2. Main Stage */}
      <main className="garvesty-main">
        {/* Banner */}
        <div className={`banner-strip ${error ? 'offline' : 'demo'}`}>
          <span>
            🌿 <strong>{t('appName')}</strong>: {error ? t('loadError') : t('demoBanner')}
          </span>
          {events.length > 0 && (
            <span className="tabular" style={{ marginLeft: 'auto', opacity: 0.85 }}>
              🛰️ {events[events.length - 1].text}
            </span>
          )}
          {powerOk === false && (
            <span className="badge badge-warn">POWER Cache Only</span>
          )}
        </div>

        {/* Content Split: Map Left, Active Screen Panel Right */}
        <div className="content-split">
          <FarmMap
            fields={fields || { type: 'FeatureCollection', features: [], agent_base: { lat: 16.709, lon: 95.956, name: 'Agent Base' } }}
            selectedId={selectedId}
            agentPos={agentPos}
            route={route}
            scanning={scanning}
            drawing={drawing}
            drawnPoints={drawnPoints}
            agentRole={agentRole}
            onSelect={(id) => selectField(id)}
            onAddVertex={handleAddVertex}
          />

          {/* Active Screen View (10 Screens) */}
          {mode === 'farmer' && activeScreen === 'F1' && (
            <F1Overview
              field={detail}
              plan={plan}
              crops={crops}
              priorities={priorities}
              returns={returns}
              onUpdatePriorities={setPriorities}
              onUpdateReturns={setReturns}
              onSelectField={selectField}
              onDispatch={() => selectedId && selectField(selectedId, 'scout')}
            />
          )}

          {mode === 'farmer' && activeScreen === 'F2' && (
            <F2MyFarm
              field={detail}
              plan={plan}
              crops={crops}
              priorities={priorities}
              returns={returns}
              drawing={drawing}
              drawnPoints={drawnPoints}
              onStartDrawing={() => {
                setDrawing(true)
                setDrawnPoints([])
              }}
              onFinishDrawing={() => setDrawing(false)}
              onCancelDrawing={() => {
                setDrawing(false)
                setDrawnPoints([])
              }}
              onClearDrawing={() => setDrawnPoints([])}
              onSaveDrawnField={handleSaveDrawnField}
              onUpdatePriorities={setPriorities}
              onUpdateReturns={setReturns}
              onSelectField={selectField}
            />
          )}

          {mode === 'farmer' && activeScreen === 'F3' && (
            <F3Environment
              field={detail}
              plan={plan}
              crops={crops}
              priorities={priorities}
              returns={returns}
              iotData={iotData}
              onUpdatePriorities={setPriorities}
              onUpdateReturns={setReturns}
              onSelectField={selectField}
            />
          )}

          {mode === 'farmer' && activeScreen === 'F4' && (
            <F4Compare
              field={detail}
              plan={plan}
              crops={crops}
              priorities={priorities}
              returns={returns}
              onUpdatePriorities={setPriorities}
              onUpdateReturns={setReturns}
              onSelectField={selectField}
            />
          )}

          {mode === 'farmer' && activeScreen === 'F5' && (
            <F5Scenarios
              field={detail}
              plan={plan}
              crops={crops}
              priorities={priorities}
              returns={returns}
              scenario={scenario}
              onUpdateScenario={setScenario}
              onRunScenarioAnalysis={handleRunScenario}
              scenarioResult={scenarioResult}
              onUpdatePriorities={setPriorities}
              onUpdateReturns={setReturns}
              onSelectField={selectField}
            />
          )}

          {mode === 'farmer' && activeScreen === 'F6' && (
            <F6Report
              field={detail}
              plan={plan}
              crops={crops}
              priorities={priorities}
              returns={returns}
              onUpdatePriorities={setPriorities}
              onUpdateReturns={setReturns}
              onSelectField={selectField}
            />
          )}

          {/* Analyst Mode Screens */}
          {mode === 'analyst' && activeScreen === 'A1' && (
            <A1Overview
              field={detail}
              layers={layers}
              cleaningReport={cleaningReport}
              modelsStatus={modelsStatus}
              iotDevices={iotDevices}
              iotData={iotData}
            />
          )}

          {mode === 'analyst' && activeScreen === 'A2' && (
            <A2FieldIntelligence
              field={detail}
              layers={layers}
              cleaningReport={cleaningReport}
              modelsStatus={modelsStatus}
              iotDevices={iotDevices}
              iotData={iotData}
            />
          )}

          {mode === 'analyst' && activeScreen === 'A3' && (
            <A3Catalogue
              field={detail}
              layers={layers}
              cleaningReport={cleaningReport}
              modelsStatus={modelsStatus}
            />
          )}

          {mode === 'analyst' && activeScreen === 'A4' && (
            <A4QualityModels
              field={detail}
              layers={layers}
              cleaningReport={cleaningReport}
              modelsStatus={modelsStatus}
            />
          )}
        </div>
      </main>
    </div>
  )
}
