// AI-assisted: Claude Code
// "How to test soil pH": a round (?) button that opens an 8-step picture guide for a soil test kit.
// Sampling steps: Mississippi State University Extension, "Soil Testing for the Farmer" (P3858).
// Kit steps defer to the kit's own leaflet for amounts and waiting time.
import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { t } from '../i18n'
import type { Key } from '../i18n'
import { PH_STEPS, stepAfter, stepBefore } from './phGuideSteps'

const SOIL = '#8a6a44', SOIL_D = '#6b5034', GRASS = '#5f9a3a', WATER = '#6fb3d6', GOLD = '#d4930f', NO = '#b5442e', INK = '#17261f'

function Field({ children }: { children?: ReactNode }) {
  return (
    <>
      <rect x="20" y="22" width="200" height="126" rx="10" fill="#cfe2b8" stroke={GRASS} strokeWidth="2" />
      {[48, 76, 104, 132].map((yy) => <path key={yy} d={`M30 ${yy} H210`} stroke="#b5d197" strokeWidth="2" />)}
      {children}
    </>
  )
}

const X = ({ x, y }: { x: number; y: number }) => (
  <g stroke={NO} strokeWidth="4" strokeLinecap="round"><path d={`M${x - 8} ${y - 8} L${x + 8} ${y + 8} M${x + 8} ${y - 8} L${x - 8} ${y + 8}`} /></g>
)

const FIGURES: Record<string, ReactNode> = {
  zigzag: (
    <Field>
      <path d="M36 40 L84 128 L120 40 L156 128 L204 40" fill="none" stroke={INK} strokeWidth="2" strokeDasharray="5 5" />
      {[[36, 40], [52, 69], [68, 99], [84, 128], [96, 99], [108, 69], [120, 40], [132, 69], [144, 99], [156, 128], [172, 99], [188, 69], [204, 40], [60, 84], [180, 84]].map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="5.5" fill={SOIL} stroke="#fff" strokeWidth="1.5" />
      ))}
      <text x="120" y="164" textAnchor="middle" fontSize="13" fontWeight="700" fill={INK}>15+</text>
    </Field>
  ),
  skip: (
    <Field>
      <g transform="translate(62 70)"><rect x="-3" y="10" width="6" height="22" fill={SOIL_D} /><circle r="18" fill="#3f7d2f" /></g>
      <X x={62} y={112} />
      <path d="M120 22 V148" stroke="#c9b78f" strokeWidth="14" />
      <X x={120} y={86} />
      <ellipse cx="178" cy="112" rx="22" ry="12" fill="#f4f1e6" stroke="#cfc6ad" />
      {[[170, 108], [180, 114], [186, 106], [174, 116]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="2.4" fill="#fff" stroke="#bbb" />)}
      <X x={178} y={112} />
    </Field>
  ),
  dig: (
    <>
      <rect x="30" y="58" width="180" height="96" fill={SOIL} />
      <rect x="30" y="50" width="180" height="10" fill={GRASS} />
      <path d="M60 50 l-6 -10 M70 50 l2 -12 M80 50 l6 -9" stroke={GRASS} strokeWidth="3" strokeLinecap="round" />
      <rect x="110" y="50" width="34" height="62" fill={SOIL_D} />
      <g transform="translate(150 6) rotate(18)"><rect x="-3" y="0" width="6" height="56" rx="3" fill="#a77b4f" /><path d="M-14 56 h28 l-4 30 h-20 z" fill="#9aa3a8" stroke="#6f777b" /></g>
      <path d="M100 50 V112" stroke={GOLD} strokeWidth="3" />
      <path d="M95 50 h10 M95 112 h10" stroke={GOLD} strokeWidth="3" />
      <text x="92" y="86" textAnchor="end" fontSize="13" fontWeight="700" fill="#fff">15 cm</text>
    </>
  ),
  mix: (
    <>
      <circle cx="196" cy="34" r="14" fill={GOLD} />
      {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => <path key={a} d="M196 12 v-6" stroke={GOLD} strokeWidth="3" transform={`rotate(${a} 196 34)`} strokeLinecap="round" />)}
      <path d="M62 66 h116 l-12 86 h-92 z" fill="#4f88a8" />
      <ellipse cx="120" cy="66" rx="58" ry="12" fill={SOIL} stroke="#3d6e88" strokeWidth="3" />
      {[[100, 62], [124, 68], [140, 61], [112, 70]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="5" fill={SOIL_D} />)}
      <path d="M118 30 q8 18 2 34" stroke="#a77b4f" strokeWidth="6" strokeLinecap="round" fill="none" />
      <path d="M96 44 a26 10 0 1 0 46 0" fill="none" stroke={INK} strokeWidth="2" strokeDasharray="4 4" />
    </>
  ),
  water: (
    <>
      <g transform="translate(150 22) rotate(30)"><rect x="-16" y="0" width="32" height="56" rx="6" fill={WATER} opacity="0.85" /><rect x="-8" y="-12" width="16" height="14" fill="#4f88a8" /></g>
      <path d="M132 76 q-8 14 -18 22" stroke={WATER} strokeWidth="4" fill="none" strokeLinecap="round" />
      <rect x="94" y="70" width="36" height="84" rx="8" fill="#eef4f6" stroke={INK} strokeWidth="2" />
      <rect x="96" y="124" width="32" height="28" rx="6" fill={SOIL} />
      <rect x="96" y="104" width="32" height="20" fill={WATER} opacity="0.6" />
    </>
  ),
  shake: (
    <>
      <g transform="rotate(-18 92 96)"><rect x="74" y="46" width="36" height="96" rx="8" fill="#eef4f6" stroke={INK} strokeWidth="2" /><rect x="76" y="94" width="32" height="46" rx="6" fill="#9b7a52" opacity="0.85" /><rect x="72" y="38" width="40" height="12" rx="4" fill="#4f88a8" /></g>
      <path d="M40 70 q-10 26 0 52 M28 78 q-8 18 0 36 M146 70 q10 26 0 52 M158 78 q8 18 0 36" stroke={GOLD} strokeWidth="3" fill="none" strokeLinecap="round" />
      <g transform="translate(196 104)"><circle r="24" fill="#fff" stroke={INK} strokeWidth="2.5" /><path d="M0 0 V-15 M0 0 L10 6" stroke={INK} strokeWidth="3" strokeLinecap="round" /></g>
    </>
  ),
  colour: (
    <>
      {['#d9534f', '#e98a3c', '#e8c547', '#8fbf5a', '#3f9a6b', '#2e6f9e'].map((c, i) => (
        <g key={c}><rect x={22 + i * 34} y="100" width="30" height="30" rx="4" fill={c} /><text x={37 + i * 34} y="146" textAnchor="middle" fontSize="12" fill={INK}>{4 + i}</text></g>
      ))}
      <rect x="120" y="26" width="16" height="56" rx="3" fill="#fff" stroke={INK} strokeWidth="1.5" />
      <rect x="120" y="58" width="16" height="24" rx="3" fill="#8fbf5a" />
      <path d="M128 86 V96" stroke={INK} strokeWidth="2" />
      <rect x="122" y="96" width="34" height="38" rx="6" fill="none" stroke={GOLD} strokeWidth="4" />
    </>
  ),
  type: (
    <>
      <rect x="62" y="16" width="116" height="144" rx="16" fill={INK} />
      <rect x="70" y="30" width="100" height="116" rx="6" fill="#fbfaf5" />
      <text x="80" y="58" fontSize="12" fontWeight="700" fill={INK}>pH</text>
      <rect x="80" y="66" width="80" height="34" rx="6" fill="#fff" stroke={GOLD} strokeWidth="3" />
      <text x="120" y="90" textAnchor="middle" fontSize="18" fontWeight="700" fill={INK}>7</text>
      <rect x="80" y="110" width="80" height="24" rx="6" fill="#3b7d2f" />
      <path d="M110 122 l6 6 l12 -12" stroke="#fff" strokeWidth="3" fill="none" strokeLinecap="round" />
    </>
  ),
}

