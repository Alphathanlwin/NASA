// AI-assisted: Claude Code
// Asserts that the TypeScript engine and the Python engine return identical results
// for every snapshot field, at the default priorities and under every hero scenario.
//
//     node scripts/parity_test.mjs
import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { evaluate, inputsFromProfile } from '../frontend/src/engine/engine.ts'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const snapshot = JSON.parse(readFileSync(join(root, 'frontend/public/snapshot.json'), 'utf8'))
const python = process.env.PYTHON || (process.platform === 'win32' ? '.venv/Scripts/python.exe' : '.venv/bin/python')
const py = JSON.parse(execFileSync(python, [join(root, 'scripts/parity_dump.py')], { cwd: root, encoding: 'utf8' }))

const pick = (r) => ({
  engine_version: r.engine_version,
  scenario: r.scenario,
  weights: r.weights,
  income_enabled: r.income_enabled,
  plans: r.plans.map((p) => ({
    id: p.id,
    rank: p.rank,
    score: p.score,
    category: p.category,
    score_components: p.score_components,
    calendar: p.calendar,
    reasons: [...p.reasons_for, ...p.reasons_against, ...p.notes].map((f) => [f.rule, f.score_delta, f.reason, f.assumption]),
    unknowns: p.unknowns.map((u) => [u.rule, u.reason]),
    evidence_refs: p.evidence_refs,
    local_checks: p.local_checks,
  })),
})

let checked = 0
for (const [fid, rec] of Object.entries(snapshot.fields)) {
  const inputs = inputsFromProfile(rec, snapshot.climatology[rec.town_id] ?? null)
  assert.deepEqual(pick(evaluate(inputs)), pick(py[fid].base), `${fid} base`)
  checked++
  for (const s of snapshot.scenario_definitions) {
    assert.deepEqual(pick(evaluate(inputs, s.assumptions)), pick(py[fid].scenarios[s.id]), `${fid} ${s.id}`)
    checked++
  }
}
console.log(`parity ok: ${checked} evaluations across ${Object.keys(snapshot.fields).length} fields`)
