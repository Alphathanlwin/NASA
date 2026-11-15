// AI-assisted: Claude Code
import { useState } from 'react'
import type { Econ, Priorities } from '../engine/types'
import { t } from '../i18n'
import type { Key } from '../i18n'
import { doyLabel } from '../engine/engine'
import { TABLE } from '../engine/crops'
import { Icon } from './Sidebar'
import { FertiliserGuide } from './FertiliserGuide'

type Result = any
type Plan = any

const CAT_ICON: Record<string, string> = {
  worth_investigating: '✓',
  possible_with_caution: '!',
  weak_fit: '~',
  not_workable: '×',
}

function num(x: number | null | undefined) {
  return x === null || x === undefined ? '—' : String(Math.round(x * 10) / 10)
}

function Delta({ value }: { value: number }) {
  return <span className={`delta ${value > 0 ? 'pos' : value < 0 ? 'neg' : 'zero'}`}>{value > 0 ? '+' : ''}{value}</span>
}

const TILE_ICON = {
  income: 'M12 3v18M16.5 7.5c0-1.9-2-3-4.5-3s-4.5 1.1-4.5 3 2 2.6 4.5 3.1 4.5 1.4 4.5 3.4-2 3-4.5 3-4.5-1.1-4.5-3',
  soil: 'M5 21c0-9 6-15 15-16-1 9-7 15-15 16zM5 21l8-8',
  water: 'M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z',
  fit: 'M3 17c3-2 6-2 9 0s6 2 9 0M3 12c3-2 6-2 9 0s6 2 9 0M7 4l3 4M14 4l-3 4',
}

function ScoreTile({ kind, label, value }: { kind: keyof typeof TILE_ICON; label: string; value: string }) {
  const scored = value !== t('common.notCalculated') && value !== '—'
  return (
    <div className={`pd-tile pd-${kind}`}>
      <span className="pd-tile-text">
        <small>{label}</small>
        <b>{value}{scored && <span>/100</span>}</b>
      </span>
      <span className="pd-tile-icon"><Icon d={TILE_ICON[kind]} size={22} /></span>
    </div>
  )
}

/** clay >= 35 heavy; clay < 18 with sand > 65 light; otherwise medium (same rule as the engine). */
function textureOf(clay: number | null, sand: number | null) {
  if (clay === null) return null
  if (clay >= 35) return 'heavy'
  if (clay < 18 && sand !== null && sand > 65) return 'light'
  return 'medium'
}

