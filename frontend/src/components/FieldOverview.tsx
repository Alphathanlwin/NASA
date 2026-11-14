// AI-assisted: Claude Code
import type { ReactNode } from 'react'
import type { Snapshot, SnapshotField } from '../data'
import { doyLabel } from '../engine/engine'
import { t, townName, fieldName } from '../i18n'
import type { Readings } from '../userfields'
import { Metric, StatusPill } from './Provenance'
import { ReadingsCard } from './ReadingsCard'

function val(rec: SnapshotField, key: string) {
  return rec.values[key]
}

function prov(rec: SnapshotField, key: string) {
  const source = rec.values[key]?.source
  return source ? rec.provenance[source] : undefined
}

export function FieldOverview({ snap, field, onAnalyse, calendar, readings, onReadings, onDelete, inMap }: {
  snap: Snapshot
  field: SnapshotField
  onAnalyse: () => void
  calendar: { sow: string; harvest: string; onset_doy: number | null } | null
  readings: Readings
  onReadings: (r: Readings) => void
  onDelete?: () => void
  inMap?: boolean
}) {
  const userRain = val(field, 'user_rain_30d')
  const rain7 = val(field, 'rain_7d')
  const rain30 = val(field, 'rain_30d')
  const rainNormal = val(field, 'rain_30d_normal')
  const dryNormal = val(field, 'dry_season_rain_normal')
  const monsoonNormal = val(field, 'monsoon_rain_normal')
  const temp = val(field, 't2m')
  const tmax = val(field, 't2m_max')
  const tmin = val(field, 't2m_min')
  const wet = val(field, 'gwetroot')
  const ph = val(field, 'soil_ph')
  const clay = val(field, 'clay_pct')
  const silt = val(field, 'silt_pct')
  const sand = val(field, 'sand_pct')
  const smap = val(field, 'smap_soil_moisture')
  const imerg = val(field, 'imerg_rain_30d')
  const ndvi = val(field, 'ndvi')

  return (
    <div className="stack">
      <section className="card intro-card">
        <div>
          <p className="eyebrow">{t('overview.selected')}</p>
          <h2>{fieldName(field)}</h2>
        </div>
        <button className="btn primary" onClick={onAnalyse}>{t('field.analyse')}</button>
      </section>

      <section className="card">
        <h3>{field.status === 'USER-INPUT' ? t('mine.heading') : t('field.heading')}</h3>
        <div className="facts">
          <Fact label={t('field.area')} value={t('field.acres', { a: field.area_acres })} />
          <Fact label={t('field.reference')} value={`${townName(field.town_id, field.town_name)} · ${t('field.distance', { d: field.town_distance_km })}`} />
          <Fact label={t('field.irrigation')} value={field.irrigation} />
          <Fact label={t('field.history')} value={field.status === 'USER-INPUT' ? t('map.noCrop') :
            field.crop_history.map((crop) => crop === 'rice' ? t('crop.rice') : crop).join(' → ') || t('map.noCrop')} />
          <Fact label={t('field.status')} value={<StatusPill status={field.status} />} />
          <Fact label={t('field.grid')} value={`${field.power_grid[0]}, ${field.power_grid[1]}`} />
        </div>
        {onDelete && (
          <button className="btn ghost small danger" onClick={() => { if (window.confirm(t('mine.deleteConfirm'))) onDelete() }}>
            {t('mine.delete')}
          </button>
        )}
        {calendar && (
          <div className="calendar">
            <b>{t('overview.calendar')}</b>
            <span>{t('overview.sow', { d: calendar.sow })}</span>
            <span>{t('overview.harvest', { d: calendar.harvest })}</span>
            {calendar.onset_doy !== null && (
              <span>{t('overview.onset', { d: doyLabel(calendar.onset_doy) })}</span>
            )}
          </div>
        )}
      </section>

      <ReadingsCard readings={readings} onChange={onReadings} inMap={inMap} />

      <section className="card">
        <h3>{t('overview.conditions')}</h3>
        <div className="metrics">
          <Metric label={t('overview.rain7')} value={rain7 ? String(rain7.value ?? '—') : '—'} unit={rain7?.unit}
            value_rec={rain7} prov={prov(field, 'rain_7d')} />
          <Metric label={t('overview.rain30')} value={rain30 ? String(rain30.value ?? '—') : '—'} unit={rain30?.unit}
            hint={rainNormal ? t('overview.normalHint', { v: rainNormal.value }) : undefined}
            value_rec={rain30} prov={prov(field, 'rain_30d')} />
          <Metric label={t('overview.dryNormal')} value={dryNormal ? String(dryNormal.value ?? '—') : '—'} unit={dryNormal?.unit}
            value_rec={dryNormal} prov={prov(field, 'dry_season_rain_normal')} />
          <Metric label={t('overview.monsoonNormal')} value={monsoonNormal ? String(monsoonNormal.value ?? '—') : '—'} unit={monsoonNormal?.unit}
            value_rec={monsoonNormal} prov={prov(field, 'monsoon_rain_normal')} />
          <Metric label={t('overview.temp')} value={temp ? String(temp.value ?? '—') : '—'} unit={temp?.unit}
            hint={tmax && tmin ? t('overview.tempRange', { min: tmin.value, max: tmax.value }) : undefined}
            value_rec={temp} prov={prov(field, 't2m')} />
          <Metric label={t('overview.wetness')} value={wet ? String(wet.value ?? '—') : '—'} unit={wet?.unit}
            hint={t('overview.wetnessHint')} value_rec={wet} prov={prov(field, 'gwetroot')} />
          <Metric label={t('overview.soil')} value={ph ? String(ph.value ?? '—') : '—'} unit={ph?.unit}
            hint={clay?.value != null ? t('overview.texture', { clay: clay.value, silt: silt?.value, sand: sand?.value }) : undefined}
            value_rec={ph} prov={prov(field, 'soil_ph')} />
          <Metric label={t('overview.ndvi')} value={ndvi ? String(ndvi.value ?? '—') : '—'}
            hint={t('overview.ndviHint')} value_rec={ndvi} prov={prov(field, 'ndvi')} />
          <Metric label={t('overview.smap')} value={smap?.value == null ? '—' : String(smap.value)} unit={smap?.unit}
            hint={t('overview.smapHint')} value_rec={smap} prov={prov(field, 'smap_soil_moisture')} />
          <Metric label={t('overview.imerg')} value={imerg?.value == null ? '—' : String(imerg.value)} unit={imerg?.unit}
            hint={t('overview.imergHint')} value_rec={imerg} prov={prov(field, 'imerg_rain_30d')} />
          {userRain && (
            <Metric label={t('overview.userRain')} value={String(userRain.value)} unit={userRain.unit}
              hint={t('overview.userRainHint')} value_rec={userRain} prov={prov(field, 'user_rain_30d')} />
          )}
        </div>
        <p className="note small">
          {t('footer.data')} · {snap.sources_retrieved_at?.slice(0, 10)}
        </p>
      </section>
    </div>
  )
}

function Fact({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="fact">
      <span>{label}</span>
      <b>{value}</b>
    </div>
  )
}
