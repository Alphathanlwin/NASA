// AI-assisted: Claude Code
// Small building blocks shared by the farmer planner steps: icons, big choice cards,
// three-way questions and the step navigation. Flat, 56px+ targets, one primary action.
import type { ReactNode } from 'react'
import { t } from '../i18n'
import type { Key } from '../i18n'

const PATHS: Record<string, ReactNode> = {
  money: <><rect x="2.5" y="6" width="19" height="12" rx="2" /><circle cx="12" cy="12" r="2.6" /></>,
  soil: <><path d="M12 21v-8" /><path d="M12 13C12 9 9 6.5 5 6.5c0 4 3 6.5 7 6.5z" /><path d="M12 10c0-3.5 2.5-6 6.5-6 0 4-2.5 6-6.5 6z" /></>,
  water: <path d="M12 3.5c3.5 4.2 6.5 7.8 6.5 11a6.5 6.5 0 1 1-13 0c0-3.2 3-6.8 6.5-11z" />,
  safe: <><path d="M12 3l7 3v5c0 4.5-3 8.2-7 10-4-1.8-7-5.5-7-10V6z" /><path d="M9 12l2.2 2.2L15.5 10" /></>,
  flood: <path d="M3 15c2.5 0 2.5 1.6 5 1.6S10.5 15 13 15s2.5 1.6 5 1.6 2.5-1.6 3-1.6M3 19.5c2.5 0 2.5 1.6 5 1.6s2.5-1.6 5-1.6 2.5 1.6 5 1.6 2.5-1.6 3-1.6M12 3v7M8.5 6.5L12 10l3.5-3.5" />,
  fert: <><path d="M7 3h10l1.5 18h-13z" /><path d="M6.3 10h11.4" /></>,
  seed: <><ellipse cx="9" cy="9" rx="3.2" ry="4.4" transform="rotate(-24 9 9)" /><ellipse cx="15.5" cy="14.5" rx="3.2" ry="4.4" transform="rotate(-24 15.5 14.5)" /></>,
  fuel: <path d="M5 21V6a2 2 0 0 1 2-2h6a2 2 0 0 1 2 2v15M3 21h14M15 9h2.5A1.5 1.5 0 0 1 19 10.5V15a2 2 0 0 0 4 0V9.5L20.5 6M7.5 8h5v4h-5z" />,
  sell: <><path d="M4 17l5-6 4 3 7-8" /><path d="M15 6h5v5" /></>,
  labour: <><circle cx="9" cy="8" r="3.2" /><path d="M3.5 20c.6-3.2 2.8-5 5.5-5s4.9 1.8 5.5 5M16 5.5a3.2 3.2 0 0 1 0 5.5M17.8 15.3c1.6.7 2.5 2.3 2.8 4.7" /></>,
  machine: <><circle cx="7.5" cy="17" r="3.5" /><circle cx="17.5" cy="18.5" r="2.5" /><path d="M11 17h4M10 13.5L12.5 6H17l1.8 5.5" /></>,
  pesticide: <><circle cx="11" cy="11" r="5" /><path d="M11 6V3.5M7.5 7.5L5 5M14.5 7.5L17 5M6.5 12H3.5M20.5 12h-3M8 15.5L5.5 19M14 15.5L16.5 19" /></>,
  cash: <><path d="M4 8.5C4 6.6 7.6 5 12 5s8 1.6 8 3.5S16.4 12 12 12 4 10.4 4 8.5z" /><path d="M4 8.5V16c0 1.9 3.6 3.5 8 3.5s8-1.6 8-3.5V8.5" /></>,
  field: <><path d="M3 20h18M5 20v-6.5C5 9 8.5 5.5 12 5.5S19 9 19 13.5V20" /><path d="M12 20v-6" /></>,
  storm: <><path d="M3 10c2-3.5 5.5-5.5 9-5.5S19 6.5 21 10c-2 3.5-5.5 5.5-9 5.5S5 13.5 3 10z" /><path d="M3 16.5c3 1.8 6 2.7 9 2.7s6-.9 9-2.7" /></>,
  target: <><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="4.5" /></>,
  check: <path d="M4 12.5l5 5L20 6.5" />,
  arrow: <path d="M4 12h15M13 6l6 6-6 6" />,
  chev: <path d="M6 9l6 6 6-6" />,
  question: <><circle cx="12" cy="12" r="9" /><path d="M9.5 9.3A2.6 2.6 0 1 1 12 12.4V14" /><path d="M12 17h.01" /></>,
  list: <path d="M4 7h16M4 12h16M4 17h10" />,
  bars: <path d="M5 20V10M12 20V4M19 20v-8" />,
  pin: <><path d="M12 21s-6.5-5.6-6.5-11a6.5 6.5 0 0 1 13 0c0 5.4-6.5 11-6.5 11z" /><circle cx="12" cy="10" r="2.3" /></>,
  sat: <><rect x="9" y="9" width="6" height="6" rx="1" transform="rotate(45 12 12)" /><path d="M4 4l4 4M20 20l-4-4M3 9l3-3M18 21l3-3" /></>,
}

