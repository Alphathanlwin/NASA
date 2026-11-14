// AI-assisted: Claude Code
// The top-ranked rotation for the selected field at the current priorities, shown as figures:
// a drawing of the crop and directly labeled bars comparing the plans.
// It reads the same engine result as the Compare tab, so the two always agree.
import { t } from '../i18n'
import type { Key } from '../i18n'
import type { runPlans } from '../data'
import { CropArt } from './CropArt'

const cropName = (id: string) => t(`crop.${id}` as Key)

const CAT_ICON: Record<string, string> = {
  worth_investigating: '✓',
  possible_with_caution: '!',
  weak_fit: '~',
  not_workable: '×',
}
export function RecommendedCrop({ result, onOpen }: { result: ReturnType<typeof runPlans>; onOpen: () => void }) {
  const plans = result.plans
  const top = plans.filter((p) => p.rank === 1)
  if (top.length === 0) return null
  const best = top[0]

  return (
    <section className={`rec-card rec-${best.category}`} aria-live="polite">
      <span className="rec-kicker">{t('rec.title')}</span>

      <div className="rec-hero">
        <div className="rec-arts">
          <CropArt crop={best.dry_crop} size={56} />
        </div>
        <div className="rec-name">
          <b>{top.map((p) => cropName(p.dry_crop)).join(` ${t('rec.or')} `)}</b>
          <span className="rec-after">{t('rec.after')}</span>
          <span className={`category cat-${best.category}`}>
            <span aria-hidden="true">{CAT_ICON[best.category]}</span> {t(`cat.${best.category}` as Key)}
          </span>
        </div>
      </div>

      <div className="rec-bars">
        {plans.map((p) => (
          <div key={p.id} className={`rec-bar ${p.rank === 1 ? 'is-top' : ''}`}>
            <div className="rec-label">
              <span>{cropName(p.dry_crop)}</span>
              {p.is_baseline && <small>{t('rec.current')}</small>}
            </div>
            <div className="rec-track" aria-hidden="true">
              <div className={`rec-fill cat-bg-${p.category}`} style={{ width: `${Math.min(100, Math.max(0, p.score))}%` }} />
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
