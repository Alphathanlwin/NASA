import { describe, expect, it } from 'vitest'
import { toggleDemo } from './irrigationDemo'

describe('demo irrigation controls', () => {
  it('opens the valve when starting the pump and stops the pump when closing the valve', () => {
    const running = toggleDemo({ pump: false, valve: false }, 'pump')
    expect(running).toEqual({ pump: true, valve: true })
    expect(toggleDemo(running, 'valve')).toEqual({ pump: false, valve: false })
    expect(toggleDemo(running, 'pump')).toEqual({ pump: false, valve: true })
    expect(toggleDemo({ pump: false, valve: false }, 'valve')).toEqual({ pump: false, valve: true })
  })
})