/** The plan laid out as the agreed mockup: score tiles, reasons, key data table, missing info, local checks. */
function PlanDetail({ plan, total, field }: { plan: Plan; total: number; field?: any }) {
  const crop = (TABLE as any).crops[plan.dry_crop] ?? {}
  const val = (k: string) => (field?.values?.[k]?.value ?? null) as number | null
  const ph = val('soil_ph'), clay = val('clay_pct'), sand = val('sand_pct')
  const phOpt: number[] | undefined = crop.ph_opt?.value
  const texOpt: string[] | undefined = crop.texture_opt?.value
  const tex = textureOf(clay, sand)
  const cal = plan.calendar
  const pts = (v: number | null) => (v === null ? t('common.notCalculated') : `${num(v)} /100`)
  const rows: [string, string][] = [
    [t('pd.rotation'), plan.sequence.join(' → ')],
    [t('pd.rank'), t('pd.rankOf', { n: plan.rank, total })],
    [t('pd.overall'), `${num(plan.score)} /100 (${plan.category_label})`],
    [t('plans.income'), pts(plan.score_components.income)],
    [t('plans.soil'), pts(plan.score_components.soil_health)],
    [t('plans.water'), pts(plan.score_components.water_saving)],
    [t('plans.fit'), pts(plan.score_components.season_field_fit)],
  ]
  if (ph !== null) rows.push([t('pd.ph'), `${ph}${phOpt ? ` (${t('pd.optimum')} ${phOpt[0]}–${phOpt[1]})` : ''}`])
  if (tex) {
    const opt = texOpt ? ` (${t('pd.optimum')} ${texOpt.map((x) => t(`pd.tex.${x}` as Key)).join(', ')})` : ''
    rows.push([t('pd.texture'), `${t(`pd.tex.${tex}` as Key)} (${t('pd.clay')} ${clay}%)${opt}`])
  }
  if (crop.water_category?.value) rows.push([t('pd.waterNeed'), t(`pd.water.${crop.water_category.value}` as Key)])
  if (cal?.sow) rows.push([t('pd.sow'), cal.sow])
  if (cal?.harvest) rows.push([t('pd.harvest'), t('pd.around', { d: cal.harvest })])
  if (cal?.sow_day != null && cal?.harvest_day != null) rows.push([t('pd.days'), t('pd.daysValue', { n: cal.harvest_day - cal.sow_day })])
  if (cal?.onset_doy != null) {
    rows.push([t('pd.onset'), doyLabel(cal.onset_doy)])
    rows.push([t('pd.heatStart'), doyLabel(61)])  // engine window day 60 = 1 March in a common year; its reason text says 1 March
  }

  return (
    <div className="plan-body pd">
      <div className="pd-tiles">
        <ScoreTile kind="income" label={t('plans.income')} value={plan.score_components.income === null ? t('common.notCalculated') : num(plan.score_components.income)} />
        <ScoreTile kind="soil" label={t('plans.soil')} value={num(plan.score_components.soil_health)} />
        <ScoreTile kind="water" label={t('plans.water')} value={num(plan.score_components.water_saving)} />
        <ScoreTile kind="fit" label={t('plans.fit')} value={num(plan.score_components.season_field_fit)} />
      </div>

      <div className="pd-grid">
        <section className="pd-box pd-for">
          <h4>{t('plans.whyFor')}</h4>
          {plan.reasons_for.length === 0 ? <p className="muted">{t('common.none')}</p> : (
            <ul className="pd-reasons">
              {plan.reasons_for.map((f: any, i: number) => (
                <li key={i}><Delta value={f.score_delta} /><span>{f.reason}</span></li>
              ))}
            </ul>
          )}
        </section>
        <div className="pd-col">
          <section className="pd-box">
            <h4>{t('plans.whyAgainst')}</h4>
            {plan.reasons_against.length === 0 ? <p className="muted">{t('common.none')}</p> : (
              <ul className="pd-reasons">
                {plan.reasons_against.map((f: any, i: number) => (
                  <li key={i}><Delta value={f.score_delta} /><span>{f.reason}</span></li>
                ))}
              </ul>
            )}
          </section>
          {plan.notes.length > 0 && (
            <section className="pd-box pd-neutral">
              <h4>{t('plans.notes')}</h4>
              <ul className="pd-bullets">{plan.notes.map((f: any, i: number) => <li key={i}>{f.reason}</li>)}</ul>
            </section>
          )}
        </div>

        <section className="pd-box">
          <h4>{t('pd.keyData')}</h4>
          <table className="pd-table">
            <thead><tr><th>{t('pd.parameter')}</th><th>{t('pd.details')}</th></tr></thead>
            <tbody>{rows.map(([k, v]) => <tr key={k}><td>{k}</td><td>{v}</td></tr>)}</tbody>
          </table>
        </section>
        <div className="pd-col">
          <section className="pd-box">
            <h4>{t('plans.unknowns')}</h4>
            {plan.unknowns.length === 0 ? <p className="muted">{t('common.none')}</p> : <ul className="pd-bullets">{plan.unknowns.map((u: any, i: number) => <li key={i}>{u.reason}</li>)}</ul>}
          </section>
          <section className="pd-box">
            <h4>{t('plans.local')}</h4>
            {plan.local_checks.length === 0 ? <p className="muted">{t('common.none')}</p> : <ul className="pd-bullets">{plan.local_checks.map((c: string, i: number) => <li key={i}>{c}</li>)}</ul>}
          </section>
        </div>
      </div>

      <FertiliserGuide planId={plan.id} />

      <details className="evidence">
        <summary>{t('plans.evidence')}</summary>
        <ul>{plan.evidence_refs.map((r: string) => <li key={r}><code>{r}</code></li>)}</ul>
        <p className="note small">{t('plans.weightLine', {
          i: plan.weights.income, s: plan.weights.soil_health, w: plan.weights.water_saving,
        })}</p>
      </details>
    </div>
  )
}

