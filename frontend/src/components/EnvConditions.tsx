// AI-assisted: Claude Code
// "Environmental conditions" on My Fields: three groups of tiles, each value with its source record.
// Badges only compare with a published scale (USDA pH classes) or the field's own long-term normal.
import type { ReactNode } from 'react'
import type { FieldValue, Snapshot, SnapshotField } from '../data'
import { getLang, t } from '../i18n'
import type { Key } from '../i18n'
import { pctOfNormal, phClass, tempNormalFor } from './envHelpers'
import { ProvenanceBlock, fmtValue } from './Provenance'
import { Icon } from './Sidebar'

const I = {
  leaf: 'M5 21c0-9 6-15 15-16-1 9-7 15-15 16zM5 21l8-8',
  cal: 'M7 3v3M17 3v3M4 8h16M5 5h14a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1z',
  rain: 'M7 15a4 4 0 0 1-.6-8A6 6 0 0 1 18 6a4.5 4.5 0 0 1-.5 9M8 19l-1 2M12 19l-1 2M16 19l-1 2',
  sat: 'M4 20l4-4M13 5l6 6-4 4-6-6zM9 9l-3 3 6 6 3-3M18 3l3 3',
  sun: 'M12 16a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4',
  sprout: 'M12 21V11M12 11c0-4 3-6 7-6 0 4-3 6-7 6zM12 14c0-3-2.5-5-6-5 0 3 2.5 5 6 5zM5 21h14',
  drop: 'M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11z',
  flask: 'M9 3h6M10 3v6L5 19a1 1 0 0 0 .9 1.5h12.2A1 1 0 0 0 19 19l-5-10V3M7.5 14h9',
  chart: 'M4 20V10M10 20V4M16 20v-7M22 20H2',
  thermo: 'M14 14.8V4a2 2 0 0 0-4 0v10.8a4 4 0 1 0 4 0zM12 9v7',
  gauge: 'M6 3h12v18H6zM6 8h4M6 13h4M6 18h4',
  bulb: 'M9 18h6M10 21h4M12 3a6 6 0 0 0-3.5 10.9c.6.5 1 1.3 1 2.1h5c0-.8.4-1.6 1-2.1A6 6 0 0 0 12 3z',
  info: 'M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18zM12 11v6M12 7.5v.01',
  chev: 'M9 6l6 6-6 6',
}

function niceDate(iso?: string | null) {
  const m = iso?.match(/(\d{4})-(\d{2})-(\d{2})/)
  if (!m) return iso ?? '—'
  const name = t(`month.${Number(m[2])}` as Key)
  return `${Number(m[3])} ${getLang() === 'en' ? name.slice(0, 3) : name} ${m[1]}`
}

function Tile({ icon, tone, title, sub, value, unit, badge, note, children, rec, field }: {
  icon: string; tone: string; title: string; sub?: string; value: string; unit?: string; badge?: ReactNode
  note?: ReactNode; children?: ReactNode; rec?: FieldValue; field: SnapshotField
}) {
  const prov = rec?.source ? field.provenance[rec.source] : undefined
  return (
    <div className={`env-tile env-${tone}`}>
      <div className="env-tile-head">
        <span className="env-icon"><Icon d={icon} size={24} /></span>
        <span><b>{title}</b>{sub && <small>{sub}</small>}</span>
      </div>
      <div className="env-value">
        <b>{value}</b>{unit && value !== '—' && <span>{unit}</span>}{badge}
      </div>
      {children}
      {note && <p className="env-note">{note}</p>}
      {rec && <div className="env-src"><ProvenanceBlock value={rec} prov={prov} /></div>}
    </div>
  )
}

function Group({ icon, title, question, children }: { icon: string; title: string; question: string; children: ReactNode }) {
  return (
    <section className="env-group">
      <div className="env-group-head">
        <span className="env-group-icon"><Icon d={icon} size={26} /></span>
        <span><b>{title}</b><small>{question}</small></span>
      </div>
      <div className="env-grid">{children}</div>
    </section>
  )
}

