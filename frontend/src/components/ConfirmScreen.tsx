// AI-assisted: Claude Code
// Step 6: the confirmation gate. The app reads back what it understood, each line with a
// "Change" link. No recommendation renders before the farmer taps "Yes, show my crop".
import type { SnapshotField } from '../data'
import { getLang, t } from '../i18n'
import type { Key } from '../i18n'
import { LIMIT_KEYS, PRICE_KEYS } from '../planner/flow'
import type { Answers, Check, FieldFacts } from '../planner/flow'
import { CheckList } from './FieldCheck'
import { Hint, Icon, StepHead, StepNav } from './PlannerUI'

export const join = (xs: string[]) => xs.join(getLang() === 'my' ? '၊ ' : ', ')

export function priorityLine(a: Answers) {
  if (!a.priority) return ''
  const suffix = a.tradeoff === 'switch' ? t('fp.c.switched') : t('fp.c.kept')
  return `${t(`fp.p.${a.priority}.t` as Key)} — ${suffix}`
}

export function pressureLine(a: Answers) {
  const yes = PRICE_KEYS.filter((k) => a.prices[k] === 'yes').map((k) => t(`fp.rb.pr.${k}` as Key))
  const unsure = PRICE_KEYS.filter((k) => a.prices[k] === 'unsure').length
  const parts = yes.length ? yes : [t('fp.c.noPressure')]
  if (unsure) parts.push(t('fp.c.unsure', { n: unsure }))
  return join(parts)
}

export function limitLine(a: Answers) {
  const water = a.water === 'unsure' ? t('fp.notSure') : a.water ? t(`fp.irr.${a.water}` as Key) : '—'
  const yes = LIMIT_KEYS.filter((k) => a.limits[k] === 'yes').map((k) => t(`fp.rb.l.${k}` as Key))
  const unsure = LIMIT_KEYS.filter((k) => a.limits[k] === 'unsure').length
  const parts = [t('fp.rb.water', { w: water }), ...(yes.length ? yes : [t('fp.c.noLimit')])]
  if (unsure) parts.push(t('fp.c.unsure', { n: unsure }))
  return join(parts)
}

function disasterLine(a: Answers) {
  const d = a.disasters.map((x) => t(`fp.d.${x}.t` as Key))
  const stays = a.waterStays ? t(`fp.rb.stays.${a.waterStays}` as Key) : ''
  return join([...d, stays].filter(Boolean))
}

export function fieldLine(field: SnapshotField, f: FieldFacts) {
  const ph = field.values.soil_ph?.value
  return t('fp.c.field', {
    name: field.name, wet: t(`fp.wet.${f.wet}` as Key), g: f.gwetroot === null ? '—' : f.gwetroot.toFixed(2),
    ph: ph ?? '—', rain: f.rain30 === null ? '—' : Math.round(f.rain30),
  })
}

export function ConfirmScreen({ a, field, facts, checks, onGoto, onConfirm, onBack }: {
  a: Answers; field: SnapshotField; facts: FieldFacts; checks: Check[]
  onGoto: (step: number) => void; onConfirm: () => void; onBack: () => void
}) {
  const items: { icon: string; text: string; step: number; who: 'you' | 'nasa' }[] = [
    { icon: 'target', text: priorityLine(a), step: 1, who: 'you' },
    { icon: 'storm', text: disasterLine(a), step: 2, who: 'you' },
    { icon: 'sell', text: pressureLine(a), step: 3, who: 'you' },
    { icon: 'labour', text: limitLine(a), step: 4, who: 'you' },
    { icon: 'field', text: fieldLine(field, facts), step: 5, who: 'nasa' },
  ]
  return (
    <section className="fp-screen">
      <StepHead title={t('fp.q6')} sub={t('fp.q6sub')} />
      <ul className="fp-confirm">
        {items.map((it) => (
          <li key={it.step}>
            <button type="button" className="fp-confirm-item" onClick={() => onGoto(it.step)}>
              <Icon name={it.icon} size={22} />
              <span className="fp-confirm-text">
                <span className={`fp-src fp-src-${it.who === 'you' ? 'you' : 'nasa'}`}>{t(`fp.src.${it.who}` as Key)}</span>
                {it.text}
              </span>
              <span className="fp-link">{t('fp.change')}</span>
            </button>
          </li>
        ))}
      </ul>
      {checks.some((c) => c.kind !== 'agree') && (
        <>
          <h3 className="fp-minor">{t('fp.c.checks')}</h3>
          <CheckList checks={checks.filter((c) => c.kind !== 'agree')} onGoto={onGoto} />
        </>
      )}
      <StepNav onBack={onBack} onNext={onConfirm} nextLabel={t('fp.confirm')} nextIcon="check" />
      <Hint>{t('fp.confirmHint')}</Hint>
    </section>
  )
}
