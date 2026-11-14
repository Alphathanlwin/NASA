// AI-assisted: Claude Code
// The soil pH test, step by step. Sampling steps follow Mississippi State University Extension,
// "Soil Testing for the Farmer" (P3858); the kit steps defer to the kit's own leaflet for amounts and
// waiting time, because kits differ.
export type PhStep = { id: string; text: string }

export const PH_STEPS: PhStep[] = [
  { id: 'zigzag', text: 'phguide.zigzag' },
  { id: 'skip', text: 'phguide.skip' },
  { id: 'dig', text: 'phguide.dig' },
  { id: 'mix', text: 'phguide.mix' },
  { id: 'water', text: 'phguide.water' },
  { id: 'shake', text: 'phguide.shake' },
  { id: 'colour', text: 'phguide.colour' },
  { id: 'type', text: 'phguide.type' },
]

export const stepBefore = (i: number) => Math.max(0, i - 1)
export const stepAfter = (i: number): number | 'done' => (i >= PH_STEPS.length - 1 ? 'done' : i + 1)
