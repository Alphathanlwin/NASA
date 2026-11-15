// AI-assisted: Claude Code
// Sow -> harvest band for the recommended crop, from the engine's calendar.
// The bar spans the dry season (1 Nov to 30 Apr) so the farmer sees where the crop sits in it.
import { t } from '../i18n'

const SEASON_START = 305 // 1 Nov (day of year, leap-safe enough for a picture)
const SEASON_DAYS = 181

function pos(doy: number) {
  const d = ((doy - SEASON_START) % 366 + 366) % 366
  return Math.max(0, Math.min(100, (d / SEASON_DAYS) * 100))
}

export function SeasonStrip({ sowDay, harvestDay, sow, harvest, delay }: {
  sowDay: number; harvestDay: number; sow: string; harvest: string; delay: number
}) {
  const a = pos(sowDay)
  const b = Math.max(a + 4, pos(harvestDay))
  return (
    <div className="fp-season">
      <div className="fp-season-title">{t('fp.s.title')}</div>
      <div className="fp-season-track" aria-hidden="true">
        <div className="fp-season-fill" style={{ left: `${a}%`, width: `${b - a}%` }} />
        <span className="fp-season-dot" style={{ left: `${a}%` }} />
        <span className="fp-season-dot" style={{ left: `${b}%` }} />
      </div>
      <div className="fp-season-labels">
        <div><b>{t('fp.s.sow', { d: sow })}</b><span>{t('fp.s.sowSub')}</span></div>
        <div><b>{t('fp.s.harvest', { d: harvest })}</b><span>{t('fp.s.harvestSub')}</span></div>
      </div>
      {delay > 0 && <p className="fp-season-moved">{t('fp.s.moved', { n: delay })}</p>}
    </div>
  )
}
