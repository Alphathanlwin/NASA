// AI-assisted: Claude Code
// Floating recommendation cards. Content comes straight from the rotation engine (runPlans).
import { useState } from 'react'
import type { runPlans } from '../data'
import { t } from '../i18n'
import type { Key } from '../i18n'

type Result = ReturnType<typeof runPlans>
export type Plan = Result['plans'][number]

const tk = (k: string, p?: Record<string, string | number>) => t(k as Key, p)

export function cropName(id: string | null | undefined) {
  if (!id) return t('sim.noCrop')
  const s = tk(`crop.${id}`)
  return s === `crop.${id}` ? id : s
}

export function PlanCards({ result, chosenId, disabled, onChoose }: {
  result: Result
  chosenId: string | null
  disabled: boolean
  onChoose: (plan: Plan) => void
}) {
  const [open, setOpen] = useState<string | null>(null)
  const plans = [...result.plans].sort((a, b) => a.rank - b.rank)
  return (
    <div className="plan-cards" role="list" aria-label={t('field3d.cardsTitle')}>
      <div className="plan-cards-head">
        <b>{t('field3d.cardsTitle')}</b>
        <span>{t('field3d.cardsSub')}</span>
      </div>
      {plans.map((p, i) => {
        const chosen = p.id === chosenId
        const dim = chosenId !== null && !chosen
        return (
          <article key={p.id} role="listitem" style={{ animationDelay: `${i * 0.7}s` }}
            className={`plan-card float ${chosen ? 'chosen' : ''} ${dim ? 'dim' : ''} cat-${p.category}`}>
            <header>
              <span className="pc-rank">{t('field3d.rank', { n: p.rank })}</span>
              {p.is_baseline && <span className="pc-usual">{t('field3d.usual')}</span>}
              <span className="pc-score">{t('field3d.score', { s: p.score })}</span>
            </header>
            <h3>{cropName('rice')} → {cropName(p.dry_crop)}</h3>
            <div className="pc-cat">{tk(`cat.${p.category}`)}</div>
            {p.reasons_for[0] && <p className="pc-for"><b>{t('field3d.for')}:</b> {p.reasons_for[0].reason}</p>}
            {p.reasons_against[0] && <p className="pc-against"><b>{t('field3d.against')}:</b> {p.reasons_against[0].reason}</p>}
            {open === p.id && (
              <ul className="pc-more">
                {p.reasons_for.slice(1).map((r) => <li key={r.rule} className="pc-for">{r.reason}</li>)}
                {p.reasons_against.slice(1).map((r) => <li key={r.rule} className="pc-against">{r.reason}</li>)}
              </ul>
            )}
            <footer>
              <button className="link" onClick={() => setOpen(open === p.id ? null : p.id)} aria-expanded={open === p.id}>
                {t('field3d.why')}
              </button>
              <button className="primary" disabled={disabled} onClick={() => onChoose(p)}>
                {chosen ? t('field3d.chosen') : t('field3d.plant')}
              </button>
            </footer>
          </article>
        )
      })}
    </div>
  )
}
