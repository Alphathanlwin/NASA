// AI-assisted: Claude Code
import { describe, expect, it } from 'vitest'
import en from '../i18n/en.json'
import my from '../i18n/my.json'
import { PH_STEPS, stepAfter, stepBefore } from './phGuideSteps'

describe('soil pH guide steps', () => {
  it('teaches eight steps, from walking the field to typing the number', () => {
    expect(PH_STEPS.map((s) => s.id)).toEqual(['zigzag', 'skip', 'dig', 'mix', 'water', 'shake', 'colour', 'type'])
  })

  it('Back on the first step stays there; Next on the last step finishes', () => {
    expect(stepBefore(0)).toBe(0)
    expect(stepAfter(0)).toBe(1)
    expect(stepAfter(PH_STEPS.length - 1)).toBe('done')
  })

  it('every step has its words in English and Burmese', () => {
    for (const s of PH_STEPS) {
      expect((en as Record<string, string>)[s.text], s.text).toBeTruthy()
      expect((my as Record<string, string>)[s.text], s.text).toBeTruthy()
    }
  })
})
