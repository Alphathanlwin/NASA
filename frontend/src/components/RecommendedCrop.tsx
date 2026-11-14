// AI-assisted: Claude Code
// The top-ranked rotation for the selected field at the current priorities, shown as figures:
// a drawing of the crop, its score ring, and bars comparing all three plans.
// It reads the same engine result as the Compare tab, so the two always agree.
import { t } from '../i18n'
import type { Key } from '../i18n'
import { CropArt } from './CropArt'

const cropName = (id: string) => t(`crop.${id}` as Key)

const CAT_ICON: Record<string, string> = {
  worth_investigating: '✓',
  possible_with_caution: '!',
  weak_fit: '~',
  not_workable: '×',
}
const CAT_COLOR: Record<string, string> = {
  worth_investigating: '#3b7d2f',
  possible_with_caution: '#d99a1b',
  weak_fit: '#d97706',
  not_workable: '#b91c1c',
}

function ScoreRing({ score, color }: { score: number; color: string }) {
  const r = 26
  const c = 2 * Math.PI * r
  return (
    <svg width="70" height="70" viewBox="0 0 64 64" role="img" aria-label={`${Math.round(score)} / 100`}>
      <circle cx="32" cy="32" r={r} fill="none" stroke="#eee8d8" strokeWidth="7" />
      <circle className="ring-fill" cx="32" cy="32" r={r} fill="none" stroke={color} strokeWidth="7" strokeLinecap="round"
        strokeDasharray={`${(c * Math.max(0, Math.min(100, score))) / 100} ${c}`} transform="rotate(-90 32 32)" />
      <text x="32" y="37" textAnchor="middle" fontSize="16" fontWeight="800" fill="#1d2a22">{Math.round(score)}</text>
    </svg>
  )
}

export function RecommendedCrop({ result, onOpen }: { result: any; onOpen: () => void }) {
  const plans: any[] = result?.plans ?? []
  const top = plans.filter((p) => p.rank === 1)
  if (top.length === 0) return null
  const best = top[0]
  const color = CAT_COLOR[best.category]

  return (
    <section className={`rec-card rec-${best.category}`} aria-live="polite">
      <span className="rec-kicker">{t('rec.title')}</span>

      <div className="rec-hero">
        <div className="rec-arts">
          {top.map((p) => <CropArt key={p.id} crop={p.dry_crop} size={top.length > 1 ? 58 : 76} />)}
        </div>
        <div className="rec-name">
          <b>{top.map((p) => cropName(p.dry_crop)).join(` ${t('rec.or')} `)}</b>
          <span className="rec-after">{t('rec.after')}</span>
          <span className={`category cat-${best.category}`}>
            <span aria-hidden="true">{CAT_ICON[best.category]}</span> {t(`cat.${best.category}` as Key)}
          </span>
        </div>
        <ScoreRing score={best.score} color={color} />
      </div>

      <div className="rec-bars" role="img" aria-label={plans.map((p) => `${p.sequence.join(' → ')}: ${Math.round(p.score)}`).join('; ')}>
        {plans.map((p) => (
          <div key={p.id} className={`rec-bar ${p.rank === 1 ? 'is-top' : ''}`}>
            <CropArt crop={p.dry_crop} size={38} />
            <div className="rec-label">
              <span>{cropName(p.dry_crop)}</span>
              {p.is_baseline && <small>{t('rec.current')}</small>}
            </div>
            <div className="rec-track">
              <div className={`rec-fill cat-bg-${p.category}`} style={{ width: `${Math.max(3, p.score)}%` }} />
            </div>
            <b>{Math.round(p.score)}</b>
          </div>
        ))}
      </div>

      <div className="rec-foot">
        <span>{t('rec.basisShort')}</span>
        <button className="btn ghost small" onClick={onOpen}>{t('rec.compare')}</button>
      </div>
    </section>
  )
}