export function Icon({ name, size = 24 }: { name: string; size?: number }) {
  return (
    <svg className="fp-icon" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      {PATHS[name] ?? PATHS.question}
    </svg>
  )
}

export function ChoiceCard({ icon, title, desc, checked, onClick, role = 'radio' }: {
  icon: string; title: string; desc?: string; checked: boolean; onClick: () => void; role?: 'radio' | 'checkbox'
}) {
  return (
    <button type="button" className="fp-choice" role={role} aria-checked={checked} onClick={onClick}>
      <span className="fp-choice-ic"><Icon name={icon} size={28} /></span>
      <span className="fp-choice-text">
        <span className="fp-choice-t">{title}</span>
        {desc && <span className="fp-choice-d">{desc}</span>}
      </span>
      <span className="fp-tick" aria-hidden="true"><Icon name="check" size={14} /></span>
    </button>
  )
}

export interface Option<V extends string> { value: V; label: string }

/** One question with up to four big answer buttons ("Not sure" is always one of them). */
export function Question<V extends string>({ icon, q, d, options, value, onChange }: {
  icon: string; q: string; d?: string; options: Option<V>[]; value: V | null | undefined; onChange: (v: V) => void
}) {
  return (
    <div className="fp-q" role="group" aria-label={q}>
      <div className="fp-q-head">
        <span className="fp-q-ic"><Icon name={icon} /></span>
        <div>
          <div className="fp-q-t">{q}</div>
          {d && <div className="fp-q-d">{d}</div>}
        </div>
      </div>
      <div className={`fp-yn n${options.length}`}>
        {options.map((o) => (
          <button type="button" key={o.value} aria-pressed={value === o.value} onClick={() => onChange(o.value)}>
            {o.label}
          </button>
        ))}
      </div>
    </div>
  )
}

/** Yes / Not sure / No options using a question's own farmer words. */
export function triOptions(prefix: string): Option<'yes' | 'unsure' | 'no'>[] {
  return [
    { value: 'yes', label: t(`${prefix}.yes` as Key) },
    { value: 'unsure', label: t('fp.notSure') },
    { value: 'no', label: t(`${prefix}.no` as Key) },
  ]
}

export function StepHead({ title, sub }: { title: string; sub?: string }) {
  return (
    <div className="fp-head">
      <h2 className="fp-title" id="fp-step-title" tabIndex={-1}>{title}</h2>
      {sub && <p className="fp-sub">{sub}</p>}
    </div>
  )
}

export function StepNav({ onBack, onNext, nextLabel, disabled, nextIcon = 'arrow' }: {
  onBack?: () => void; onNext: () => void; nextLabel?: string; disabled?: boolean; nextIcon?: string
}) {
  return (
    <div className="fp-nav">
      {onBack && <button type="button" className="fp-btn ghost" onClick={onBack}>{t('fp.back')}</button>}
      <button type="button" className="fp-btn primary" onClick={onNext} disabled={disabled}>
        {nextIcon === 'check' && <Icon name="check" size={20} />}
        <span>{nextLabel ?? t('fp.continue')}</span>
        {nextIcon === 'arrow' && <Icon name="arrow" size={20} />}
      </button>
    </div>
  )
}
