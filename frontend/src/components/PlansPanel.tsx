// AI-assisted: Claude Code
import { useState } from 'react'
import type { Econ, Priorities } from '../engine/types'
import { t } from '../i18n'

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

export function PlansPanel({ result, priorities, onPriorities, econ, onEcon }: {
  result: Result
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
            <p className="note">{t('priorities.lead')}</p>
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
            <p className="note">{t('econ.lead')}</p>
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
        {!incomeOn && <p className="note small">{t('econ.disabled')}</p>}
      </section>

      <section className="card">
        <div className="split-head">
          <div>
            <h3>{t('plans.title')}</h3>
            <p className="note">{t('plans.lead')}</p>
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

                {expanded && (
                  <div className="plan-body">
                    <div className="components">
                      <Comp label={t('plans.income')} value={plan.score_components.income === null ? t('common.notCalculated') : num(plan.score_components.income)} />
                      <Comp label={t('plans.soil')} value={num(plan.score_components.soil_health)} />
                      <Comp label={t('plans.water')} value={num(plan.score_components.water_saving)} />
                      <Comp label={t('plans.fit')} value={num(plan.score_components.season_field_fit)} />
                    </div>

                    <div className="reasons">
                      <div>
                        <h4>{t('plans.whyFor')}</h4>
                        <ul className="reason-list">
                          {plan.reasons_for.length === 0 && <li className="muted">{t('common.none')}</li>}
                          {plan.reasons_for.map((f: any, i: number) => (
                            <li key={i}><Delta value={f.score_delta} /> {f.reason}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <h4>{t('plans.whyAgainst')}</h4>
                        <ul className="reason-list">
                          {plan.reasons_against.length === 0 && <li className="muted">{t('common.none')}</li>}
                          {plan.reasons_against.map((f: any, i: number) => (
                            <li key={i}><Delta value={f.score_delta} /> {f.reason}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {plan.notes.length > 0 && (
                      <div>
                        <h4>{t('plans.notes')}</h4>
                        <ul className="reason-list neutral">
                          {plan.notes.map((f: any, i: number) => <li key={i}>{f.reason}</li>)}
                        </ul>
                      </div>
                    )}

                    <div className="two-col">
                      <div>
                        <h4>{t('plans.unknowns')}</h4>
                        <ul className="reason-list">
                          {plan.unknowns.map((u: any, i: number) => <li key={i}>{u.reason}</li>)}
                        </ul>
                      </div>
                      <div>
                        <h4>{t('plans.local')}</h4>
                        <ul className="check-list">
                          {plan.local_checks.map((c: string, i: number) => <li key={i}>{c}</li>)}
                        </ul>
                      </div>
                    </div>

                    <details className="evidence">
                      <summary>{t('plans.evidence')}</summary>
                      <ul>{plan.evidence_refs.map((r: string) => <li key={r}><code>{r}</code></li>)}</ul>
                      <p className="note small">{t('plans.weightLine', {
                        i: plan.weights.income, s: plan.weights.soil_health, w: plan.weights.water_saving,
                      })}</p>
                    </details>
                  </div>
                )}
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

function Comp({ label, value }: { label: string; value: string }) {
  return (
    <div className="comp">
      <span>{label}</span>
      <b>{value}</b>
    </div>
  )
}
