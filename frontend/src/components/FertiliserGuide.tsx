// AI-assisted: Claude Code
// Published fertiliser rate for the dry-season crop of a plan. Shown as figures with the source;
// nothing is calculated for the field. Rates we could not check in the original say so instead.
import { TABLE } from '../engine/crops'
import { t } from '../i18n'
import type { Key } from '../i18n'

type Product = { product: string; amount: number; unit: string }
const LB_TO_KG = 0.4536

export function FertiliserGuide({ planId }: { planId: string }) {
  const plan = (TABLE as any).plans.find((p: any) => p.id === planId)
  const crop = plan ? (TABLE as any).crops[plan.dry] : null
  const f = crop?.fertiliser
  if (!f) return null
  const name = t(`crop.${plan.dry}` as Key)

  if (!f.verified || !f.value) {
    return (
      <div className="fert">
        <h4>{t('fert.title', { crop: name })}</h4>
        <p className="note">{t('fert.unchecked')}</p>
      </div>
    )
  }

  const products: Product[] = f.value.products
  const max = Math.max(...products.map((p) => p.amount))
  // One measure (published rate per acre) across products: horizontal bars, one hue, direct values.
  return (
    <div className="fert">
      <div className="fert-head">
        <h4>{t('fert.title', { crop: name })}</h4>
        <span className="fert-unit">{t('fert.unit')}</span>
      </div>
      <ul className="fert-rows" aria-label={t('fert.title', { crop: name })}>
        {products.map((p, i) => {
          const label = t(`fert.${p.product}` as Key)
          const kg = Math.round(p.amount * LB_TO_KG)
          return (
            <li key={p.product} className="fert-row" title={`${label}: ${p.amount} lb (${kg} kg) ${t('fert.unit').toLowerCase()}`}>
              <span className="fert-name">
                <b>{label}</b>
                <small>{t(`fert.gives.${p.product}` as Key)}</small>
              </span>
              <span className="fert-track" aria-hidden="true">
                <span className="fert-fill" style={{ width: `${(p.amount / max) * 100}%`, animationDelay: `${120 + i * 70}ms` }} />
              </span>
              <span className="fert-val"><b>{p.amount} lb</b><small>{kg} kg</small></span>
            </li>
          )
        })}
      </ul>
      {plan.dry !== 'rice' && crop.legume?.value && <p className="fert-legume">{t('fert.legume')}</p>}
      <p className="note small">
        {t('fert.source')}{' '}
        <a href={f.url} target="_blank" rel="noreferrer">
          {t('fert.sourceLink')}
        </a>
        . {t('fert.caution')}
      </p>
    </div>
  )
}
