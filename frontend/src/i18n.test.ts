// AI-assisted: Claude Code
import { afterEach, describe, expect, it } from 'vitest'
import { fieldName, setLang, townName } from './i18n'

// setLang touches the URL and <html lang>; give it the minimum a browser would have
;(globalThis as any).window ??= { location: { href: 'http://x/', search: '' }, history: { replaceState: () => {} } }
;(globalThis as any).document ??= { documentElement: { lang: 'en' } }

describe('townName', () => {
  afterEach(() => setLang('en'))

  it('gives the Burmese name in Burmese and the English name in English', () => {
    setLang('my')
    expect(townName('myaungmya', 'Myaungmya')).toBe('မြောင်းမြ')
    expect(townName('pathein', 'Pathein')).toBe('ပုသိမ်')
    expect(townName('bogale', 'Bogale')).toBe('ဘိုကလေး')
    expect(townName('twante', 'Twante')).toBe('တွံတေး')
    setLang('en')
    expect(townName('pathein', 'Pathein')).toBe('Pathein')
  })

  it('names the example fields in the current language, and keeps a farmer\'s own field name', () => {
    setLang('my')
    expect(fieldName({ id: 'F-02', name: 'Pathein demo field', town_id: 'pathein', town_name: 'Pathein' })).toBe('ပုသိမ် နမူနာ လယ်ကွက်')
    expect(fieldName({ id: 'MY-abc', name: 'U Aung field', town_id: 'pathein', town_name: 'Pathein' })).toBe('U Aung field')
    setLang('en')
    expect(fieldName({ id: 'F-02', name: 'Pathein demo field', town_id: 'pathein', town_name: 'Pathein' })).toBe('Pathein demo field')
  })

  it('falls back to the name in the data for a town it does not know', () => {
    setLang('my')
    expect(townName('maubin', 'Maubin')).toBe('Maubin')
    expect(townName(undefined, 'Somewhere')).toBe('Somewhere')
  })
})
