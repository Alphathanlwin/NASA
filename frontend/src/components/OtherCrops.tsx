// AI-assisted: Claude Code
// Other crops and fruits for the selected field's location, ranked by FAO EcoCrop climate and soil
// suitability. Temperature: NASA POWER 30-year daily averages; rain: NASA GPM IMERG monthly averages
// 2001-2025 (POWER rain is far too low in the west Delta); pH: SoilGrids or the farmer's soil test.
// A suitability score, not a probability, not a yield, not a market judgement.
import { useMemo } from 'react'
import shortlist from '../../../data/reference/ecocrop_shortlist.json'  // single copy, written by pipeline/extract_ecocrop_shortlist.py
import { monthlyClimate, rankCrops } from '../engine/suitability'
import type { EcoCrop } from '../engine/suitability'
import { t, townName } from '../i18n'
import type { Key } from '../i18n'

type Props = { snap: any; field: any }

export function OtherCrops({ snap, field }: Props) {
  const town = field.town_id
  const imerg = snap.rain_climatology_imerg?.towns?.[town]
  const daily = snap.climatology?.[town]
  const ph = field.values?.soil_ph?.value ?? null
  const canIrrigate = field.irrigation === 'available' || field.irrigation === 'sometimes'

  const ranked = useMemo(() => {
    if (!daily || !imerg) return null
    const clim = monthlyClimate(daily)
    clim.rain = imerg.rain_mm_month.map((v: number | null, i: number) => v ?? clim.rain[i])
    return rankCrops((shortlist as any).crops as Record<string, EcoCrop>, clim, ph, canIrrigate)
  }, [daily, imerg, ph, canIrrigate])

  if (!ranked) {
    return (
      <section className="card">
        <h3>{t('other.title')}</h3>
        <p className="note">{t('other.noData')}</p>
      </section>
    )
  }

  const month = (i: number) => t(`month.${i + 1}` as Key)
  return (
    <section className="card other-crops">
      <div className="card-head">
        <h3>{t('other.title')}</h3>
        <span className="note small">{t('other.place', { town: townName(town, field.town_name ?? town) })}</span>
      </div>
      <p className="note">{t('other.lead')}</p>
      <ol className="other-list">
        {ranked.map((r) => (
          <li key={r.key} className={r.score >= 80 ? 'good' : r.score >= 40 ? 'fair' : 'poor'}>
            <span className="other-name">
              <b>{t(`other.crop.${r.key}` as Key)}</b>
              {r.crop.fruit && <em>{t('other.fruit')}</em>}
            </span>
            <span className="other-track" aria-hidden="true"><span className="other-fill" style={{ width: `${Math.max(2, r.score)}%` }} /></span>
            <b className="other-score">{r.score}%</b>
            <small className="other-why">
              {r.best_start !== null ? t('other.sow', { m: month(r.best_start) }) : t('other.perennial')}
              {r.limiting && <> · {t(`other.limit.${r.limiting}` as Key)}</>}
              {r.irrigated_score !== null && r.irrigated_score > r.score && <> · {t('other.irrigated', { n: r.irrigated_score })}</>}
            </small>
          </li>
        ))}
      </ol>
      <p className="note small">{t('other.method')}</p>
      <p className="note small">{t('other.global')}</p>
      <p className="note small">{t('other.caution')}</p>
    </section>
  )
}
