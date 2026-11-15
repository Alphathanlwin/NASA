// AI-assisted: Claude Code
// The answer: one recommended crop, a reason sentence built from the farmer's own answers,
// a Listen button, the sow -> harvest strip, the validation trail (you / your field / satellite),
// disclosure layers and the "did you plant it?" follow-up. Ends on the action, not a score.
import { useEffect, useState } from 'react'
import type { runPlans, SnapshotField } from '../data'
import { getLang, t } from '../i18n'
import type { Key } from '../i18n'
import { cautionKeys, FARMER_RULES, loadFollowUp, notScored, reasonKeys, saveFollowUp, topPlan, topReasons } from '../planner/flow'
import type { Answers, FieldFacts, Planted } from '../planner/flow'
import { join, pressureLine, priorityLine } from './ConfirmScreen'
import { CropArt } from './CropArt'
import { Icon } from './PlannerUI'
import { SeasonStrip } from './SeasonStrip'

type Result = ReturnType<typeof runPlans>
type Finding = { rule: string; reason: string; score_delta: number }

const cropName = (id: string) => t(`crop.${id}` as Key)

function ruleText(f: Finding, ph: unknown) {
  return FARMER_RULES.has(f.rule) ? t(`fp.rule.${f.rule}` as Key, { ph: ph == null ? '—' : String(ph) }) : f.reason
}

function cap(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}

function Layer({ id, icon, title, open, onToggle, children }: {
  id: string; icon: string; title: string; open: boolean; onToggle: (id: string) => void; children: React.ReactNode
}) {
  return (
    <div className={`fp-layer ${open ? 'open' : ''}`}>
      <button type="button" className="fp-layer-btn" aria-expanded={open} aria-controls={`fp-layer-${id}`} onClick={() => onToggle(id)}>
        <Icon name={icon} size={20} />
        <span>{title}</span>
        <span className="fp-chev"><Icon name="chev" size={20} /></span>
      </button>
      {open && <div className="fp-layer-body" id={`fp-layer-${id}`}>{children}</div>}
    </div>
  )
}

function Listen({ text }: { text: string }) {
  const can = typeof window !== 'undefined' && 'speechSynthesis' in window
  const [playing, setPlaying] = useState(false)
  useEffect(() => () => { if (can) window.speechSynthesis.cancel() }, [can])
  if (!can) return null
  const toggle = () => {
    if (playing) { window.speechSynthesis.cancel(); setPlaying(false); return }
    const u = new SpeechSynthesisUtterance(text)
    u.lang = getLang() === 'my' ? 'my-MM' : 'en-GB'
    u.rate = 0.95
    u.onend = () => setPlaying(false)
    u.onerror = () => setPlaying(false)
    setPlaying(true)
    window.speechSynthesis.speak(u)
  }
  return (
    <div className="fp-listen">
      <button type="button" className={`fp-speak ${playing ? 'playing' : ''}`} onClick={toggle} aria-pressed={playing}>
        <Icon name="speaker" size={22} />
        <span>{playing ? t('fp.stop') : t('fp.listen')}</span>
        <span className="fp-wave" aria-hidden="true"><i /><i /><i /><i /><i /></span>
      </button>
    </div>
  )
}

function FollowUp({ fieldId, date }: { fieldId: string; date: string }) {
  const [saved, setSaved] = useState(() => loadFollowUp(fieldId))
  const pick = (p: Planted) => { saveFollowUp(fieldId, p); setSaved({ answer: p, at: new Date().toISOString() }) }
  return (
    <div className="fp-follow">
      <div className="fp-follow-title">{t('fp.f2.title', { d: date })}</div>
      <p className="fp-follow-q">{t('fp.f2.q')}</p>
      <div className="fp-yn n3" role="group" aria-label={t('fp.f2.q')}>
        {(['planted', 'not_yet', 'other'] as Planted[]).map((p) => (
          <button type="button" key={p} aria-pressed={saved?.answer === p} onClick={() => pick(p)}>{t(`fp.f2.${p}` as Key)}</button>
        ))}
      </div>
      {saved && <p className="fp-hint left">{t('fp.f2.saved')}</p>}
    </div>
  )
}

