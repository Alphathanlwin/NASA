// AI-assisted: Claude Code
import { useEffect, useMemo, useState } from 'react'
import { AgentLog } from './components/AgentLog'
import { DataQuality } from './components/DataQuality'
import { DrawPanel } from './components/DrawPanel'
import { FieldOverview } from './components/FieldOverview'
import { MapView } from './components/MapView'
import { PlansPanel } from './components/PlansPanel'
import { RecommendedCrop } from './components/RecommendedCrop'
import { ScenarioPanel } from './components/ScenarioPanel'
import { backendOnline, loadSnapshot, runCompare, runPlans } from './data'
import type { Snapshot, SnapshotField } from './data'
import { loadReadings, loadUserFields, profileForUserField, saveReadings, saveUserFields, withReadings } from './userfields'
import type { LatLng, Readings, UserField } from './userfields'
import type { Econ, Priorities, Scenario } from './engine/types'
import { initialLang, setLang, t } from './i18n'
import type { Lang } from './i18n'
import './app.css'

type Tab = 'overview' | 'compare' | 'scenarios' | 'agent' | 'quality'

const TABS: { id: Tab; key: Parameters<typeof t>[0] }[] = [
  { id: 'overview', key: 'nav.overview' },
  { id: 'compare', key: 'nav.compare' },
  { id: 'scenarios', key: 'nav.scenarios' },
  { id: 'agent', key: 'nav.agent' },
  { id: 'quality', key: 'nav.quality' },
]

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
  const [tab, setTab] = useState<Tab>('overview')
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

  return (
    <div className="app">
      <header className="topbar">
        <div className="brand">
          <div className="brand-mark" aria-hidden="true">FS</div>
          <div>
            <b>{t('app.name')}</b>
            <span>{t('app.tagline')}</span>
          </div>
        </div>

        <div className="top-actions">
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
        <>
          <div className="field-strip" role="tablist" aria-label={t('field.choose')}>
            <span className="strip-label">{t('field.choose')}</span>
            {Object.values(snap.fields).map((f) => (
              <button key={f.id} role="tab" aria-selected={f.id === selectedId}
                className={`field-chip ${f.id === selectedId ? 'active' : ''}`} onClick={() => select(f.id)}>
                <b>{f.id}</b> {f.name.replace(' demo field', '')}
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

          <main className="layout">
            <div className="map-col">
              <MapView snap={snap} selectedId={selectedId} onSelect={select}
                agentRun={field.agent_run ?? null} runId={runId}
                userFields={userFields} drawing={drawing} draft={drawPts}
                onDraftPoint={(pt) => setDrawPts((d) => [...d, pt])}
                overlay={drawing ? (
                  <DrawPanel draft={drawPts} onUndo={() => setDrawPts((d) => d.slice(0, -1))}
                    onCancel={() => { setDrawing(false); setDrawPts([]) }} onSave={saveDrawn} />
                ) : null} />
              {plans && <RecommendedCrop result={plans} onOpen={() => setTab('compare')} />}
            </div>

            <div className="content">
              <nav className="tabs" aria-label={t('nav.sections')}>
                {TABS.map((item) => (
                  <button key={item.id} className={tab === item.id ? 'active' : ''}
                    onClick={() => setTab(item.id)} aria-current={tab === item.id ? 'page' : undefined}>
                    {t(item.key)}
                  </button>
                ))}
              </nav>

              <div className="page">
                {tab === 'overview' && (
                  <FieldOverview snap={snap} field={field} calendar={calendar}
                    readings={(selectedId && readings[selectedId]) || {}} onReadings={updateReadings}
                    onDelete={isUserField ? deleteUserField : undefined}
                    onAnalyse={() => { setTab('compare'); setRunId((n) => n + 1) }} />
                )}
                {tab === 'compare' && plans && (
                  <PlansPanel result={plans} priorities={priorities} onPriorities={setPriorities}
                    econ={econ} onEcon={setEcon} />
                )}
                {tab === 'scenarios' && (
                  <ScenarioPanel draft={draft} onChange={setDraft} result={comparison}
                    fieldIrrigation={field.irrigation} />
                )}
                {tab === 'agent' && field.agent_run && (
                  <AgentLog run={field.agent_run} onReplay={() => setRunId((n) => n + 1)} />
                )}
                {tab === 'quality' && <DataQuality snap={snap} />}
              </div>
            </div>
          </main>
        </>
      )}

      <footer className="footer">
        <p className="disclaimer">{t('footer.disclaimer')}</p>
        <p>{t('footer.data')} · {t('footer.built')}</p>
        <p className="small">
          Snapshot {snap?.generated_at?.slice(0, 10) ?? '—'} · Engine {snap?.engine_version ?? '—'} ·
          Retrieval {snap?.retrieved_at?.slice(0, 10) ?? '—'}
        </p>
      </footer>
    </div>
  )
}
