// AI-assisted: Claude Code
// Analysis log steps in the current language. The steps come from the snapshot in English
// (backend/app/engine/agent.py); in Burmese each step is written from the same field values.
import type { AgentEvent, SnapshotField } from './data'
import { getLang, t, townName } from './i18n'
import type { Key } from './i18n'

const SOURCES: Record<string, Key> = {
  'Demo geometry (DEMO)': 'agent.src.demoGeometry', 'Cleaning report': 'agent.src.cleaning',
  'Field profile': 'agent.src.profile', 'Rotation engine': 'agent.src.engine',
  'Scenario simulator': 'agent.src.scenario', 'Decision report': 'agent.src.report', 'Your drawing': 'agent.src.drawing',
}

/** "30 days to 2026-11-12 (30 days with data)" from the data, said in the current language. */
function period(p: unknown): string {
  const s = String(p ?? '')
  const m = s.match(/^(\d+) days to (\S+) \((\d+) days with data\)$/)
  return m ? t('agent.period', { n: m[1], d: m[2], k: m[3] }) : s
}

export function stepText(ev: AgentEvent, field: SnapshotField): { label: string; text: string; source: string | null } {
  if (getLang() !== 'my') return { label: ev.label, text: ev.text, source: ev.source ?? null }
  const mine = field.status === 'USER-INPUT'
  const town = townName(field.town_id, field.town_name)
  const v = field.values ?? {}
  const imerg = v.imerg_rain_30d, smap = v.smap_soil_moisture
  let text: string
  switch (ev.key) {
    case 'field_selected':
      text = mine ? t('agent.s.field_selected.mine') : t('agent.s.field_selected', { id: field.id })
      break
    case 'geometry_resolved':
      text = mine ? t('agent.s.geometry_resolved.mine', { town }) : t('agent.s.geometry_resolved', { town, d: field.town_distance_km })
      break
    case 'loading_imerg':
      text = ev.status !== 'UNAVAILABLE' && imerg?.value != null
        ? t('agent.s.loading_imerg', { town, mm: String(imerg.value), period: period(imerg.period) })
        : t('agent.s.loading_imerg.none')
      break
    case 'checking_quality':
      text = `${t('agent.s.checking_quality')} ${smap?.value != null
        ? t('agent.s.smap', { sm: String(smap.value), period: String(smap.period ?? '') })
        : t('agent.s.smap.none')}`
      break
    case 'evaluating_rotations':
      text = t('agent.s.evaluating_rotations', { mung: t('crop.mung_bean'), black: t('crop.black_gram') })
      break
    default:
      text = t(`agent.s.${ev.key}` as Key, { town })
  }
  const src = ev.source ? (SOURCES[ev.source] ? t(SOURCES[ev.source]) : ev.source) : null
  return { label: t(`agent.l.${ev.key}` as Key), text, source: src }
}
