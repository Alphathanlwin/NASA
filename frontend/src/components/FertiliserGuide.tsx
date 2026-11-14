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
  return (
    <div className="fert">
      <h4>{t('fert.title', { crop: name })}</h4>
      <ul className="fert-bars">
        {products.map((p) => (
          <li key={p.product}>
            <span>{t(`fert.${p.product}` as Key)}</span>
            <span className="fert-track"><span className="fert-fill" style={{ width: `${(p.amount / max) * 100}%` }} /></span>
            <b>{p.amount} lb</b>
            <small>{Math.round(p.amount * LB_TO_KG)} kg</small>
          </li>
        ))}
      </ul>
      <p className="note small">{t('fert.perAcre')}</p>
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
