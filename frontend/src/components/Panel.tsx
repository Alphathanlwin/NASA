import { Fragment, useState } from 'react'
import type { Crop, FieldDetail, Plan, PlanResult, Priorities, Provenance } from '../api'
import { t } from '../i18n'

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

export function Badge({ p }: { p?: Provenance }) {
  if (!p) return null
  const status = p.status ?? 'CACHED'
  const title = [p.detail, p.version ? `version ${p.version}` : null, p.retrieved_utc ? `retrieved ${p.retrieved_utc}` : null]
    .filter(Boolean).join(' · ')
  return (
    <span className="badge-line" title={title}>
      <span className={`badge badge-${status.toLowerCase()}`}>{status.replace('_', ' ')}</span>
      <span className="badge-src">
        {p.source}{p.as_of ? ` · ${t('asOf', { d: p.as_of })}` : ''}
      </span>
    </span>
  )
}

function Metric({ label, value, unit, sub, p, show }: {
  label: string; value: string | number | null | undefined; unit?: string; sub?: string; p?: Provenance; show: boolean
}) {
  const missing = value == null
  return (
    <div className={`metric ${show ? 'in' : 'pending'}`}>
      <div className="metric-label">{label}</div>
      {show ? (
        <>
          <div className={`metric-value ${missing ? 'missing' : ''}`}>
            {missing ? (p?.status === 'NOT_CONNECTED' ? t('notConnected') : t('noData')) : <>{value}<small>{unit}</small></>}
          </div>
          {sub && !missing && <div className="metric-sub">{sub}</div>}
          <Badge p={p} />
        </>
      ) : (
        <div className="skeleton" />
      )}
    </div>
  )
}

export function FieldHeader({ f, crops }: { f: FieldDetail; crops: Crop[] }) {
  const name = (id: string) => crops.find((c) => c.id === id)?.name ?? id
  return (
    <header className="field-head">
      <div className="field-id">{f.id}</div>
      <h2>{f.name}</h2>
      <p>
        {t('acres', { a: (f.area_ha * 2.471).toFixed(0), h: f.area_ha })} · {f.irrigated ? t('irrigated') : t('rainfed')}
      </p>
      <p>
        {t('usualRotation')}: {f.crop_history.map(name).join(' → ')}
      </p>
      <Badge p={f.provenance.field} />
    </header>
  )
}

export function Conditions({ f, seen }: { f: FieldDetail; seen: Set<string> }) {
  const w = f.weather
  const wet = f.wetness
  const s = f.soil
  const change = wet?.gwetroot_7d_change
  return (
    <section>
      <h3>{t('conditions')}</h3>
      <div className="metrics">
        <Metric
          show={seen.has('reading_power')} label={t('rain7')} value={w?.rain_7d} unit=" mm" p={f.provenance.weather}
          sub={w ? t('rain30', { v: w.rain_30d, month: MONTHS[(w.clim_month?.month ?? 1) - 1], c: w.clim_month?.rain_mm }) : undefined}
        />
        <Metric
          show={seen.has('reading_power')} label={t('temperature')} value={w?.t2m} unit=" °C" p={f.provenance.weather}
          sub={w ? t('tempRange', { min: w.t2m_min, max: w.t2m_max }) : undefined}
        />
        <Metric
          show={seen.has('reading_wetness') || seen.has('reading_soil')} label={t('wetness')} value={wet?.gwetroot} p={f.provenance.wetness}
          sub={`${t('wetnessHint')}${change != null ? ` · ${t('wetnessChange', { v: (change > 0 ? '+' : '') + change })}` : ''}`}
        />
        <Metric
          show={seen.has('reading_soil')} label={t('soil')} value={s?.ph} p={f.provenance.soil}
          sub={s ? t('soilTexture', { clay: s.clay_pct, silt: s.silt_pct, sand: s.sand_pct }) : undefined}
        />
        <Metric show={seen.has('reading_smap')} label={t('smap')} value={f.smap?.value} unit=" m³/m³" sub={t('smapHint')} p={f.provenance.smap} />
        <Metric show={seen.has('reading_ndvi')} label={t('ndvi')} value={f.ndvi?.value} p={f.provenance.ndvi} />
      </div>
    </section>
  )
}

export function PrioritySliders({ value, onChange }: { value: Priorities; onChange: (p: Priorities) => void }) {
  const row = (key: keyof Priorities, label: string) => (
    <label className="slider">
      <span>{label}</span>
      <input type="range" min={0} max={100} step={5} value={value[key]} onChange={(e) => onChange({ ...value, [key]: Number(e.target.value) })} />
      <output>{value[key]}</output>
    </label>
  )
  return (
    <section>
      <h3>{t('priorities')}</h3>
      {row('income', t('income'))}
      {row('soil', t('soilHealth'))}
      {row('water', t('waterSaving'))}
    </section>
  )
}

