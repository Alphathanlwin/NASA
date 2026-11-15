// AI-assisted: Claude Code
import { useEffect, useRef, useState } from 'react'
import type { AgentRun } from '../data'
import { t } from '../i18n'
import { StatusPill } from './Provenance'

export function AgentLog({ run, onReplay }: { run: AgentRun; onReplay: () => void }) {
  const [visible, setVisible] = useState(run.events.length)
  const [playing, setPlaying] = useState(false)
  const timers = useRef<number[]>([])

  useEffect(() => {
    setVisible(run.events.length)
    setPlaying(false)
    timers.current.forEach(clearTimeout)
    timers.current = []
  }, [run])

  useEffect(() => () => timers.current.forEach(clearTimeout), [])

  const play = () => {
    timers.current.forEach(clearTimeout)
    timers.current = []
    setVisible(0)
    setPlaying(true)
    onReplay()
    run.events.forEach((ev, i) => {
      timers.current.push(window.setTimeout(() => {
        setVisible(i + 1)
        if (i === run.events.length - 1) setPlaying(false)
      }, ev.t_ms + 120))
    })
  }

  return (
    <div className="stack">
      <section className="card">
        <div className="split-head">
          <div>
            <h3 title={t('agent.metaphor')}>{t('agent.title')}</h3>
          </div>
          <button className="btn primary small" onClick={play}>
            {playing ? '…' : visible < run.events.length ? t('agent.play') : t('agent.replay')}
          </button>
        </div>

        <ol className="agent-list">
          {run.events.map((ev, i) => (
            <li key={ev.key} className={`${i < visible ? 'shown' : 'hidden-step'} ${ev.ok ? '' : 'skipped'}`}>
              <div className="step-dot" aria-hidden="true">{i + 1}</div>
              <div className="step-body">
                <div className="step-head">
                  <b>{ev.label}</b>
                  <time>{ev.sim_time}</time>
                </div>
                <p>{ev.text}</p>
                <div className="step-meta">
                  {ev.source && <span>{ev.source}</span>}
                  {ev.status && <StatusPill status={ev.status} />}
                </div>
              </div>
            </li>
          ))}
        </ol>
        <p className="note small">{t('agent.simNote')}</p>
      </section>
    </div>
  )
}