export function EnvConditions({ snap, field }: { snap: Snapshot; field: SnapshotField }) {
  const v = (k: string) => field.values[k] as FieldValue | undefined
  const num = (r?: FieldValue) => (r?.value === null || r?.value === undefined ? null : Number(r.value))
  // keep each value's own precision (SMAP 0.153, NDVI 0.599); fmtValue alone would round to 1 decimal
  const show = (r?: FieldValue, digits = 1) => fmtValue((r?.value ?? null) as number | null, digits)
  const rain7 = v('rain_7d'), imerg = v('imerg_rain_30d'), normal30 = v('rain_30d_normal')
  const dry = v('dry_season_rain_normal'), monsoon = v('monsoon_rain_normal'), userRain = v('user_rain_30d')
  const wet = v('gwetroot'), ph = v('soil_ph'), clay = v('clay_pct'), silt = v('silt_pct'), sand = v('sand_pct')
  const ndvi = v('ndvi'), smap = v('smap_soil_moisture'), temp = v('t2m'), tmax = v('t2m_max'), tmin = v('t2m_min')

  const pct = pctOfNormal(num(imerg), num(normal30))
  const phc = phClass(num(ph))
  const tNormal = tempNormalFor((snap as any).climatology?.[field.town_id], temp?.period as string | undefined)
  const tDiff = num(temp) !== null && tNormal !== null ? Math.round((num(temp)! - tNormal) * 10) / 10 : null
  const wetPos = num(wet)

  return (
    <section className="card env">
      <div className="env-head">
        <div>
          <h3><span className="env-head-icon"><Icon d={I.leaf} size={24} /></span>{t('overview.conditions')}</h3>
          <p className="env-sub"><Icon d={I.info} size={16} />{t('env.sub')}</p>
        </div>
        <span className="env-updated"><Icon d={I.cal} size={18} />{t('cond.updated', { d: niceDate(rain7?.period as string) })}</span>
      </div>

      <Group icon={I.rain} title={t('env.rainTitle')} question={t('env.rainQ')}>
        <Tile field={field} icon={I.rain} tone="rain" title={t('cond.last7')} sub={t('cond.rain7Src')}
          value={show(rain7)} unit="mm" rec={rain7} />
        <Tile field={field} icon={I.sat} tone="sat" title={t('cond.last30')} sub={t('cond.rain30Src')} value={show(imerg)} unit="mm"
          badge={pct !== null ? <em className="env-badge">{t('env.pctNormal', { p: pct })}</em> : undefined}
          note={num(normal30) !== null ? t('env.normalFor', { v: Math.round(num(normal30)!) }) : undefined} rec={imerg} />
        <Tile field={field} icon={I.sun} tone="sun" title={t('env.dryTitle')} sub={t('env.avg2001')} value={show(dry)} unit="mm"
          note={t('env.dryNote')} rec={dry} />
        {userRain && (
          <Tile field={field} icon={I.gauge} tone="mine" title={t('overview.userRain')} value={show(userRain)} unit="mm" rec={userRain} />
        )}
      </Group>

      <Group icon={I.sprout} title={t('env.soilTitle')} question={t('env.soilQ')}>
        <Tile field={field} icon={I.drop} tone="soil" title={t('overview.wetness')} value={show(wet, 3)} unit="(0–1)" rec={wet}>
          {wetPos !== null && (
            <div className="env-bar" aria-hidden="true">
              <span className="env-bar-track"><span className="env-bar-dot" style={{ left: `${Math.min(100, Math.max(0, wetPos * 100))}%` }} /></span>
              <span className="env-bar-ends"><small>{t('env.dry')}</small><small>{t('env.wet')}</small></span>
            </div>
          )}
        </Tile>
        <Tile field={field} icon={I.flask} tone="ph" title={t('env.phTitle')} value={show(ph)} unit="pH"
          badge={phc ? <em className="env-badge">{t(`env.ph.${phc}` as Key)}</em> : undefined}
          note={clay?.value != null ? t('overview.texture', { clay: clay.value, silt: silt?.value, sand: sand?.value }) : undefined} rec={ph} />
        <Tile field={field} icon={I.leaf} tone="ndvi" title={t('overview.ndvi')} value={show(ndvi, 3)} note={t('overview.ndviHint')} rec={ndvi} />
      </Group>

      <Group icon={I.chart} title={t('env.seasonTitle')} question={t('env.seasonQ')}>
        <Tile field={field} icon={I.rain} tone="rain" title={t('env.monsoonTitle')} sub={t('env.avg2001')} value={show(monsoon)} unit="mm"
          note={t('env.monsoonNote')} rec={monsoon} />
        <Tile field={field} icon={I.drop} tone="sat" title={t('overview.smap')} value={smap?.value == null ? '—' : show(smap, 3)} unit={smap?.unit}
          note={t('overview.smapHint')} rec={smap} />
        <Tile field={field} icon={I.thermo} tone="temp" title={t('overview.temp')} value={show(temp)} unit="°C"
          badge={tDiff !== null ? <em className="env-badge">{t('env.vsNormal', { d: `${tDiff > 0 ? '+' : ''}${tDiff}` })}</em> : undefined}
          note={tmax && tmin ? t('overview.tempRange', { min: tmin.value, max: tmax.value }) : undefined} rec={temp} />
      </Group>

      <div className="env-foot">
        <span className="env-foot-note"><Icon d={I.bulb} size={22} /><span><b>{t('env.noteLabel')}</b> {t('cond.note')}</span></span>
        <a className="cond-more" href="https://github.com/Alphathanlwin/NASA/blob/main/data/SOURCES.md" target="_blank" rel="noreferrer">
          {t('cond.more')}<Icon d={I.chev} size={18} />
        </a>
      </div>
    </section>
  )
}