export function ReturnsForm({ crops, value, onChange }: {
  crops: Crop[]; value: Record<string, number>; onChange: (v: Record<string, number>) => void
}) {
  return (
    <details className="returns">
      <summary>{t('returnsTitle')}</summary>
      <p className="hint">{t('returnsHint')}</p>
      <div className="returns-grid">
        {crops.filter((c) => c.id !== 'fallow').map((c) => (
          <label key={c.id}>
            <span>{c.name}</span>
            <input
              type="number" min={0} inputMode="decimal" value={value[c.id] ?? ''}
              onChange={(e) => {
                const next = { ...value }
                if (e.target.value === '') delete next[c.id]
                else next[c.id] = Number(e.target.value)
                onChange(next)
              }}
            />
          </label>
        ))}
      </div>
    </details>
  )
}

function Bar({ label, value }: { label: string; value: number }) {
  return (
    <div className="bar">
      <span>{label}</span>
      <div className="bar-track"><div className="bar-fill" style={{ width: `${value}%` }} /></div>
      <b>{value.toFixed(0)}</b>
    </div>
  )
}

function PlanCard({ plan, total, index }: { plan: Plan; total: number; index: number }) {
  const [open, setOpen] = useState(index === 0)
  const pts = (n?: number) => (n == null ? '' : `${n > 0 ? '+' : ''}${n}`)
  return (
    <article className={`plan ${plan.is_existing ? 'existing' : ''}`} style={{ animationDelay: `${index * 300}ms` }}>
      <div className="plan-top">
        <div>
          <div className="plan-rank">
            {t('rank', { n: plan.rank, total })}
            {plan.is_existing && <span className="tag">{t('existing')}</span>}
          </div>
          <div className="plan-seq">
            {plan.sequence.map((s, i) => (
              <Fragment key={s.slot}>
                {i > 0 && <i>→</i>}
                <span>
                  <b>{s.crop_name}</b>
                  <small>{s.slot_label}</small>
                </span>
              </Fragment>
            ))}
          </div>
        </div>
        <div className="plan-score"><b>{plan.score != null ? plan.score.toFixed(0) : '–'}</b><small>{t('score')}</small></div>
      </div>
      <Bar label={t('income')} value={plan.breakdown.income ?? 0} />
      <Bar label={t('soilHealth')} value={plan.breakdown.soil ?? 0} />
      <Bar label={t('waterSaving')} value={plan.breakdown.water ?? 0} />
      {plan.breakdown.adjustment != null && plan.breakdown.adjustment !== 0 && (
        <div className="adjust">{t('adjustment')}: {pts(plan.breakdown.adjustment)}</div>
      )}
      <button className="link" onClick={() => setOpen(!open)} aria-expanded={open}>{open ? '▾' : '▸'} {t('why')} / {t('whyNot')}</button>
      {open && (
        <div className="plan-detail">
          <h4>{t('why')}</h4>
          <ul className="for">{plan.reasons_for.map((r, i) => <li key={i}><em>{pts(r.points)}</em> {r.text}</li>)}</ul>
          <h4>{t('whyNot')}</h4>
          <ul className="against">
            {plan.reasons_against.length === 0 && <li>–</li>}
            {plan.reasons_against.map((r, i) => <li key={i}><em>{pts(r.points)}</em> {r.text}</li>)}
          </ul>
          {plan.notes.length > 0 && <ul className="notes">{plan.notes.map((r, i) => <li key={i}>{r.text}</li>)}</ul>}
          <h4>{t('evidence')}</h4>
          <ul className="evidence">{plan.evidence.map((e, i) => <li key={i}>{e.label}: <b>{e.value}</b> <small>{e.source}</small></li>)}</ul>
          <h4>{t('gaps')}</h4>
          <ul>{plan.gaps.map((g, i) => <li key={i}>{g}</li>)}</ul>
          <h4>{t('checkLocally')}</h4>
          <ul className="local">{plan.check_locally.map((g, i) => <li key={i}>{g}</li>)}</ul>
        </div>
      )}
    </article>
  )
}

export function Plans({ result }: { result: PlanResult }) {
  return (
    <section>
      <h3>{t('plans')}</h3>
      <p className="hint">{t('plansSub', { n: result.considered })}</p>
      {result.plans.map((p, i) => <PlanCard key={p.id} plan={p} total={result.considered} index={i} />)}
      {result.existing_note && <p className="hint warn">{result.existing_note}</p>}
      {result.rejected_count > 0 && (
        <details className="rejected">
          <summary>{t('rejected', { n: result.rejected_count })}</summary>
          <ul>{result.rejected.map((r, i) => <li key={i}><b>{r.sequence.join(' → ')}</b>: {r.reasons.join(' ')}</li>)}</ul>
        </details>
      )}
      <p className="disclaimer">{t('disclaimer')}</p>
    </section>
  )
}
