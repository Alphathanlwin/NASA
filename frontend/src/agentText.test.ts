// AI-assisted: Claude Code
import { describe, expect, it } from 'vitest'
import { stepText } from './agentText'
import { setLang } from './i18n'
import type { AgentEvent, SnapshotField } from './data'

// setLang touches the URL and <html lang>; give it the minimum a browser would have (as in i18n.test.ts)
;(globalThis as any).window ??= { location: { href: 'http://x/', search: '' }, history: { replaceState: () => {} } }
;(globalThis as any).document ??= { documentElement: { lang: 'en' } }

const KEYS = ['field_selected', 'geometry_resolved', 'loading_power', 'loading_imerg', 'checking_quality',
  'building_profile', 'evaluating_rotations', 'scenario_recalculated', 'report_ready']
const field = {
  id: 'F-01', town_id: 'myaungmya', town_name: 'Myaungmya', town_distance_km: 3.9, status: 'DEMO',
  values: { imerg_rain_30d: { value: 191, period: '30 days to 2026-11-12 (30 days with data)' }, smap_soil_moisture: { value: 0.41, period: '2026-11-10' } },
} as unknown as SnapshotField
const ev = (key: string, status = 'CACHED'): AgentEvent =>
  ({ key, label: 'English label', text: 'English text', source: 'Field profile', status, ok: true, t_ms: 0, sim_time: '09:12' }) as unknown as AgentEvent

describe('Analysis log steps in Burmese', () => {
  it('keeps the English text from the data in English', () => {
    setLang('en')
    expect(stepText(ev('loading_power'), field)).toMatchObject({ label: 'English label', text: 'English text' })
  })
  it('gives every step a Burmese label and sentence with the values filled in', () => {
    setLang('my')
    for (const k of KEYS) {
      const s = stepText(ev(k), field)
      expect(s.label).not.toBe('English label')
      expect(s.text).not.toBe('English text')
      expect(s.text).not.toMatch(/\{\w+\}/)
    }
    expect(stepText(ev('loading_imerg'), field).text).toContain('191')
    expect(stepText(ev('loading_imerg'), field).text).not.toContain('days with data')
    expect(stepText(ev('checking_quality'), field).text).toContain('0.41')
    expect(stepText(ev('field_selected'), field).text).toContain('F-01')
    setLang('en')
  })
  it('says rain is missing when IMERG was not available', () => {
    setLang('my')
    expect(stepText(ev('loading_imerg', 'UNAVAILABLE'), field).text).not.toContain('191')
    setLang('en')
  })
})
