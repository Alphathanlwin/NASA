// AI-assisted: Claude Code
// Flat SVG field for devices without WebGL. Driven by the same sim state as the 3D view.
import { GRID, PLANTS, PLOT } from '../field3d/layout'
import type { SimState } from '../sim/types'

export function hasWebGL(): boolean {
  try {
    const c = document.createElement('canvas')
    return Boolean(c.getContext('webgl2') || c.getContext('webgl'))
  } catch {
    return false
  }
}

const STAGE_COLOR: Record<string, string> = {
  sown: '#9ccf6a', germination: '#8cc35f', vegetative: '#4f9a3a', flowering: '#a9b83f',
  fill: '#2f6f33', mature: '#d6b04a', harvested: '#d6b04a',
}

export function WebGLFallback({ sim }: { sim: SimState }) {
  const soil = `hsl(30, 40%, ${60 - sim.moisture * 35}%)`
  const r = sim.crop ? 0.08 + 0.2 * Math.min(1, sim.progress / 0.6) : 0
  const fill = STAGE_COLOR[sim.stage] ?? '#4f9a3a'
  return (
    <svg className="field-2d" viewBox={`${-PLOT.w / 2 - 1} ${-PLOT.d / 2 - 1} ${PLOT.w + 2} ${PLOT.d + 2}`}
      role="img" aria-label={`${GRID.cols * GRID.rows} plants`}>
      <rect x={-PLOT.w / 2} y={-PLOT.d / 2} width={PLOT.w} height={PLOT.d} fill={soil} stroke="#8a6a3f" strokeWidth="0.3" />
      {r > 0 && PLANTS.map((p, i) => <circle key={i} cx={p.x} cy={p.z} r={r * p.s} fill={fill} />)}
    </svg>
  )
}
