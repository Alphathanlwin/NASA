// AI-assisted: Claude Code
import { useEffect, useMemo, useState } from 'react'
import { AgentLog } from './components/AgentLog'
import { DataQuality } from './components/DataQuality'
import { DrawPanel } from './components/DrawPanel'
import { FieldOverview } from './components/FieldOverview'
import { MapView } from './components/MapView'
import { PlansPanel } from './components/PlansPanel'
import { HomePage } from './components/HomePage'
import { Sidebar } from './components/Sidebar'
import type { Page } from './components/Sidebar'
import { ScenarioPanel } from './components/ScenarioPanel'
import { backendOnline, loadSnapshot, runCompare, runPlans } from './data'
import type { Snapshot, SnapshotField } from './data'
import { loadReadings, loadUserFields, profileForUserField, saveReadings, saveUserFields, withReadings } from './userfields'
import type { LatLng, Readings, UserField } from './userfields'
import type { Econ, Priorities, Scenario } from './engine/types'
import { initialLang, setLang, t } from './i18n'
import type { Lang } from './i18n'
import './app.css'


const DEFAULT_PRIORITIES: Priorities = { income: 40, soil_health: 30, water_saving: 30 }

export default function App() {
  const [lang, setLanguageState] = useState<Lang>(() => {
    const l = initialLang()
    setLang(l)
    return l
  })
  // Switch t() first, then re-render, so the new render already uses the chosen language.
  const setLanguage = (l: Lang) => {
    setLang(l)
    setLanguageState(l)
  }
  const [snap, setSnap] = useState<Snapshot | null>(null)
  const [error, setError] = useState(false)
  const [online, setOnline] = useState(false)
  const [page, setPage] = useState<Page>('home')
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [priorities, setPriorities] = useState<Priorities>(DEFAULT_PRIORITIES)
  const [econ, setEcon] = useState<Econ>({})
  const [draft, setDraft] = useState<Scenario>({})
  const [runId, setRunId] = useState(0)
  const [userFields, setUserFields] = useState<UserField[]>(() => loadUserFields())
  const [readings, setReadings] = useState<Record<string, Readings>>(() => loadReadings())
  const [drawing, setDrawing] = useState(false)
  const [drawPts, setDrawPts] = useState<LatLng[]>([])

  useEffect(() => {
    loadSnapshot()
      .then((s) => {
        setSnap(s)
        setSelectedId(Object.keys(s.fields)[0] ?? null)
      })
      .catch(() => setError(true))
    backendOnline().then(setOnline)
  }, [])

  // Every field the farmer can pick: the demo examples, then their own drawn fields.
  const profiles = useMemo(() => {
    const out: Record<string, SnapshotField> = {}
    if (!snap) return out
    for (const [id, f] of Object.entries(snap.fields)) out[id] = f
    for (const u of userFields) out[u.id] = profileForUserField(snap, u)
    return out
  }, [snap, userFields])
  const baseField = selectedId ? profiles[selectedId] ?? null : null
  const field = useMemo(() => (baseField ? withReadings(baseField, selectedId ? readings[selectedId] : undefined) : null),
    [baseField, readings, selectedId])
  const isUserField = !!userFields.find((u) => u.id === selectedId)

  const updateReadings = (r: Readings) => {
    if (!selectedId) return
    const next = { ...readings, [selectedId]: r }
    if (Object.keys(r).length === 0) delete next[selectedId]
    setReadings(next)
    saveReadings(next)
  }
  const startDrawing = () => { setDrawPts([]); setDrawing(true) }
  const saveDrawn = (name: string, irrigation: UserField['irrigation']) => {
    const uf: UserField = { id: `MY-${Date.now().toString(36)}`, name, points: drawPts, irrigation, created_at: new Date().toISOString() }
    const next = [...userFields, uf]
    setUserFields(next)
    saveUserFields(next)
    setDrawing(false)
    setDrawPts([])
    select(uf.id)
  }
  const deleteUserField = () => {
    if (!selectedId) return
    const next = userFields.filter((u) => u.id !== selectedId)
    setUserFields(next)
    saveUserFields(next)
    const r = { ...readings }
    delete r[selectedId]
    setReadings(r)
    saveReadings(r)
    if (snap) select(Object.keys(snap.fields)[0])
  }

  const plans = useMemo(() => {
    if (!snap || !field) return null
    return runPlans(snap, field, priorities, econ)
  }, [snap, field, priorities, econ])

  const comparison = useMemo(() => {
    if (!snap || !field || Object.keys(draft).length === 0) return null
    return runCompare(snap, field, draft, priorities, econ)
  }, [snap, field, draft, priorities, econ])

  const select = (id: string) => {
    setSelectedId(id)
    setDraft({})
    setRunId((n) => n + 1)
  }

  const calendar = plans?.plans[0]?.calendar ?? null

  const mapView = field && snap ? (
    <MapView snap={snap} selectedId={selectedId} onSelect={select}
      initialLayer={page === 'home' ? 'satellite' : 'map'} compact={page === 'home'} key={page}
      agentRun={field.agent_run ?? null} runId={runId}
      userFields={userFields} drawing={drawing} draft={drawPts}
      onDraftPoint={(pt) => setDrawPts((d) => [...d, pt])}
      overlay={drawing ? (
        <DrawPanel draft={drawPts} onUndo={() => setDrawPts((d) => d.slice(0, -1))}
          onCancel={() => { setDrawing(false); setDrawPts([]) }} onSave={saveDrawn} />
      ) : null} />
  ) : null
  const hour = new Date().getHours()
  const greet = hour < 12 ? t('home.morning') : hour < 17 ? t('home.afternoon') : t('home.evening')
  const addField = () => { setPage('fields'); startDrawing() }

  return (
    <div className="shell">
      <Sidebar page={page} onPage={setPage} online={online} />

      <div className="main">
        <header className="main-head">
          <div>
            <p className="hello">မင်္ဂလာပါ! <span>Mingalaba!</span> <span aria-hidden="true">☀</span></p>
            <h1>{greet}</h1>
            <p className="lead">{t('home.sub')}</p>
          </div>
          <div className="head-actions">
            <span className={`mode ${online ? 'mode-online' : 'mode-offline'}`}>
              {online ? t('mode.backend') : t('mode.cached')}
            </span>
            <div className="lang-toggle" role="group" aria-label={t('lang.label')}>
              <button className={lang === 'en' ? 'active' : ''} onClick={() => setLanguage('en')}>{t('lang.en')}</button>
              <button className={lang === 'my' ? 'active' : ''} onClick={() => setLanguage('my')}>{t('lang.my')}</button>
            </div>
          </div>
        </header>

        {error && <div className="banner error">{t('common.error')}</div>}
        {!snap && !error && <div className="banner">{t('common.loading')}</div>}

        {snap && field && (
          <main className="page-body">
            {page === 'home' && (
              <HomePage snap={snap} field={field} plans={plans} map={mapView} profiles={profiles}
                userFields={userFields} selectedId={selectedId} onSelect={select} onPage={setPage} onAdd={addField} />
            )}
            {page === 'fields' && (
              <div className="fields-page">
                <div className="fields-map">
                  <div className="field-strip" role="tablist" aria-label={t('field.choose')}>
                    {Object.values(snap.fields).map((f) => (
                      <button key={f.id} role="tab" aria-selected={f.id === selectedId}
                        className={`field-chip ${f.id === selectedId ? 'active' : ''}`} onClick={() => select(f.id)}>
                        <b>{f.id}</b> {f.town_name}
                        <small>{t('mine.example')} · {t('field.acres', { a: f.area_acres })}</small>
                      </button>
                    ))}
                    {userFields.map((u) => (
                      <button key={u.id} role="tab" aria-selected={u.id === selectedId}
                        className={`field-chip mine ${u.id === selectedId ? 'active' : ''}`} onClick={() => select(u.id)}>
                        <b>✎</b> {u.name}
                        <small>{t('mine.badge')} · {t('field.acres', { a: profiles[u.id]?.area_acres })}</small>
                      </button>
                    ))}
                    <button className="field-chip add" onClick={startDrawing} disabled={drawing}>
                      <b>+</b> {t('mine.add')}
                    </button>
                  </div>
                  {mapView}
                </div>
                <FieldOverview snap={snap} field={field} calendar={calendar}
                  readings={(selectedId && readings[selectedId]) || {}} onReadings={updateReadings}
                  onDelete={isUserField ? deleteUserField : undefined}
                  onAnalyse={() => { setPage('planner'); setRunId((n) => n + 1) }} />
              </div>
            )}
            {page === 'planner' && plans && (
              <PlansPanel result={plans} priorities={priorities} onPriorities={setPriorities}
                econ={econ} onEcon={setEcon} />
            )}
            {page === 'scenarios' && (
              <ScenarioPanel draft={draft} onChange={setDraft} result={comparison}
                fieldIrrigation={field.irrigation} />
            )}
            {page === 'log' && field.agent_run && (
              <AgentLog run={field.agent_run} onReplay={() => setRunId((n) => n + 1)} />
            )}
            {page === 'quality' && <DataQuality snap={snap} />}
          </main>
        )}

        <footer className="foot">
          <p className="disclaimer">{t('footer.disclaimer')}</p>
          <p>{t('footer.data')} · {t('footer.built')}</p>
          <p className="small">
            Snapshot {snap?.generated_at?.slice(0, 10) ?? '—'} · Engine {snap?.engine_version ?? '—'} ·
            Retrieval {snap?.retrieved_at?.slice(0, 10) ?? '—'}
          </p>
        </footer>
      </div>
    </div>
  )
}
