// AI-assisted: Claude Code
import type { ReactNode } from 'react'
import type { Snapshot, SnapshotField } from '../data'
import { doyLabel } from '../engine/engine'
import { t, townName, fieldName } from '../i18n'
import type { Readings } from '../userfields'
import { StatusPill } from './Provenance'
import { EnvConditions } from './EnvConditions'
import { ReadingsCard } from './ReadingsCard'

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
          {/* example shapes are illustrative, so only a field the farmer drew has a measured size */}
          {field.status === 'USER-INPUT' && <Fact label={t('field.area')} value={t('field.acres', { a: field.area_acres })} />}
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

      <EnvConditions snap={snap} field={field} />
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
