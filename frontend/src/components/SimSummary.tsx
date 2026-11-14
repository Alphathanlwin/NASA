// AI-assisted: Claude Code
// End-of-season card: the chosen plan against the usual rotation, same field and normals.
// Farmer-first: a one-line verdict, then each measure with what "good" means and a coloured result.
import { t } from '../i18n'
import type { Key } from '../i18n'
import type { summarise } from '../sim/model'
import { summaryRows, verdictCount } from '../sim/summaryRows'
import type { SummaryRow } from '../sim/summaryRows'
import type { Plan } from './PlanCards'
import { cropName } from './PlanCards'
import { Icon } from './Sidebar'

type Summary = ReturnType<typeof summarise>

const ICONS: Record<SummaryRow['id'], string> = {
  nitrogen: 'M12 21V11M12 11c0-4 3-6 7-6 0 4-3 6-7 6zM12 14c0-3-2.5-5-6-5 0 3 2.5 5 6 5zM5 21h14',
  water: 'M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z',
  stress: 'M12 3v10M12 17h.01M10.3 3.9 2.6 17a2 2 0 0 0 1.7 3h15.4a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z',
  days: 'M7 3v3M17 3v3M4 8h16M5 5h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z',
}

function fmt(id: SummaryRow['id'], v: number) {
  if (id === 'nitrogen') return `${v > 0 ? '+' : ''}${v.toFixed(1)}`
  if (id === 'water') return `${Math.round(v)} mm`
  return String(Math.round(v))
}

export function SimSummary({ summary, baseline, plan, total, onRestart, onMap }: {
  summary: Summary
  baseline: Summary | null
  plan: Plan | null
  total: number
  onRestart: () => void
  onMap: () => void
}) {
  const rows = summaryRows(summary, baseline)
  const count = verdictCount(rows)
  const crop = cropName(summary.crop)
  return (
    <div className="sim-summary" role="dialog" aria-label={t('sim.summaryTitle')}>
      <p className="sum-kicker">{t('sim.summaryTitle')}</p>
      <h3 className="sum-headline">
        {baseline ? t('sum.headline', { crop, n: count.better, total: count.total }) : `${cropName('rice')} → ${crop}`}
      </h3>
      {baseline && <p className="note">{t('sum.vs', { crop })}</p>}

      <div className="sum-cols" aria-hidden="true">
        <span />
        <b>{cropName('rice')} → {crop}</b>
        <span>{t('sum.usual')}</span>
      </div>
      <ul className="sum-rows">
        {rows.map((r) => (
          <li key={r.id} className={`sum-row ${r.verdict ?? ''}`}>
            <span className="sum-icon"><Icon d={ICONS[r.id]} size={20} /></span>
            <span className="sum-label">
              <b>{t(`sum.${r.id}` as Key)}</b>
              <small>{t(`sum.${r.id}Hint` as Key)}</small>
            </span>
            <b className="sum-plan" data-cap={`${cropName('rice')} → ${crop}`}>{fmt(r.id, r.plan)}</b>
            <span className="sum-usual" data-cap={t('sum.usual')}>{r.usual === null ? '—' : fmt(r.id, r.usual)}</span>
            {r.verdict && (
              <span className={`sum-verdict ${r.verdict}`}>
                {r.verdict === 'same' ? t('sum.same') : t(`sum.${r.id}.${r.verdict}` as Key, { d: r.diff })}
              </span>
            )}
          </li>
        ))}
      </ul>

      {plan && <p className="sum-rank">{t('sim.summaryRank', { n: plan.rank, total })}</p>}
      <p className="sum-disclaimer">{t('field3d.disclaimer')}</p>
      <div className="row-actions">
        <button className="primary" onClick={onRestart}>{t('sim.tryAnother')}</button>
        <button onClick={onMap}>{t('sim.backToMap')}</button>
      </div>
    </div>
  )
}
