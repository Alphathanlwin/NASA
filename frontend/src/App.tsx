// AI-assisted: Claude Code
import { useEffect, useMemo, useRef, useState } from 'react'
import { AgentLog } from './components/AgentLog'
import { DrawPanel, NotPlantable } from './components/DrawPanel'
import { FieldOverview } from './components/FieldOverview'
import { FieldView } from './components/FieldView'
import { MapView } from './components/MapView'
import { confirmedAnswers, FarmerPlanner } from './components/FarmerPlanner'
import { prioritiesFor, scenarioFor } from './planner/flow'
import { PlansPanel } from './components/PlansPanel'
import { HomePage } from './components/HomePage'
import { Sidebar } from './components/Sidebar'
import type { Page } from './components/Sidebar'
import { ScenarioPanel } from './components/ScenarioPanel'
import { loadSnapshot, runCompare, runPlans } from './data'
import { setEngineLang } from './engine/engine'
import type { Snapshot, SnapshotField } from './data'
import { loadReadings, loadUserFields, outline, profileForUserField, saveReadings, saveUserFields, withReadings } from './userfields'
import type { LatLng, Readings, UserField } from './userfields'
import { checkField, loadLand, samplePoints } from './landcover'
import type { Land } from './landcover'
import { waterAt } from './water'
import { buildingsInside, builtNear, loadBuildings } from './buildings'
import type { BuildingsFile } from './buildings'
import type { Econ, Priorities, Scenario } from './engine/types'
import { initialLang, setLang, t, townName, fieldName } from './i18n'
import type { Key, Lang } from './i18n'
import './app.css'


const PAGE_ORDER: Page[] = ['home', 'fields', 'field3d', 'planner', 'scenarios', 'log']
/** The map's agent trace runs 2.2 s before the field view opens. */
const ENTER_DELAY_MS = 2200
const DEFAULT_PRIORITIES: Priorities = { income: 40, soil_health: 30, water_saving: 30 }

