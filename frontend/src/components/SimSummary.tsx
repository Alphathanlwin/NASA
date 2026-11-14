// AI-assisted: Claude Code
// End-of-season card: the chosen plan against the usual rotation, same field and normals.
import { t } from '../i18n'
import type { summarise } from '../sim/model'
import type { Plan } from './PlanCards'
import { cropName } from './PlanCards'

type Summary = ReturnType<typeof summarise>

export function SimSummary({ summary, baseline, plan, total, onRestart, onMap }: {
  summary: Summary
  baseline: Summary | null
  plan: Plan | null
  total: number
  onRestart: () => void
  onMap: () => void
}) {
  const fmtN = (v: number) => `${v > 0 ? '+' : ''}${v.toFixed(1)}`
  const rows: [string, string, string][] = [
    [t('sim.summaryN'), fmtN(summary.nChange), baseline ? fmtN(baseline.nChange) : '—'],
    [t('sim.summaryWater'), `${Math.round(summary.irrigationMm)} mm`, baseline ? `${Math.round(baseline.irrigationMm)} mm` : '—'],
    [t('sim.summaryStress'), String(summary.stressDays), baseline ? String(baseline.stressDays) : '—'],
    [t('sim.summaryDays'), String(summary.days), baseline ? String(baseline.days) : '—'],
  ]
  return (
    <div className="sim-summary" role="dialog" aria-label={t('sim.summaryTitle')}>
      <h3>{t('sim.summaryTitle')} · {cropName('rice')} → {cropName(summary.crop)}</h3>
      <p className="note">{t('sim.summaryVs')}</p>
      <table>
        <thead>
          <tr><th></th><th>{t('sim.summaryPlan')}</th><th>{t('sim.summaryBase')}</th></tr>
        </thead>
        <tbody>
          {rows.map(([k, a, b]) => <tr key={k}><td>{k}</td><td><b>{a}</b></td><td>{b}</td></tr>)}
        </tbody>
      </table>
      {plan && <p>{t('sim.summaryRank', { n: plan.rank, total })}</p>}
      <p className="disclaimer">{t('field3d.disclaimer')}</p>
      <div className="row-actions">
        <button className="primary" onClick={onRestart}>{t('sim.tryAnother')}</button>
        <button onClick={onMap}>{t('sim.backToMap')}</button>
      </div>
    </div>
  )
}
