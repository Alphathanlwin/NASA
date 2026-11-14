// AI-assisted: Claude Code
import type { CleaningEntry, Snapshot, Status } from '../data'
import { fmtDate, t } from '../i18n'
import { StatusPill } from './Provenance'

const STATUS: Record<string, Status> = {
  power_recent: 'CACHED', power_history: 'CACHED', modis: 'CACHED', soilgrids: 'CACHED',
  outputs: 'CACHED', ecocrop: 'CACHED', gibs: 'LIVE', osm: 'LIVE', fields: 'DEMO',
}
// Sources that need an Earthdata login: CACHED once a retrieval is recorded, otherwise UNAVAILABLE.
const LOGIN_SOURCES = new Set(['imerg', 'smap'])

function entryId(key: string) {
  return key.split(':')[0]
}

export function DataQuality({ snap }: { snap: Snapshot }) {
  const report = snap.cleaning_report?.sources ?? {}
  return (
    <div className="stack">
      <section className="card">
        <h3>{t('quality.title')}</h3>
        <p className="lead">{t('quality.lead')}</p>
        <p className="note small">{t('quality.pipeline')}</p>
      </section>

      <section className="card">
        <h3>{t('quality.sources')}</h3>
        <div className="source-list">
          {snap.sources.map((s) => {
            const status: Status = LOGIN_SOURCES.has(s.id)
              ? (s.retrieved_at ? 'CACHED' : 'UNAVAILABLE')
              : (STATUS[s.id] ?? 'CACHED')
            return (
              <article className="source" key={s.id}>
                <div className="source-head">
                  <b>{s.name}</b>
                  <StatusPill status={status} />
                </div>
                <dl className="prov-grid">
                  <dt>{t('provenance.product')}</dt><dd>{s.product} · {s.version}</dd>
                  <dt>{t('provenance.variable')}</dt><dd>{s.variables}</dd>
                  <dt>{t('provenance.resolution')}</dt><dd>{s.spatial_resolution}</dd>
                  <dt>{t('provenance.period')}</dt><dd>{s.period}</dd>
                  <dt>{t('quality.retrieved')}</dt><dd>{fmtDate(s.retrieved_at)}</dd>
                  <dt>{t('quality.usedFor')}</dt><dd>{s.used_for}</dd>
                  <dt>{t('quality.file')}</dt><dd><code>{s.files}</code></dd>
                  <dt>{t('quality.licence')}</dt><dd>{s.licence}</dd>
                  <dt>{t('quality.method')}</dt><dd><a href={s.url} target="_blank" rel="noreferrer">{s.url}</a></dd>
                </dl>
              </article>
            )
          })}
        </div>
      </section>

      <section className="card">
        <h3>{t('quality.cleaning')}</h3>
        {Object.keys(report).length === 0 && <p className="note">{t('quality.noReport')}</p>}
        {Object.keys(report).length > 0 && (
          <div className="clean-table">
            <div className="clean-head">
              <span>{t('quality.dataset')}</span><span>{t('quality.rowsIn')}</span><span>{t('quality.rowsOut')}</span>
              <span>{t('quality.dropped')}</span><span>{t('quality.fixed')}</span><span>{t('provenance.period')}</span>
            </div>
            {Object.entries(report).map(([key, e]) => (
              <CleanRow key={key} name={key} entry={e} />
            ))}
          </div>
        )}
        <p className="note small">{t('quality.retrievedAt', { d: fmtDate(snap.cleaning_report?.retrieved_at) })}</p>
      </section>
    </div>
  )
}

function CleanRow({ name, entry }: { name: string; entry: CleaningEntry }) {
  const dropped = entry.dropped?.map((d) => `${d.reason} (${d.rows})`) ?? []
  const fixed = entry.values_set_missing?.filter((v) => v.values > 0).map((v) => `${v.reason} (${v.values})`) ?? []
  return (
    <div className="clean-row">
      <span><b>{name}</b><em>{entryId(name)}</em></span>
      <span>{entry.rows_in}</span>
      <span>{entry.rows_out}</span>
      <span>{dropped.length ? dropped.join('; ') : t('quality.none')}</span>
      <span>{fixed.length ? fixed.join('; ') : t('quality.none')}</span>
      <span>{entry.date_range?.join(' → ')}</span>
    </div>
  )
}
