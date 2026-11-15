import { afterEach, expect, it, vi } from 'vitest'
import { confirmedAnswers } from './FarmerPlanner'
import { EMPTY, scenarioFor } from '../planner/flow'

afterEach(() => vi.unstubAllGlobals())

it('uses only confirmed answers for the selected field', () => {
  const answers = { ...EMPTY, disasters: ['flood'], waterStays: 'yes', water: 'unavailable' }
  vi.stubGlobal('localStorage', { getItem: () => JSON.stringify({ a: { done: true, answers }, b: { done: false, answers } }) })
  expect(scenarioFor(confirmedAnswers('a')!)).toMatchObject({ drainage: 'poor', irrigation: 'unavailable', planting_delay_days: 14 })
  expect(confirmedAnswers('b')).toBeNull()
  expect(confirmedAnswers('missing')).toBeNull()
})

it('ignores malformed saved answers', () => {
  vi.stubGlobal('localStorage', { getItem: () => '{' })
  expect(confirmedAnswers('a')).toBeNull()
})
