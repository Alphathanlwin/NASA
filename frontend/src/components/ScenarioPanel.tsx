// AI-assisted: Claude Code
import type { ReactNode } from 'react'
import { TABLE } from '../engine/crops.ts'
import type { Scenario } from '../engine/types'
import { t } from '../i18n'

type Compare = any

const ASSUMPTION_LABEL: Record<string, string> = {
  irrigation: 'scenario.irrigation',
  planting_delay_days: 'scenario.delay',
  residual_moisture: 'scenario.moisture',
  drainage: 'scenario.drainage',
  rainfall_change_percent: 'scenario.rainfall',
}

function show(assumption: string, v: unknown): string {
  if (assumption === 'planting_delay_days') return t('scenario.days', { n: v as number })
  if (assumption === 'rainfall_change_percent') return `${v}%`
  return String(v)
}

export function ScenarioPanel({ draft, onChange, result, fieldIrrigation }: {
  draft: Scenario
  onChange: (s: Scenario) => void
  result: Compare | null
  fieldIrrigation: string
}) {
  const set = (key: keyof Scenario, value: string | number | undefined) => {
    const next: Scenario = { ...draft }
    if (value === undefined) delete next[key]
    else (next as any)[key] = value
    onChange(next)
  }

  const changed = result?.changed_assumptions ?? []

  return (
    <div className="stack">
      <section className="card">
        <h3>{t('scenario.title')}</h3>

        <div className="scenario-grid">
          <Group label={t('scenario.irrigation')}>
            <Choice active={!draft.irrigation} onClick={() => set('irrigation', undefined)}>{t('scenario.keep')} ({fieldIrrigation})</Choice>
            <Choice active={draft.irrigation === 'available'} onClick={() => set('irrigation', 'available')}>{t('scenario.available')}</Choice>
            <Choice active={draft.irrigation === 'sometimes'} onClick={() => set('irrigation', 'sometimes')}>{t('scenario.sometimes')}</Choice>
            <Choice active={draft.irrigation === 'unavailable'} onClick={() => set('irrigation', 'unavailable')}>{t('scenario.unavailable')}</Choice>
          </Group>

          <Group label={t('scenario.delay')}>
            <Choice active={!draft.planting_delay_days} onClick={() => set('planting_delay_days', undefined)}>{t('scenario.days', { n: 0 })}</Choice>
            <Choice active={draft.planting_delay_days === 7} onClick={() => set('planting_delay_days', 7)}>{t('scenario.days', { n: 7 })}</Choice>
            <Choice active={draft.planting_delay_days === 14} onClick={() => set('planting_delay_days', 14)}>{t('scenario.days', { n: 14 })}</Choice>
          </Group>

          <Group label={t('scenario.moisture')}>
            <Choice active={!draft.residual_moisture || draft.residual_moisture === 'normal'} onClick={() => set('residual_moisture', undefined)}>{t('scenario.normal')}</Choice>
            <Choice active={draft.residual_moisture === 'low'} onClick={() => set('residual_moisture', 'low')}>{t('scenario.low')}</Choice>
          </Group>

          <Group label={t('scenario.drainage')}>
            <Choice active={!draft.drainage} onClick={() => set('drainage', undefined)}>{t('scenario.unknown')}</Choice>
            <Choice active={draft.drainage === 'good'} onClick={() => set('drainage', 'good')}>{t('scenario.good')}</Choice>
            <Choice active={draft.drainage === 'poor'} onClick={() => set('drainage', 'poor')}>{t('scenario.poor')}</Choice>
          </Group>

          <Group label={t('scenario.rainfall')}>
            <Choice active={!draft.rainfall_change_percent} onClick={() => set('rainfall_change_percent', undefined)}>{t('scenario.off')}</Choice>
            <Choice active={draft.rainfall_change_percent === -20} onClick={() => set('rainfall_change_percent', -20)}>{t('scenario.minus20')}</Choice>
          </Group>
        </div>

        <div className="scenario-actions">
          <button className="btn ghost small" onClick={() => onChange({})}>{t('scenario.reset')}</button>
        </div>
        <p className="note small">{t('scenario.rainNote')}</p>
      </section>

      {changed.length === 0 && <section className="card empty-card">{t('scenario.noChange')}</section>}

      {changed.length > 0 && result && (
        <>
          <section className="card">
            <h3>{t('scenario.changed')}</h3>
            <div className="changed-row">
              {changed.map((c: any) => (
                <span className="changed-chip" key={c.assumption}>
                  {t(ASSUMPTION_LABEL[c.assumption] as never)}: <s>{show(c.assumption, c.from)}</s> → <b>{show(c.assumption, c.to)}</b>
                </span>
              ))}
            </div>
          </section>

          <section className="card">
            <div className="split-head">
              <h3>{t('scenario.original')} → {t('scenario.scenario')}</h3>
              <span className="engine-tag">{result.note}</span>
            </div>
            <div className="compare-table">
              <div className="compare-head">
                <span>{t('plans.title')}</span>
                <span>{t('plans.score')}</span>
                <span>{t('plans.rankLabel')}</span>
                <span>{t('plans.category')}</span>
              </div>
              {result.plans.map((p: any) => {
                const diff = Math.round((p.score_to - p.score_from) * 10) / 10
                return (
                  <div className="compare-row" key={p.id}>
                    <b>{p.sequence.join(' → ')}</b>
                    <span className="compare-score">
                      {p.score_from} → <b>{p.score_to}</b>
                      {diff !== 0 && (
                        <em className={diff > 0 ? 'pos' : 'neg'}>
                          {diff > 0 ? '+' : ''}{diff}
                        </em>
                      )}
                    </span>
                    <span>{p.rank_from} → {p.rank_to}</span>
                    <span>
                      {TABLE.categories[p.category_from]} → <b>{TABLE.categories[p.category_to]}</b>
                    </span>
                  </div>
                )
              })}
            </div>
            <div className="why-list">
              <h4>{t('scenario.why')}</h4>
              {result.plans.every((p: any) => p.why_it_changed.length === 0) && (
                <p className="note">{t('scenario.noPlanChange')}</p>
              )}
              {result.plans.map((p: any) => (
                p.why_it_changed.length > 0 && (
                  <div className="why-block" key={p.id}>
                    <b>{p.sequence.join(' → ')}</b>
                    <ul className="reason-list">
                      {p.why_it_changed.map((w: string, i: number) => <li key={i}>{w}</li>)}
                    </ul>
                  </div>
                )
              ))}
            </div>
          </section>
        </>
      )}
    </div>
  )
}

function Group({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="choice-group">
      <div className="choice-label">{label}</div>
      <div className="choices">{children}</div>
    </div>
  )
}

function Choice({ active, onClick, children }: { active: boolean; onClick: () => void; children: ReactNode }) {
  return <button className={`choice ${active ? 'active' : ''}`} onClick={onClick} aria-pressed={active}>{children}</button>
}