export function AnswerCard({ result, a, field, facts, onRestart }: {
  result: Result; a: Answers; field: SnapshotField; facts: FieldFacts; onRestart: () => void
}) {
  const [layer, setLayer] = useState<string | null>(null)
  const toggle = (id: string) => setLayer((cur) => (cur === id ? null : id))
  const best = topPlan(result.plans)
  if (!best) return null
  const ties = result.plans.filter((p) => p.id !== best.id && p.rank === best.rank && p.category !== 'not_workable')
  const delay = result.scenario.planting_delay_days
  const name = cropName(best.dry_crop)
  const my = getLang() === 'my'

  const reasons = reasonKeys(a, best.dry_crop, delay).map((k) => t(`fp.why.${k}` as Key, { n: delay }))
  const sentence = my ? `${join(reasons)}။` : `${cap(reasons.join('; '))}.`
  const cautions = cautionKeys(a, best.dry_crop)
  const speech = `${t('fp.speak', { crop: name, sow: best.calendar.sow, harvest: best.calendar.harvest })} ${sentence}`

  const ph = field.values.soil_ph?.value ?? null
  const clay = field.values.clay_pct?.value
  const local = notScored(a)
  const why = topReasons(best.reasons_for as Finding[])

  return (
    <section className="fp-screen fp-answer" aria-live="polite">
      <div className="fp-answer-main">
      <span className="fp-tag"><Icon name="check" size={15} />{t('fp.a.tag')}</span>

      <div className="fp-crop">
        <CropArt crop={best.dry_crop} size={96} />
        <div>
          <div className="fp-crop-from">{t('fp.a.after')}</div>
          <div className="fp-crop-name">{name}</div>
          <span className={`category cat-${best.category}`}>{t(`cat.${best.category}` as Key)}</span>
        </div>
      </div>

      <p className="fp-lead">{t('fp.a.lead', { crop: name })}</p>
      <p className="fp-reason"><b>{t('fp.a.because')}:</b> {sentence}</p>
      {ties.length > 0 && <p className="fp-hint left">{t('fp.a.tie', { other: ties.map((p) => cropName(p.dry_crop)).join(', ') })}</p>}
      {cautions.map((c) => <p key={c} className="fp-caution">{t(`fp.caution.${c}` as Key)}</p>)}

      <Listen text={speech} />

      <SeasonStrip sowDay={best.calendar.sow_day} harvestDay={best.calendar.harvest_day}
        sow={best.calendar.sow} harvest={best.calendar.harvest} delay={delay} />
      </div>

      <div className="fp-answer-side">
      <div className="fp-trail">
        <div className="fp-trail-title">{t('fp.t.title')}</div>
        <div className="fp-trail-row">
          <span className="fp-src fp-src-you">{t('fp.t.you')}</span>
          <span>{priorityLine(a)}. {pressureLine(a)}.</span>
        </div>
        <div className="fp-trail-row">
          <span className="fp-src fp-src-map">{t('fp.t.field')}</span>
          {ph === null ? <span className="fp-missing">{t('fp.t.missing')}</span> : (
            <span>{t('fp.t.fieldLine', { ph: String(ph), clay: clay == null ? '—' : Math.round(Number(clay)), irr: t(`fp.irr.${result.scenario.irrigation}` as Key) })}
              <small>{t('fp.t.fieldSrc')}</small></span>
          )}
        </div>
        <div className="fp-trail-row">
          <span className="fp-src fp-src-nasa">{t('fp.t.sat')}</span>
          {facts.gwetroot === null ? <span className="fp-missing">{t('fp.t.missing')}</span> : (
            <span>{t('fp.t.satLine', { wet: t(`fp.wet.${facts.wet}` as Key), g: facts.gwetroot.toFixed(2), rain: facts.rain30 === null ? '—' : Math.round(facts.rain30) })}
              <small>{t('fp.t.satSrc', { d: field.values.gwetroot?.period ?? '' })}</small></span>
          )}
        </div>
      </div>

      <div className="fp-layers">
        <Layer id="why" icon="question" title={t('fp.l.why')} open={layer === 'why'} onToggle={toggle}>
          <ul className="fp-why">
            {why.map((f) => <li key={f.rule}><Icon name="check" size={18} />{ruleText(f, ph)}</li>)}
          </ul>
        </Layer>
        <Layer id="others" icon="list" title={t('fp.l.others')} open={layer === 'others'} onToggle={toggle}>
          <ul className="fp-alts">
            {result.plans.filter((p) => p.id !== best.id).map((p) => {
              const main = topReasons([...p.reasons_against, ...p.reasons_for] as Finding[], 1)[0]
              return (
                <li key={p.id}>
                  <CropArt crop={p.dry_crop} size={44} />
                  <div>
                    <b>{cropName(p.dry_crop)}</b>{p.is_baseline && <small> · {t('fp.o.usual')}</small>}
                    {main && <span>{ruleText(main, ph)}</span>}
                  </div>
                  <span className={`category cat-${p.category}`}>{t(`cat.${p.category}` as Key)}</span>
                </li>
              )
            })}
          </ul>
        </Layer>
        <Layer id="local" icon="pin" title={t('fp.l.local')} open={layer === 'local'} onToggle={toggle}>
          {local.length > 0 && (
            <>
              <p className="fp-hint left">{t('fp.l.localLead')}</p>
              <ul className="fp-why">{local.map((k) => <li key={k}><Icon name="question" size={18} />{t(`fp.ns.${k}` as Key)}</li>)}</ul>
            </>
          )}
          <ul className="check-list">{best.local_checks.slice(0, 3).map((c, i) => <li key={i}>{c}</li>)}</ul>
        </Layer>
      </div>

      <FollowUp fieldId={field.id} date={best.calendar.sow} />

      <div className="fp-restart"><button type="button" className="fp-link" onClick={onRestart}>{t('fp.restart')}</button></div>
      </div>
    </section>
  )
}
