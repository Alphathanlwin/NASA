// AI-assisted: Claude Code
// Season summary, made readable: for each measure, which way is good for the farmer, and whether the
// chosen plan did better, the same or worse than the usual rotation.
type Totals = { nChange: number; irrigationMm: number; stressDays: number; days: number }
export type Verdict = 'better' | 'same' | 'worse' | null
export type SummaryRow = { id: 'nitrogen' | 'water' | 'stress' | 'days'; plan: number; usual: number | null; verdict: Verdict; diff: number }

const MEASURES: { id: SummaryRow['id']; get: (s: Totals) => number; higherIsBetter: boolean; same: number }[] = [
  { id: 'nitrogen', get: (s) => s.nChange, higherIsBetter: true, same: 0.5 },
  { id: 'water', get: (s) => s.irrigationMm, higherIsBetter: false, same: 1 },
  { id: 'stress', get: (s) => s.stressDays, higherIsBetter: false, same: 0.5 },
  { id: 'days', get: (s) => s.days, higherIsBetter: false, same: 0.5 },
]

export function summaryRows(plan: Totals, usual: Totals | null): SummaryRow[] {
  return MEASURES.map((m) => {
    const a = m.get(plan)
    if (!usual) return { id: m.id, plan: a, usual: null, verdict: null, diff: 0 }
    const b = m.get(usual)
    const gain = m.higherIsBetter ? a - b : b - a
    const verdict: Verdict = Math.abs(gain) < m.same ? 'same' : gain > 0 ? 'better' : 'worse'
    return { id: m.id, plan: a, usual: b, verdict, diff: Math.round(Math.abs(a - b) * 10) / 10 }
  })
}

export function verdictCount(rows: SummaryRow[]) {
  const c = { better: 0, same: 0, worse: 0, total: rows.length }
  for (const r of rows) if (r.verdict) c[r.verdict]++
  return c
}
