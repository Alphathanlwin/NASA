// AI-assisted: Claude Code
// Step 1: the farmer's priority in their own words, then one trade-off question.
// A priority only counts after it survives the trade-off (validation mechanism 1).
import { t } from '../i18n'
import type { Key } from '../i18n'
import { PRIORITY_IDS } from '../planner/flow'
import type { Answers, PriorityId } from '../planner/flow'
import { ChoiceCard, Hint, StepHead, StepNav } from './PlannerUI'

export function PriorityInterview({ a, onChange, onNext }: {
  a: Answers; onChange: (a: Answers) => void; onNext: () => void
}) {
  const pick = (p: PriorityId) => onChange({ ...a, priority: p, tradeoff: a.priority === p ? a.tradeoff : null })
  return (
    <section className="fp-screen" aria-labelledby="fp-step-title">
      <StepHead title={t('fp.q1')} sub={t('fp.q1sub')} />
      <div className="fp-choices" role="radiogroup" aria-label={t('fp.q1')}>
        {PRIORITY_IDS.map((p) => (
          <ChoiceCard key={p} icon={p} checked={a.priority === p} onClick={() => pick(p)}
            title={t(`fp.p.${p}.t` as Key)} desc={t(`fp.p.${p}.d` as Key)} />
        ))}
      </div>

      {a.priority && (
        <div className="fp-followup" aria-live="polite">
          <p className="fp-followup-q">{t(`fp.trade.${a.priority}` as Key)}</p>
          <p className="fp-followup-d">{t('fp.tradeSub')}</p>
          <div className="fp-yn n2" role="group">
            <button type="button" aria-pressed={a.tradeoff === 'keep'} onClick={() => onChange({ ...a, tradeoff: 'keep' })}>
              {t('fp.keep')}
            </button>
            <button type="button" aria-pressed={a.tradeoff === 'switch'} onClick={() => onChange({ ...a, tradeoff: 'switch' })}>
              {t('fp.switch')}
            </button>
          </div>
        </div>
      )}

      <StepNav onNext={onNext} disabled={!a.priority || !a.tradeoff} />
      <Hint>{t('fp.hintSteps')}</Hint>
    </section>
  )
}
