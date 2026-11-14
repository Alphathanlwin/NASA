// AI-assisted: Claude Code
import type { FieldValue, Provenance as ProvenanceRec, Status } from '../data'
import { fmtDate, t } from '../i18n'

const ICON: Record<Status, string> = {
  LIVE: '●', CACHED: '◷', DEMO: '◇', UNAVAILABLE: '×', 'USER-INPUT': '✎',
}

export function StatusPill({ status }: { status: Status }) {
  return (
    <span className={`pill pill-${status.toLowerCase()}`} title={t(`status.${status}` as never)}>
      <span aria-hidden="true">{ICON[status]}</span> {status}
    </span>
  )
}

export function fmtValue(v: number | string | null, digits = 1): string {
  if (v === null || v === undefined || v === '') return '—'
  if (typeof v === 'string') return v
  const n = Number(v)
  if (Number.isNaN(n)) return String(v)
  return Number.isInteger(n) ? String(n) : n.toFixed(digits).replace(/0+$/, '').replace(/\.$/, '')
}

/** Full metadata for one displayed value: dataset, product, variable, unit, resolution, period, retrieval, status. */
export function ProvenanceBlock({ value, prov }: { value: FieldValue; prov?: ProvenanceRec }) {
  const status = value.status ?? prov?.status ?? 'CACHED'
  return (
    <details className="prov">
      <summary>
        <StatusPill status={status} />
        <span className="prov-summary">
          {prov ? prov.dataset : t('provenance.none')}
        </span>
      </summary>
      <dl className="prov-grid">
        <dt>{t('provenance.dataset')}</dt><dd>{prov?.dataset ?? '—'}</dd>
        <dt>{t('provenance.product')}</dt><dd>{prov?.product ?? '—'}</dd>
        <dt>{t('provenance.variable')}</dt><dd>{value.variable || '—'}</dd>
        <dt>{t('provenance.unit')}</dt><dd>{value.unit || '—'}</dd>
        <dt>{t('provenance.resolution')}</dt><dd>{prov?.spatial_resolution ?? '—'}</dd>
        <dt>{t('provenance.period')}</dt><dd>{value.period ?? '—'}</dd>
        <dt>{t('provenance.retrieved')}</dt><dd>{fmtDate(prov?.retrieved_at)}</dd>
        <dt>{t('provenance.status')}</dt><dd>{t(`status.${status}` as never)}</dd>
        <dt>{t('provenance.scale')}</dt><dd>{prov?.scale ?? '—'}</dd>
      </dl>
    </details>
  )
}

export function Metric({ label, value, unit, hint, value_rec, prov }: {
  label: string
  value: string
  unit?: string
  hint?: string
  value_rec?: FieldValue
  prov?: ProvenanceRec
}) {
  return (
    <div className="metric">
      <div className="metric-label">{label}</div>
      <div className="metric-value">
        {value}
        {unit && value !== '—' && <span className="unit">{unit}</span>}
      </div>
      {hint && <div className="metric-hint">{hint}</div>}
      {value_rec && <ProvenanceBlock value={value_rec} prov={prov} />}
    </div>
  )
}