export function PlansPanel({ result, priorities, onPriorities, econ, onEcon, field }: {
  result: Result
  field?: any
  priorities: Priorities
  onPriorities: (p: Priorities) => void
  econ: Econ
  onEcon: (e: Econ) => void
}) {
  const [open, setOpen] = useState<string | null>(result.plans[0]?.id ?? null)
  const incomeOn = result.income_enabled

  const setEconValue = (crop: string, key: 'price' | 'cost', raw: string) => {
    const next: Econ = { ...econ, [crop]: { ...(econ[crop] ?? {}) } }
    next[crop]![key] = raw === '' ? null : Number(raw)
    onEcon(next)
  }

  return (
    <div className="stack">
      <section className="card">
        <div className="split-head">
          <div>
            <h3>{t('priorities.title')}</h3>
          </div>
          <div className="weight-chip">{t('plans.weightLine', {
            i: result.weights.income, s: result.weights.soil_health, w: result.weights.water_saving,
          })}</div>
        </div>
        <div className="sliders">
          <Slider label={t('priorities.income')} value={priorities.income} disabled={!incomeOn}
            onChange={(v) => onPriorities({ ...priorities, income: v })} />
          <Slider label={t('priorities.soil')} value={priorities.soil_health}
            onChange={(v) => onPriorities({ ...priorities, soil_health: v })} />
          <Slider label={t('priorities.water')} value={priorities.water_saving}
            onChange={(v) => onPriorities({ ...priorities, water_saving: v })} />
        </div>
        {!incomeOn && <p className="inline-warning">{t('plans.noIncome')}</p>}
      </section>

      <section className="card">
        <div className="split-head">
          <div>
            <h3>{t('econ.title')}</h3>
          </div>
          {Object.keys(econ).length > 0 && (
            <button className="btn ghost small" onClick={() => onEcon({})}>{t('econ.clear')}</button>
          )}
        </div>
        <div className="econ-grid">
          {['rice', 'mung_bean', 'black_gram'].map((crop) => (
            <div className="econ-row" key={crop}>
              <b>{crop.replace('_', ' ')}</b>
              <label>
                <span>{t('econ.price')}</span>
                <input inputMode="decimal" value={econ[crop]?.price ?? ''}
                  onChange={(e) => setEconValue(crop, 'price', e.target.value)} />
              </label>
              <label>
                <span>{t('econ.cost')}</span>
                <input inputMode="decimal" value={econ[crop]?.cost ?? ''}
                  onChange={(e) => setEconValue(crop, 'cost', e.target.value)} />
              </label>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <div className="split-head">
          <div>
            <h3>{t('plans.title')}</h3>
          </div>
          <span className="engine-tag">{t('plans.engine', { v: result.engine_version })}</span>
        </div>

        <div className="plan-list">
          {result.plans.map((plan: Plan) => {
            const expanded = open === plan.id
            return (
              <article key={plan.id} className={`plan plan-${plan.category}`}>
                <button className="plan-head" onClick={() => setOpen(expanded ? null : plan.id)} aria-expanded={expanded}>
                  <div className="plan-title">
                    <span className={`cat-icon cat-${plan.category}`} aria-hidden="true">{CAT_ICON[plan.category]}</span>
                    <div>
                      <b>{plan.sequence.join(' → ')}</b>
                      <div className="plan-sub">
                        {plan.is_baseline && <span className="tag">{t('plans.baseline')}</span>}
                        <span>{t('plans.rank', { n: plan.rank, total: result.plans.length })}</span>
                      </div>
                    </div>
                  </div>
                  <div className="score-box">
                    <div className="score">{num(plan.score)}</div>
                    <small>{t('plans.outOf')}</small>
                  </div>
                  <div className={`category cat-${plan.category}`}>{plan.category_label}</div>
                </button>

                <div className="score-track" role="img" aria-label={`${plan.score} / 100`}>
                  <div className={`score-fill cat-bg-${plan.category}`} style={{ width: `${Math.max(2, plan.score)}%` }} />
                </div>

                {expanded && <PlanDetail plan={plan} total={result.plans.length} field={field} />}
              </article>
            )
          })}
        </div>
        <p className="note small">{result.disclaimer}</p>
      </section>
    </div>
  )
}

function Slider({ label, value, onChange, disabled }: {
  label: string; value: number; disabled?: boolean; onChange: (v: number) => void
}) {
  return (
    <label className={`slider ${disabled ? 'is-disabled' : ''}`}>
      <span>{label}<b>{value}</b></span>
      <input type="range" min={0} max={100} step={5} value={value} disabled={disabled}
        onChange={(e) => onChange(Number(e.target.value))} />
    </label>
  )
}

