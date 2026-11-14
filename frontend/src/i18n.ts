// AI-assisted: Claude Code
// English is the default. ?lang=my switches the whole interface to Burmese.
import en from './i18n/en.json'
import my from './i18n/my.json'

export type Lang = 'en' | 'my'
export type Key = keyof typeof en

const dictionaries: Record<Lang, Record<string, string>> = { en, my }
let current: Lang = 'en'

export function initialLang(): Lang {
  const q = new URLSearchParams(window.location.search).get('lang')
  return q === 'my' ? 'my' : 'en'
}

export function setLang(lang: Lang) {
  current = lang
  const url = new URL(window.location.href)
  if (lang === 'my') url.searchParams.set('lang', 'my')
  else url.searchParams.delete('lang')
  window.history.replaceState(null, '', url)
  document.documentElement.lang = lang === 'my' ? 'my' : 'en'
}

export function getLang(): Lang {
  return current
}

export function t(key: Key, params?: Record<string, string | number | null | undefined>): string {
  let s = dictionaries[current][key] ?? en[key] ?? key
  if (params) {
    for (const [k, v] of Object.entries(params)) {
      s = s.split(`{${k}}`).join(v == null ? '–' : String(v))
    }
  }
  return s
}

export function fmtDate(value: string | null | undefined): string {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return value
  return d.toISOString().slice(0, 16).replace('T', ' ') + ' UTC'
}

/** A reference town's name in the current language; falls back to the name in the data. */
export function townName(id: string | null | undefined, fallback: string): string {
  if (!id) return fallback
  const key = `town.${id}`
  return dictionaries[current][key] ?? (en as Record<string, string>)[key] ?? fallback
}

/** A field's title: the example fields (F-01..) are named after their town in the current language;
 *  a field the farmer drew keeps the name they typed. */
export function fieldName(f: { id: string; name: string; town_id?: string | null; town_name?: string | null }): string {
  if (!/^F-\d+$/.test(f.id) || !f.town_id) return f.name
  return t('field.demoName' as Key, { town: townName(f.town_id, f.town_name ?? f.name) })
}
