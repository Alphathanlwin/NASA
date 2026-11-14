// AI-assisted: Claude Code
// Shared geometry of the field scene, so the agent's walk and the crop sweep stay in sync.

export const PLOT = { w: 16, d: 10 }
export const GRID = { cols: 26, rows: 14 }
export const AGENT_HOME: [number, number, number] = [3.2, 0, 6.9]

/** Small deterministic jitter so the rows look planted by hand. */
function hash(i: number) {
  const x = Math.sin(i * 127.1 + 311.7) * 43758.5453
  return x - Math.floor(x)
}

export const PLANTS: { x: number; z: number; r: number; s: number }[] = (() => {
  const out = []
  for (let row = 0; row < GRID.rows; row++) {
    for (let col = 0; col < GRID.cols; col++) {
      const i = row * GRID.cols + col
      const x = -PLOT.w / 2 + 0.5 + (col + 0.5) * ((PLOT.w - 1) / GRID.cols) + (hash(i) - 0.5) * 0.16
      const z = -PLOT.d / 2 + 0.5 + (row + 0.5) * ((PLOT.d - 1) / GRID.rows) + (hash(i + 999) - 0.5) * 0.16
      out.push({ x, z, r: hash(i + 77) * Math.PI * 2, s: 0.85 + hash(i + 31) * 0.3 })
    }
  }
  return out
})()

export interface Action {
  kind: 'cut' | 'sow'
  crop: string
  start: number
  duration: number
}

const SWEEP_FROM = -PLOT.w / 2 - 0.3
const SWEEP_TO = PLOT.w / 2 + 0.3

// Harvest uses its own phases so the machine has time to drive in, cut, turn and drive back.
const PHASE = { cut: { in: 0.10, out: 0.58 }, sow: { in: 0.12, out: 0.88 } }

/** Where the agent is during an action, and how far across the field the work has reached. */
export function actionPose(a: Action | null, now: number) {
  if (!a) return { x: AGENT_HOME[0], z: AGENT_HOME[2], sweep: null as number | null, walking: false, working: false, heading: 0 }
  const p = Math.min(1, Math.max(0, (now - a.start) / a.duration))
  const { in: pin, out: pout } = PHASE[a.kind]
  const lerp = (u: number, b: number, c: number) => b + (c - b) * u
  if (p < pin) {
    const u = p / pin
    const x = lerp(u, AGENT_HOME[0], SWEEP_FROM)
    const z = lerp(u, AGENT_HOME[2], 0)
    return { x, z, sweep: SWEEP_FROM, walking: true, working: false, heading: Math.atan2(SWEEP_FROM - AGENT_HOME[0], -AGENT_HOME[2]) }
  }
  if (p < pout) {
    const u = (p - pin) / (pout - pin)
    const x = lerp(u, SWEEP_FROM, SWEEP_TO)
    return { x, z: Math.sin(u * Math.PI * 6) * 0.6, sweep: x, walking: true, working: true, heading: Math.PI / 2 }
  }
  const u = (p - pout) / (1 - pout)
  return {
    x: lerp(u, SWEEP_TO, AGENT_HOME[0]), z: lerp(u, 0, AGENT_HOME[2]), sweep: SWEEP_TO + 1,
    walking: u < 1, working: false, heading: Math.atan2(AGENT_HOME[0] - SWEEP_TO, AGENT_HOME[2]),
  }
}

/** The combine harvester parks beside the house facing it, and its cutter reaches this far ahead of its centre. */
export const HARVESTER_PARK = { x: -11.6, z: 1.5, heading: Math.PI }
export const HEADER_REACH = 2.0

/** Harvester during a harvest: pivot to face the field, drive in, cut across with the cutter front on the
 *  sweep line, pivot on the spot (crawlers can), drive back over the stubble and park as it started.
 *  heading is three.js rotation.y for a model that faces +x. */
export function harvesterPose(a: Action | null, now: number) {
  const park = { x: HARVESTER_PARK.x, z: HARVESTER_PARK.z, heading: HARVESTER_PARK.heading, working: false }
  if (!a || a.kind !== 'cut') return park
  const p = Math.min(1, Math.max(0, (now - a.start) / a.duration))
  const lerp = (u: number, b: number, c: number) => b + (c - b) * u
  const start = SWEEP_FROM - HEADER_REACH, end = SWEEP_TO - HEADER_REACH
  const { in: pin, out: pout } = PHASE.cut
  const spin1 = 0.04, spin2 = pout + 0.08
  if (p < spin1) return { ...park, heading: Math.PI * (1 - p / spin1) }
  if (p < pin) {
    const u = (p - spin1) / (pin - spin1)
    return { x: lerp(u, park.x, start), z: lerp(u, park.z, 0), heading: 0, working: false }
  }
  if (p < pout) return { x: actionPose(a, now).sweep! - HEADER_REACH, z: 0, heading: 0, working: true }
  if (p < spin2) return { x: end, z: 0, heading: Math.PI * ((p - pout) / (spin2 - pout)), working: false }
  const u = (p - spin2) / (1 - spin2)
  return { x: lerp(u, end, park.x), z: lerp(u, 0, park.z), heading: Math.PI, working: false }
}
