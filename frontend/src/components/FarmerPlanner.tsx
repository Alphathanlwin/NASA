// AI-assisted: Claude Code
// Crop Planner, part 1: the six-step farmer flow. Answers are saved per field in this browser;
// once confirmed, the field goes straight to the detailed plan (children).
//   1 priority (+ trade-off)  2 weather  3 prices  4 what you have  5 field shown back  6 confirm
// then the detailed plan. The farmer's answers map onto the engine's existing inputs (weights + scenario);
// the engine itself is untouched. The old analyst view lives in DetailsDrawer, under the answer.
import { useEffect, useMemo, useRef, useState } from 'react'
import { runPlans } from '../data'
import type { Snapshot, SnapshotField } from '../data'
import type { Econ, Priorities } from '../engine/types'
import { t } from '../i18n'
import { crossChecks, EMPTY, factsOf, prioritiesFor, scenarioFor, STEPS } from '../planner/flow'
import type { Answers } from '../planner/flow'
import '../planner/planner.css'
import { AnswerCard } from './AnswerCard'
import { ConfirmScreen } from './ConfirmScreen'
import { DisasterStep, LimitStep, PriceStep } from './ConstraintQuestions'
import { FieldCheck } from './FieldCheck'
import { PriorityInterview } from './PriorityInterview'

type Saved = { step: number; answers: Answers; done?: boolean }
const KEY = 'fieldshift.planner.v1'
const loadAll = (): Record<string, Saved> => { try { return JSON.parse(localStorage.getItem(KEY) ?? '{}') } catch { return {} } }
const store = (id: string, v: Saved) => { try { localStorage.setItem(KEY, JSON.stringify({ ...loadAll(), [id]: v })) } catch { /* blocked storage */ } }

export function FarmerPlanner({ snap, field, econ, onEcon, onPriorities, children }: {
  snap: Snapshot
  field: SnapshotField
  econ: Econ
  onEcon: (e: Econ) => void
  onPriorities: (p: Priorities) => void
  children: (result: ReturnType<typeof runPlans>) => React.ReactNode
}) {
  const saved = loadAll()[field.id]
  const [step, setStep] = useState(saved?.step ?? 1)
  const [a, setA] = useState<Answers>(saved?.answers ?? EMPTY)
  const top = useRef<HTMLDivElement>(null)

  const [done, setDone] = useState(!!saved?.done)
  useEffect(() => { store(field.id, { step, answers: a, done }) }, [field.id, step, a, done])

  const priorities = useMemo(() => prioritiesFor(a), [a])
  // A field answered on an earlier visit ranks with its saved priority.
  useEffect(() => { if (done) onPriorities(priorities) }, [done, priorities, onPriorities])
    // Local engine run: instant, no spinner (Doherty threshold).
  const result = useMemo(() => runPlans(snap, field, priorities, econ, scenarioFor(a)), [snap, field, priorities, econ, a])
  const facts = useMemo(() => factsOf(field), [field])
  const checks = useMemo(() => crossChecks(a, facts, result.income_enabled), [a, facts, result.income_enabled])

  const go = (n: number) => {
    setStep(n)
    top.current?.scrollIntoView({ block: 'start', behavior: 'smooth' })
    // Move focus to the new question so screen readers and keyboards follow the step.
    window.setTimeout(() => top.current?.querySelector<HTMLElement>('.fp-title')?.focus(), 0)
  }
  const confirm = () => setDone(true) // priorities follow via the effect above
  const restart = () => { setA(EMPTY); setDone(false); go(1) }

  if (done) {
    return (
      <>
        <div className="fp">
          <AnswerCard result={result} a={a} field={field} facts={facts} scenario={scenarioFor(a)}
            econ={econ} onEcon={onEcon} onRestart={restart} />
        </div>
        {children(result) /* the farmer's flood, drainage and water answers shape this plan */}
      </>
    )
  }

  return (
    <div className="fp" ref={top}>
      <div className="fp-progress">
        <div className="fp-progress-label">{t('fp.step', { n: step, total: STEPS })}</div>
        <div className="fp-progress-track" aria-hidden="true">
          {Array.from({ length: STEPS }, (_, i) => <span key={i} className={i < step ? 'done' : ''} />)}
        </div>
      </div>

      {step === 1 && <PriorityInterview a={a} onChange={setA} onNext={() => go(2)} />}
      {step === 2 && <DisasterStep a={a} onChange={setA} onBack={() => go(1)} onNext={() => go(3)} />}
      {step === 3 && <PriceStep a={a} onChange={setA} onBack={() => go(2)} onNext={() => go(4)} />}
      {step === 4 && <LimitStep a={a} onChange={setA} onBack={() => go(3)} onNext={() => go(5)} />}
      {step === 5 && <FieldCheck field={field} facts={facts} checks={checks} onBack={() => go(4)} onNext={() => go(6)} />}
      {step === 6 && (
        <ConfirmScreen a={a} field={field} facts={facts} checks={checks} onGoto={go} onBack={() => go(5)} onConfirm={confirm} />
      )}
    </div>
  )
}