export function PhGuideButton({ inputId }: { inputId: string }) {
  const [open, setOpen] = useState(false)
  const btn = useRef<HTMLButtonElement>(null)
  return (
    <>
      <button ref={btn} type="button" className="help-dot" aria-label={t('phguide.open')} title={t('phguide.open')}
        onClick={() => setOpen(true)}>?</button>
      {/* portal: page cards use transforms, which would trap a fixed overlay underneath other cards */}
      {open && createPortal(<PhGuide onClose={(done) => {
        setOpen(false)
        if (done) document.getElementById(inputId)?.focus()
        else btn.current?.focus()
      }} />, document.body)}
    </>
  )
}

function PhGuide({ onClose }: { onClose: (done: boolean) => void }) {
  const [i, setI] = useState(0)
  const [dir, setDir] = useState<1 | -1>(1)
  const head = useRef<HTMLHeadingElement>(null)
  const step = PH_STEPS[i]
  const go = (n: number | 'done') => {
    if (n === 'done') return onClose(true)
    setDir(n > i ? 1 : -1)
    setI(n)
  }
  useEffect(() => { head.current?.focus() }, [])
  useEffect(() => {
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose(false)
      if (e.key === 'ArrowRight') go(stepAfter(i))
      if (e.key === 'ArrowLeft') go(stepBefore(i))
    }
    window.addEventListener('keydown', key)
    return () => window.removeEventListener('keydown', key)
  })

  return (
    <div className="guide-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose(false) }}>
      <div className="guide" role="dialog" aria-modal="true" aria-labelledby="ph-guide-title">
        <div className="guide-head">
          <h3 id="ph-guide-title" ref={head} tabIndex={-1}>{t('phguide.title')}</h3>
          <button type="button" className="guide-close" aria-label={t('phguide.close')} onClick={() => onClose(false)}>×</button>
        </div>
        <p className="guide-count">{t('phguide.step', { n: i + 1, total: PH_STEPS.length })}</p>
        <div className="guide-stage" key={step.id} data-dir={dir}>
          <svg viewBox="0 0 240 170" className="guide-figure" aria-hidden="true">{FIGURES[step.id]}</svg>
          <p className="guide-text">{t(step.text as Key)}</p>
        </div>
        <div className="guide-dots" role="tablist">
          {PH_STEPS.map((s, n) => (
            <button key={s.id} type="button" role="tab" aria-selected={n === i} aria-label={t('phguide.step', { n: n + 1, total: PH_STEPS.length })}
              className={n === i ? 'on' : ''} onClick={() => go(n)} />
          ))}
        </div>
        <div className="guide-actions">
          <button type="button" className="btn" disabled={i === 0} onClick={() => go(stepBefore(i))}>{t('phguide.back')}</button>
          <button type="button" className="btn primary" onClick={() => go(stepAfter(i))}>
            {i === PH_STEPS.length - 1 ? t('phguide.done') : t('phguide.next')}
          </button>
        </div>
        {i === PH_STEPS.length - 1 && <p className="note small">{t('phguide.again')}</p>}
        <p className="note small">{t('phguide.source')}</p>
      </div>
    </div>
  )
}