export default function App() {
  const [lang, setLanguageState] = useState<Lang>(() => {
    const l = initialLang()
    setLang(l)
    setEngineLang(l)
    return l
  })
  // Switch t() first, then re-render, so the new render already uses the chosen language.
  const setLanguage = (l: Lang) => {
    setLang(l)
    setEngineLang(l)
    setLanguageState(l)
  }
  const [snap, setSnap] = useState<Snapshot | null>(null)
  const [error, setError] = useState(false)
  const [page, setPageState] = useState<Page>('home')
  const [dir, setDir] = useState<1 | -1>(1)
  const [focusMeasurements, setFocusMeasurements] = useState(false)
  useEffect(() => {
    if (page === 'fields' && focusMeasurements) {
      document.getElementById('field-measurements')?.focus()
      setFocusMeasurements(false)
    }
  }, [page, focusMeasurements])
  // Pages enter from the side you are travelling towards (down the menu = from below).
  const [backPage, setBackPage] = useState<Page>('home')
  const enterTimer = useRef<number | null>(null)
  const setPage = (p: Page) => {
    if (p === page) return
    if (enterTimer.current !== null) { window.clearTimeout(enterTimer.current); enterTimer.current = null }
    if (p === 'field3d') setBackPage(page)
    setDir(PAGE_ORDER.indexOf(p) > PAGE_ORDER.indexOf(page) ? 1 : -1)
    setPageState(p)
    window.scrollTo({ top: 0 })
  }
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [priorities, setPriorities] = useState<Priorities>(DEFAULT_PRIORITIES)
  const [econ, setEcon] = useState<Econ>({})
  const [draft, setDraft] = useState<Scenario>({})
  const [runId, setRunId] = useState(0)
  const [userFields, setUserFields] = useState<UserField[]>(() => loadUserFields())
  // NASA MODIS land cover: says when a spot is river, forest hills or town, where nothing can be planted
  const [land, setLand] = useState<Land | null>(null)
  useEffect(() => { loadLand().then(setLand) }, [])
  // 18 m surface-water answers per point (rivers too narrow for the 500 m land cover), filled in as they arrive
  const [water, setWater] = useState<Record<string, boolean | null>>({})
  const ptKey = (p: LatLng) => `${p[0].toFixed(6)},${p[1].toFixed(6)}`
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
    const uf: UserField = { id: `MY-${Date.now().toString(36)}`, name, points: outline(drawPts), irrigation, created_at: new Date().toISOString() }
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
  }, [snap, field, priorities, econ, lang])  // lang: reason text is written in the current language

  // Read on entry so the simulation uses this field's last confirmed farmer answers.
  const farmAnswers = useMemo(() => page === 'field3d' && selectedId ? confirmedAnswers(selectedId) : null, [page, selectedId])
  const farmPlans = useMemo(() => snap && field && farmAnswers
    ? runPlans(snap, field, prioritiesFor(farmAnswers), econ, scenarioFor(farmAnswers)) : plans,
  [snap, field, farmAnswers, econ, plans, lang])

  const comparison = useMemo(() => {
    if (!snap || !field || Object.keys(draft).length === 0) return null
    return runCompare(snap, field, draft, priorities, econ)
  }, [snap, field, draft, priorities, econ, lang])

  const select = (id: string) => {
    setSelectedId(id)
    setDraft({})
    setRunId((n) => n + 1)
  }

  // On the home map, clicking a field sends the agent there and then walks into the 3D field view.
  const enterField = (id: string) => {
    select(id)
    if (enterTimer.current !== null) window.clearTimeout(enterTimer.current)
    const reduce = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches
    enterTimer.current = window.setTimeout(() => { enterTimer.current = null; setPage('field3d') }, reduce ? 0 : ENTER_DELAY_MS)
  }
  useEffect(() => () => { if (enterTimer.current !== null) window.clearTimeout(enterTimer.current) }, [])

  const calendar = plans?.plans[0]?.calendar ?? null
  const nextCrops = plans?.plans.filter((plan) => plan.rank === 1) ?? []
  const fieldOverview = (inMap = false) => field && snap && (
    <FieldOverview snap={snap} field={field} calendar={calendar}
      inMap={inMap}
      readings={(selectedId && readings[selectedId]) || {}} onReadings={updateReadings}
      onDelete={isUserField ? deleteUserField : undefined}
      onAnalyse={() => { setPage('planner'); setRunId((n) => n + 1) }} />
  )
  const scenarioPanel = field && (
    <ScenarioPanel draft={draft} onChange={setDraft} result={comparison}
      fieldIrrigation={field.irrigation} />
  )

  const userSelectedField = userFields.find((u) => u.id === selectedId)
  useEffect(() => {
    const shapes = [drawPts, userSelectedField?.points ?? []].filter((s) => s.length > 0)
    for (const p of shapes.flatMap(samplePoints)) {
      const k = ptKey(p)
      if (k in water) continue
      setWater((w) => ({ ...w, [k]: null }))
      waterAt(p).then((v) => setWater((w) => ({ ...w, [k]: v })))
    }
  }, [drawPts, userSelectedField])  // eslint-disable-line react-hooks/exhaustive-deps
  const waterFn = (p: LatLng) => water[ptKey(p)]
  // houses and village areas (OpenStreetMap) inside the shape being drawn and the selected own field
  const [buildingsFile, setBuildingsFile] = useState<BuildingsFile | null>(null)
  useEffect(() => { loadBuildings().then(setBuildingsFile) }, [])
  const drawBuilt = useMemo(() => (drawPts.length >= 3 ? builtNear(buildingsFile, drawPts) : null), [buildingsFile, drawPts])
  const fieldBuilt = useMemo(() => builtNear(buildingsFile, userSelectedField?.points ?? []), [buildingsFile, userSelectedField])
  const housesInDraw = useMemo(() => (drawBuilt ? buildingsInside(drawPts, drawBuilt.buildings) : []), [drawBuilt, drawPts])
  const drawCheck = useMemo(() => checkField(land, drawPts, waterFn, drawBuilt), [land, drawPts, water, drawBuilt])  // eslint-disable-line react-hooks/exhaustive-deps
  const fieldLand = useMemo(() => checkField(land, userSelectedField?.points ?? [], waterFn, fieldBuilt), [land, userSelectedField, water, fieldBuilt])  // eslint-disable-line react-hooks/exhaustive-deps
  const mapView = field && snap ? (
    <MapView snap={snap} selectedId={selectedId} onSelect={page === 'home' && !drawing ? enterField : select}
      rotation={{ fieldName: fieldName(field), previous: isUserField ? undefined : field.crop_history.at(-1), next: nextCrops }}
      fieldOptions={Object.values(profiles)} details={fieldOverview(true)} scenario={scenarioPanel}
      initialLayer={page === 'home' ? 'satellite' : 'map'} compact={page === 'home'} key={page}
      agentRun={field.agent_run ?? null} runId={runId}
      userFields={userFields} drawing={drawing} draft={drawPts} badCorners={drawCheck.badCorners} houses={housesInDraw}
      onDraftPoint={(pt) => setDrawPts((d) => [...d, pt])}
      overlay={drawing ? (
        <DrawPanel draft={drawPts} check={drawCheck} landYear={land?.year} onUndo={() => setDrawPts((d) => d.slice(0, -1))}
          onCancel={() => { setDrawing(false); setDrawPts([]) }} onSave={saveDrawn} />
      ) : null} />
  ) : null
  const hour = new Date().getHours()
  const greet = hour < 12 ? t('home.morning') : hour < 17 ? t('home.afternoon') : t('home.evening')
  const addField = () => { setPage('fields'); startDrawing() }

  return (
    <div className={`shell${drawing ? ' is-drawing' : ''}`}>
      <Sidebar page={page} onPage={setPage} />
      <div className="main">
        <header className="main-head" key={`h-${page}`} data-dir={dir}>
          <div>
            {page === 'home' ? (
              <>
                <p className="hello">{t('home.hello')} <span aria-hidden="true">☀</span></p>
                <h1>{greet}</h1>
              </>
            ) : (
              <>
                <h1>{t(`side.${page}` as Key)}</h1>
              </>
            )}
          </div>
          <div className="head-actions">
            <div className="lang-toggle" role="group" aria-label={t('lang.label')}>
              <button lang="en" aria-pressed={lang === 'en'} className={lang === 'en' ? 'active' : ''} onClick={() => setLanguage('en')}>{t('lang.en')}</button>
              <button lang="my" aria-pressed={lang === 'my'} className={lang === 'my' ? 'active' : ''} onClick={() => setLanguage('my')}>{t('lang.my')}</button>
            </div>
          </div>
        </header>

        {error && <div className="banner error">{t('common.error')}</div>}
        {!snap && !error && <div className="banner">{t('common.loading')}</div>}

        {snap && field && (
          <main className="page-body" key={page} data-dir={dir}>
            {page === 'home' && (
              <HomePage snap={snap} field={field} plans={plans} map={mapView} profiles={profiles}
                userFields={userFields} selectedId={selectedId} onSelect={select} onPage={setPage}
                onAdd={addField} />
            )}
            {page === 'fields' && (
              <div className="fields-page">
                <div className="fields-map">
                  <div className="field-strip" role="tablist" aria-label={t('field.choose')}>
                    {Object.values(snap.fields).map((f) => (
                      <button key={f.id} role="tab" aria-selected={f.id === selectedId}
                        className={`field-chip ${f.id === selectedId ? 'active' : ''}`} onClick={() => select(f.id)}>
                        <b>{f.id}</b> {townName(f.town_id, f.town_name)}
                        <small>{t('mine.example')}</small>
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
                {fieldOverview()}
              </div>
            )}
            {page === 'field3d' && (
              <FieldView key={field.id} snap={snap} field={field} plans={farmPlans} usesFarmerAnswers={!!farmAnswers} scenario={farmAnswers ? scenarioFor(farmAnswers) : undefined} onMap={() => setPage(backPage === 'field3d' ? 'home' : backPage)} />
            )}
            {page === 'planner' && plans && !fieldLand.plantable && (
              <NotPlantable ground={fieldLand.ground} year={land?.year} />
            )}
            {page === 'planner' && plans && fieldLand.plantable && (
              <div className="stack">
                <FarmerPlanner key={field.id} snap={snap} field={field} econ={econ} onPriorities={setPriorities}>
                  {(farmerPlans) => <PlansPanel result={farmerPlans} field={field} priorities={priorities} onPriorities={setPriorities}
                  econ={econ} onEcon={setEcon} />}
                </FarmerPlanner>
              </div>
            )}
            {page === 'scenarios' && scenarioPanel}
            {page === 'log' && field.agent_run && (
              <AgentLog run={field.agent_run} field={field} onReplay={() => setRunId((n) => n + 1)} />
            )}
          </main>
        )}

      </div>
    </div>
  )
}
