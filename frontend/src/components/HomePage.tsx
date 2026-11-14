// AI-assisted: Claude Code
// Farmer home: summary tiles, the field on the map, key conditions, crop advice, the assumed
// crop calendar and the farmer's fields. Everything shown here comes from the snapshot, the
// engine or the farmer; nothing is a forecast.
import type { ReactNode } from 'react'
import type { runPlans, Snapshot, SnapshotField, Status } from '../data'
import { doyLabel } from '../engine/engine'
import { fmtDate, t, townName } from '../i18n'
import type { Key } from '../i18n'
import type { UserField } from '../userfields'
import { StatusPill } from './Provenance'
import { RecommendedCrop } from './RecommendedCrop'
import { Icon } from './Sidebar'

const MONTH_DAYS = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
function todayDoy(): number {
  const d = new Date()
  return MONTH_DAYS.slice(0, d.getMonth()).reduce((a, b) => a + b, 0) + d.getDate()
}

function Tile({ icon, label, value, sub, tone }: { icon: ReactNode; label: string; value: ReactNode; sub?: ReactNode; tone?: string }) {
  return (
    <div className={`tile ${tone ?? ''}`}>
      <div className="tile-icon">{icon}</div>
      <div>
        <span className="tile-label">{label}</span>
        <b className="tile-value">{value}</b>
        {sub && <span className="tile-sub">{sub}</span>}
      </div>
    </div>
  )
}

function Cond({ icon, label, value, unit, sub, status }: {
  icon: string; label: string; value: string; unit?: string; sub: string; status: Status
}) {
  return (
    <div className="cond">
      <div className="cond-head"><Icon d={icon} size={20} /><span>{label}</span></div>
      <b className="cond-value">{value}{unit && value !== '—' && <small> {unit}</small>}</b>
      <span className="cond-sub">{sub}</span>
      <StatusPill status={status} />
    </div>
  )
}

const ICON = {
  rain: 'M7 15a4 4 0 0 1-.6-8A6 6 0 0 1 18 6a4.5 4.5 0 0 1-.5 9M8 19l-1 2M12 19l-1 2M16 19l-1 2',
  sat: 'M4 20l4-4M13 5l6 6-4 4-6-6zM9 9l-3 3 6 6 3-3M18 3l3 3',
  drop: 'M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z',
  tap: 'M4 10h10a3 3 0 0 1 3 3v1M14 7v3M6 10V7h8M17 17v.01M17 20v.01M20 18v.01',
  cal: 'M7 3v3M17 3v3M4 8h16M5 5h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z',
  clock: 'M12 7v5l3 2M12 21a9 9 0 1 1 0-18 9 9 0 0 1 0 18z',
  pin: 'M12 21s7-6.2 7-12a7 7 0 0 0-14 0c0 5.8 7 12 7 12zM12 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4z',
  area: 'M4 20L12 4l8 16zM8 14h8',
  db: 'M4 6c0-1.7 3.6-3 8-3s8 1.3 8 3-3.6 3-8 3-8-1.3-8-3zM4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6',
}

