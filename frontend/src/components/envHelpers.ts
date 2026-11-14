// AI-assisted: Claude Code
// Badges for the Environmental conditions card. Only comparisons with a published scale or with the
// field's own long-term normal: no invented "good / bad" thresholds.

export type PhClass =
  | 'ultra_acid' | 'extremely_acid' | 'very_strongly_acid' | 'strongly_acid' | 'moderately_acid' | 'slightly_acid'
  | 'neutral' | 'slightly_alkaline' | 'moderately_alkaline' | 'strongly_alkaline' | 'very_strongly_alkaline'

/** Soil reaction classes, USDA Soil Survey Manual (Soil Science Division Staff, 2017). */
const PH_CLASSES: [number, PhClass][] = [
  [3.5, 'ultra_acid'], [4.5, 'extremely_acid'], [5.1, 'very_strongly_acid'], [5.6, 'strongly_acid'],
  [6.1, 'moderately_acid'], [6.6, 'slightly_acid'], [7.4, 'neutral'], [7.9, 'slightly_alkaline'],
  [8.5, 'moderately_alkaline'], [9.1, 'strongly_alkaline'],
]

export function phClass(ph: number | null | undefined): PhClass | null {
  if (ph === null || ph === undefined || Number.isNaN(ph)) return null
  const v = Math.round(ph * 10) / 10
  for (const [upper, name] of PH_CLASSES) if (v < upper) return name
  return 'very_strongly_alkaline'
}

/** Observed total as a whole percent of its normal for the same days. */
export function pctOfNormal(obs: number | null | undefined, normal: number | null | undefined): number | null {
  if (obs === null || obs === undefined || !normal) return null
  return Math.round((obs / normal) * 100)
}

/** Long-term mean daily temperature ((max + min) / 2) for the calendar day of an ISO date. */
export function tempNormalFor(clim: { t2m_max: number[]; t2m_min: number[] } | null | undefined, iso: string | null | undefined): number | null {
  if (!clim || !iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null
  const [, m, d] = iso.split('-').map(Number)
  const doy = Math.round((Date.UTC(2000, m - 1, d) - Date.UTC(2000, 0, 1)) / 86400000) + 1 // leap-year calendar
  const hi = clim.t2m_max[doy - 1], lo = clim.t2m_min[doy - 1]
  return hi == null || lo == null ? null : (hi + lo) / 2
}
