// AI-assisted: Claude Code
// Layer 3 of the answer: the analyst view moved out of the farmer flow (moved, not deleted).
// Scores, rule points, missing information, local checks, fertiliser guide, evidence,
// plus the optional price form that switches income on.
import { useState } from 'react'
import type { runPlans } from '../data'
import type { Econ, Scenario } from '../engine/types'
import { t } from '../i18n'
import type { Key } from '../i18n'
import { FertiliserGuide } from './FertiliserGuide'

type Result = ReturnType<typeof runPlans>

const CAT_ICON: Record<string, string> = {
  worth_investigating: '✓', possible_with_caution: '!', weak_fit: '~', not_workable: '×',
}

function num(x: number | null | undefined) {
  return x === null || x === undefined ? '—' : String(Math.round(x * 10) / 10)
}

function Delta({ value }: { value: number }) {
  return <span className={`delta ${value > 0 ? 'pos' : value < 0 ? 'neg' : 'zero'}`}>{value > 0 ? '+' : ''}{value}</span>
}

export function DetailsDrawer({ result, scenario, econ, onEcon }: {
  result: Result; scenario: Scenario; econ: Econ; onEcon: (e: Econ) => void
}) {
  const [open, setOpen] = useState<string | null>(result.plans[0]?.id ?? null)
  const setEconValue = (crop: string, key: 'price' | 'cost', raw: string) => {
    const next: Econ = { ...econ, [crop]: { ...(econ[crop] ?? {}) } }
    next[crop]![key] = raw === '' ? null : Number(raw)
    onEcon(next)
  }
  const changed = (Object.keys(scenario) as (keyof Scenario)[]).filter((k) => scenario[k] !== undefined)

  return (
    <div className="fp-details">
      <p className="note">{t('fp.dt.weights', {
        i: result.weights.income, s: result.weights.soil_health, w: result.weights.water_saving,
      })}</p>
      <p className="note">{changed.length ? t('fp.dt.scenario') : t('fp.dt.none')}</p>
      {changed.length > 0 && (
        <ul className="reason-list neutral">
          {changed.map((k) => <li key={k}>{t(`fp.dt.sc.${k}` as Key, { v: String(scenario[k]) })}</li>)}
        </ul>
      )}

      <div className="plan-list">
        {result.plans.map((plan) => {
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
                <div className={`category cat-${plan.category}`}>{t(`cat.${plan.category}` as Key)}</div>
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
                        {plan.reasons_for.map((f, i) => <li key={i}><Delta value={f.score_delta} /> {f.reason}</li>)}
                      </ul>
                    </div>
                    <div>
                      <h4>{t('plans.whyAgainst')}</h4>
                      <ul className="reason-list">
                        {plan.reasons_against.length === 0 && <li className="muted">{t('common.none')}</li>}
                        {plan.reasons_against.map((f, i) => <li key={i}><Delta value={f.score_delta} /> {f.reason}</li>)}
                      </ul>
                    </div>
                  </div>
                  {plan.notes.length > 0 && (
                    <div>
                      <h4>{t('plans.notes')}</h4>
                      <ul className="reason-list neutral">{plan.notes.map((f, i) => <li key={i}>{f.reason}</li>)}</ul>
                    </div>
                  )}
                  <div className="two-col">
                    <div>
                      <h4>{t('plans.unknowns')}</h4>
                      <ul className="reason-list">{plan.unknowns.map((u, i) => <li key={i}>{u.reason}</li>)}</ul>
                    </div>
                    <div>
                      <h4>{t('plans.local')}</h4>
                      <ul className="check-list">{plan.local_checks.map((c, i) => <li key={i}>{c}</li>)}</ul>
                    </div>
                  </div>
                  <FertiliserGuide planId={plan.id} />
                  <details className="evidence">
                    <summary>{t('plans.evidence')}</summary>
                    <ul>{plan.evidence_refs.map((r) => <li key={r}><code>{r}</code></li>)}</ul>
                  </details>
                </div>
              )}
            </article>
          )
        })}
      </div>

      <details className="fp-prices">
        <summary>{t('fp.dt.prices')}</summary>
        <p className="note">{t('econ.lead')}</p>
        <div className="econ-grid">
          {['rice', 'mung_bean', 'black_gram'].map((crop) => (
            <div className="econ-row" key={crop}>
              <b>{t(`crop.${crop}` as Key)}</b>
              <label>
                <span>{t('econ.price')}</span>
                <input inputMode="decimal" value={econ[crop]?.price ?? ''} onChange={(e) => setEconValue(crop, 'price', e.target.value)} />
              </label>
              <label>
                <span>{t('econ.cost')}</span>
                <input inputMode="decimal" value={econ[crop]?.cost ?? ''} onChange={(e) => setEconValue(crop, 'cost', e.target.value)} />
              </label>
            </div>
          ))}
        </div>
        {!result.income_enabled && <p className="note small">{t('econ.disabled')}</p>}
        {Object.keys(econ).length > 0 && <button className="btn ghost small" onClick={() => onEcon({})}>{t('econ.clear')}</button>}
      </details>

      <p className="note small">{t('plans.engine', { v: result.engine_version })} · {result.disclaimer}</p>
    </div>
  )
}

function Comp({ label, value }: { label: string; value: string }) {
  return <div className="comp"><span>{label}</span><b>{value}</b></div>
}