export function HomePage({ snap, field, plans, map, profiles, userFields, selectedId, onSelect, onPage, onAdd, readingsMoisture }: {
  snap: Snapshot
  field: SnapshotField
  plans: ReturnType<typeof runPlans> | null
  map: ReactNode
  profiles: Record<string, SnapshotField>
  userFields: UserField[]
  selectedId: string | null
  onSelect: (id: string) => void
  onPage: (p: 'fields' | 'field3d' | 'planner' | 'scenarios') => void
  onAdd: () => void
  readingsMoisture?: string | null
}) {
  const best = plans?.plans.find((p) => p.rank === 1)
  const cal = best?.calendar as { sow: string; harvest: string; sow_day: number; harvest_day: number; onset_doy: number | null } | undefined
  const now = todayDoy()
  // Dry-season sowing is in Nov-Dec; days after day 366 belong to the next year.
  const nowAdj = cal && now < cal.sow_day - 60 ? now + 366 : now
  const daysToHarvest = cal ? Math.max(0, cal.harvest_day - nowAdj) : null
  const v = field.values
  const soilUser = field.values.user_moisture
  const sm = v.smap_soil_moisture
  const updated = snap.retrieved_at

  // Where today falls: 0 = before sowing (rice harvest season), 2 = growing, 3 = harvest due.
  const stage = !cal ? -1 : nowAdj < cal.sow_day ? 0 : nowAdj < cal.harvest_day ? 2 : 3
  const steps = cal ? [
    { key: 'cal.prep', when: t('cal.prepWhen') },
    { key: 'cal.sow', when: cal.sow },
    { key: 'cal.grow', when: t('cal.growWhen') },
    { key: 'cal.harvest', when: cal.harvest },
    { key: 'cal.rain', when: cal.onset_doy !== null ? doyLabel(cal.onset_doy) : '—' },
  ] : []

  const examples = Object.values(snap.fields)

  return (
    <div className="home">
      <section className="tiles">
        <div className="tile tile-select">
          <div className="tile-icon leaf"><Icon d="M5 21c0-9 6-15 15-16-1 9-7 15-15 16zM5 21l8-8" /></div>
          <div>
            <span className="tile-label">{t('tile.field')}</span>
            <select value={selectedId ?? ''} onChange={(e) => onSelect(e.target.value)} aria-label={t('tile.field')}>
              {examples.map((f) => <option key={f.id} value={f.id}>{f.id} {townName(f.town_id, f.town_name)}</option>)}
              {userFields.map((u) => <option key={u.id} value={u.id}>✎ {u.name}</option>)}
            </select>
            <span className="tile-sub">{t('field.acres', { a: field.area_acres })} · {t(field.status === 'USER-INPUT' ? 'mine.badge' : 'mine.example')}</span>
          </div>
        </div>
        <Tile icon={<Icon d={ICON.cal} />} label={t('tile.sow')} value={cal?.sow ?? '—'} sub={t('tile.assumed')} tone="amber" />
        <Tile icon={<Icon d={ICON.clock} />} label={t('tile.harvest')} value={cal?.harvest ?? '—'}
          sub={daysToHarvest !== null ? t('tile.inDays', { n: daysToHarvest }) : undefined} tone="rose" />
        <Tile icon={<Icon d={ICON.db} />} label={t('tile.updated')} value={updated ? fmtDate(updated).slice(0, 10) : '—'} sub={t('tile.updatedSub')} tone="blue" />
      </section>

      <div className="home-grid">
        <div className="home-main">
          <section className="card glance">
            <div className="card-head">
              <h3>{t('glance.title')}</h3>
              <button className="btn ghost small" onClick={() => onPage('fields')}>{t('glance.open')}</button>
            </div>
            {map}
            <div className="glance-facts">
              <span><Icon d={ICON.area} size={18} /><small>{t('field.area')}</small><b>{t('field.acres', { a: field.area_acres })}</b></span>
              <span><Icon d={ICON.pin} size={18} /><small>{t('glance.location')}</small><b>{t('glance.near', { town: townName(field.town_id, field.town_name), d: field.town_distance_km })}</b></span>
              <span><Icon d={ICON.db} size={18} /><small>{t('glance.source')}</small><b>{t('glance.sourceVal')}</b></span>
            </div>
          </section>

          <section className="card">
            <div className="card-head">
              <h3>{t('cond.title')}</h3>
              <span className="note small">{t('cond.updated', { d: v.rain_7d?.period?.replace('7 days to ', '') ?? '—' })}</span>
            </div>
            <div className="conds">
              <Cond icon={ICON.rain} label={t('cond.rain7')} value={v.rain_7d?.value != null ? String(v.rain_7d.value) : '—'} unit="mm"
                sub={t('cond.rain7Src')} status={(field.provenance.power_recent?.status ?? 'UNAVAILABLE') as Status} />
              <Cond icon={ICON.sat} label={t('cond.rain30')} value={v.imerg_rain_30d?.value != null ? String(v.imerg_rain_30d.value) : '—'} unit="mm"
                sub={t('cond.rain30Src')} status={(v.imerg_rain_30d?.value != null ? 'CACHED' : 'UNAVAILABLE') as Status} />
              {soilUser ? (
                <Cond icon={ICON.drop} label={t('cond.soil')} value={t(`m.${readingsMoisture ?? soilUser.value}` as Key)}
                  sub={t('cond.soilYours')} status="USER-INPUT" />
              ) : (
                <Cond icon={ICON.drop} label={t('cond.soil')} value={sm?.value != null ? String(sm.value) : t('cond.unknown')}
                  unit={sm?.value != null ? 'm³/m³' : undefined} sub={sm?.value != null ? t('cond.soilSat') : t('cond.soilNone')}
                  status={(sm?.value != null ? 'CACHED' : 'UNAVAILABLE') as Status} />
              )}
              <Cond icon={ICON.tap} label={t('cond.irr')} value={t(`irr.${field.irrigation}` as Key)}
                sub={field.status === 'USER-INPUT' || field.values.user_drainage || field.values.user_moisture ? t('cond.irrYours') : t('cond.irrDemo')}
                status={field.status === 'DEMO' ? 'DEMO' : 'USER-INPUT'} />
            </div>
            <div className="cond-foot">
              <span>{t('cond.note')}</span>
              <a className="link" href="https://github.com/Alphathanlwin/NASA/blob/main/data/SOURCES.md" target="_blank" rel="noreferrer">{t('cond.more')}</a>
            </div>
            <div className="field-nutrients">
              <h4>{t('overview.nutrients')}</h4>
              <p className="note">{t('overview.nutrientsNote')}</p>
            </div>
          </section>
        </div>

        <div className="home-side">
          {plans && <RecommendedCrop result={plans} onOpen={() => onPage('planner')} />}
          {cal && (
            <section className="card">
              <h3>{t('cal.title')} <small className="muted-inline">{t('cal.sub')}</small></h3>
              <ol className="timeline">
                {steps.map((s, i) => {
                  const state = i < stage ? 'done' : i === stage ? 'now' : 'next'
                  return (
                    <li key={s.key} className={`${state} ph-${i}`}>
                      <span className="dot" aria-hidden="true" />
                      <b>{t(s.key as Key)}</b>
                      <small>{state === 'now' ? t('cal.now') : s.when}</small>
                    </li>
                  )
                })}
              </ol>
              <p className="note small">{t('cal.note')}</p>
            </section>
          )}

          <section className="card">
            <div className="card-head">
              <h3>{t('fields.title')}</h3>
              <button className="btn ghost small" onClick={onAdd}>+ {t('mine.add')}</button>
            </div>
            <ul className="field-list">
              {[...examples.map((f) => ({ id: f.id, label: `${f.id} ${townName(f.town_id, f.town_name)}`, acres: f.area_acres, mine: false })),
                ...userFields.map((u) => ({ id: u.id, label: u.name, acres: profiles[u.id]?.area_acres, mine: true }))].map((f) => (
                <li key={f.id}>
                  <button className={f.id === selectedId ? 'active' : ''} onClick={() => onSelect(f.id)}>
                    <span>{f.mine ? '✎ ' : ''}{f.label} <small>{f.mine ? t('mine.badge') : t('mine.example')}</small></span>
                    <span className="fl-right">{t('field.acres', { a: f.acres })}
                      {f.id === selectedId ? <em>{t('fields.selected')}</em> : <span aria-hidden="true">›</span>}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  )
}
