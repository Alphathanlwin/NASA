// AI-assisted: Claude Code
import { describe, expect, it } from 'vitest'
import { HARVESTER_PARK, HEADER_REACH, actionPose, harvesterPose } from './layout'
import type { Action } from './layout'

const cut: Action = { kind: 'cut', crop: 'rice', start: 0, duration: 6500 }
const at = (p: number) => p * cut.duration

describe('harvester path', () => {
  it('waits parked when nothing is happening, and is back in the same spot and heading when the harvest ends', () => {
    const idle = harvesterPose(null, 0)
    expect(idle).toMatchObject({ x: HARVESTER_PARK.x, z: HARVESTER_PARK.z, heading: HARVESTER_PARK.heading, working: false })
    const end = harvesterPose(cut, at(1))
    expect(end.x).toBeCloseTo(idle.x)
    expect(end.z).toBeCloseTo(idle.z)
    expect(Math.cos(end.heading)).toBeCloseTo(Math.cos(idle.heading))
    const start = harvesterPose(cut, at(0))
    expect(start.x).toBeCloseTo(idle.x)
    expect(Math.cos(start.heading)).toBeCloseTo(Math.cos(idle.heading))
  })

  it('keeps the front of the cutter on the line where the crop disappears', () => {
    for (const p of [0.15, 0.3, 0.45, 0.55]) {
      const sweep = actionPose(cut, at(p)).sweep!
      const h = harvesterPose(cut, at(p))
      expect(h.working).toBe(true)
      expect(h.x + HEADER_REACH).toBeCloseTo(sweep)
    }
  })

  it('never jumps: small steps in time give small steps in position', () => {
    let prev = harvesterPose(cut, 0)
    for (let ms = 20; ms <= cut.duration; ms += 20) {
      const h = harvesterPose(cut, ms)
      expect(Math.hypot(h.x - prev.x, h.z - prev.z)).toBeLessThan(0.25)
      prev = h
    }
  })
})
