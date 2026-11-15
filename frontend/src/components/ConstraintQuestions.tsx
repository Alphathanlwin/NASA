// AI-assisted: Claude Code
// Steps 2-4: what is true on the farm right now. Disasters (some satellite-checkable),
// price pressure and resource limits (farmer-reported only, never inferred from data).
// "Not sure" is always an answer and never blocks the flow.
import { t } from '../i18n'
import type { Key } from '../i18n'
import { DISASTERS, LIMIT_KEYS, PRICE_KEYS, stepDone } from '../planner/flow'
import type { Answers, Disaster, Water } from '../planner/flow'
import { ChoiceCard, Question, StepHead, StepNav, triOptions } from './PlannerUI'

const D_ICON: Record<Disaster, string> = {
  flood: 'flood', drought: 'water', storm: 'storm', heat: 'safe', pest: 'pesticide', erosion: 'field', none: 'check',
}

interface StepProps { a: Answers; onChange: (a: Answers) => void; onNext: () => void; onBack: () => void }

export function DisasterStep({ a, onChange, onNext, onBack }: StepProps) {
  const toggle = (d: Disaster) => {
    const on = !a.disasters.includes(d)
    let next = on ? [...a.disasters, d] : a.disasters.filter((x) => x !== d)
    if (on && d === 'none') next = ['none']
    if (on && d !== 'none') next = next.filter((x) => x !== 'none')
    onChange({ ...a, disasters: next })
  }
  return (
    <section className="fp-screen">
      <StepHead title={t('fp.q2')} sub={t('fp.q2sub')} />
      <div className="fp-chips" role="group" aria-label={t('fp.q2')}>
        {DISASTERS.map((d) => (
          <ChoiceCard key={d} role="checkbox" icon={D_ICON[d]} checked={a.disasters.includes(d)} onClick={() => toggle(d)}
            title={t(`fp.d.${d}.t` as Key)} desc={t(`fp.d.${d}.d` as Key)} />
        ))}
      </div>
      <Question icon="flood" q={t('fp.stays.q')} d={t('fp.stays.d')} options={triOptions('fp.stays')}
        value={a.waterStays} onChange={(v) => onChange({ ...a, waterStays: v })} />
      <StepNav onBack={onBack} onNext={onNext} disabled={!stepDone(2, a)} />
    </section>
  )
}

export function PriceStep({ a, onChange, onNext, onBack }: StepProps) {
  return (
    <section className="fp-screen">
      <StepHead title={t('fp.q3')} />
      {PRICE_KEYS.map((k) => (
        <Question key={k} icon={k} q={t(`fp.pr.${k}.q` as Key)} d={t(`fp.pr.${k}.d` as Key)} options={triOptions(`fp.pr.${k}`)}
          value={a.prices[k]} onChange={(v) => onChange({ ...a, prices: { ...a.prices, [k]: v } })} />
      ))}
      <StepNav onBack={onBack} onNext={onNext} disabled={!stepDone(3, a)} />
    </section>
  )
}

export function LimitStep({ a, onChange, onNext, onBack }: StepProps) {
  const water: { value: Water; label: string }[] = [
    { value: 'available', label: t('fp.w.available') },
    { value: 'sometimes', label: t('fp.w.sometimes') },
    { value: 'unavailable', label: t('fp.w.unavailable') },
    { value: 'unsure', label: t('fp.notSure') },
  ]
  return (
    <section className="fp-screen">
      <StepHead title={t('fp.q4')} />
      <Question icon="water" q={t('fp.w.q')} d={t('fp.w.d')} options={water}
        value={a.water} onChange={(v) => onChange({ ...a, water: v })} />
      {LIMIT_KEYS.map((k) => (
        <Question key={k} icon={k} q={t(`fp.l.${k}.q` as Key)} d={t(`fp.l.${k}.d` as Key)} options={triOptions(`fp.l.${k}`)}
          value={a.limits[k]} onChange={(v) => onChange({ ...a, limits: { ...a.limits, [k]: v } })} />
      ))}
      <StepNav onBack={onBack} onNext={onNext} disabled={!stepDone(4, a)} />
    </section>
  )
}
