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
  const top = Math.ceil(Math.max(...products.map((p) => p.amount)) / 40) * 40   // axis to the next 40 lb
  const ticks = Array.from({ length: top / 40 + 1 }, (_, i) => i * 40)
  // column chart: x = product, y = lb per acre; plot area 300 x 160 inside a 360 x 230 view
  const X0 = 44, W = 300, Y0 = 18, H = 160
  const slot = W / products.length
  const y = (v: number) => Y0 + H - (v / top) * H
  return (
    <div className="fert">
      <h4>{t('fert.title', { crop: name })}</h4>
      <svg className="fert-chart" viewBox="0 0 360 206" role="img"
        aria-label={products.map((p) => `${t(`fert.${p.product}` as Key)} ${p.amount} lb`).join(', ')}>
        {ticks.map((v) => (
          <g key={v}>
            <line x1={X0} x2={X0 + W} y1={y(v)} y2={y(v)} className={v === 0 ? 'axis' : 'grid'} />
            <text x={X0 - 8} y={y(v) + 4} textAnchor="end" className="tick">{v}</text>
          </g>
        ))}
        <text x={10} y={Y0 + H / 2} className="tick" transform={`rotate(-90 10 ${Y0 + H / 2})`} textAnchor="middle">lb / acre</text>
        {products.map((p, i) => {
          const cx = X0 + slot * i + slot / 2, bw = slot * 0.56
          return (
            <g key={p.product} className={`fert-col fert-${p.product}`} style={{ animationDelay: `${120 + i * 70}ms` }}>
              <rect x={cx - bw / 2} y={y(p.amount)} width={bw} height={Y0 + H - y(p.amount)} rx="5" />
              <text x={cx} y={y(p.amount) - 20} textAnchor="middle" className="val">{p.amount} lb</text>
              <text x={cx} y={y(p.amount) - 7} textAnchor="middle" className="kg">{Math.round(p.amount * LB_TO_KG)} kg</text>
              <text x={cx} y={Y0 + H + 20} textAnchor="middle" className="name">{t(`fert.${p.product}` as Key)}</text>
            </g>
          )
        })}
      </svg>
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
