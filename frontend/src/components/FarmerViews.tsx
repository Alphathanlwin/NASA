import React, { useState } from 'react'
import { t } from '../i18n'
import type { FieldDetail, PlanResult, Priorities, ScenarioRequest, Crop } from '../api'

interface CommonProps {
  field: FieldDetail | null
  plan: PlanResult | null
  crops: Crop[]
  priorities: Priorities
  returns: Record<string, number>
  onUpdatePriorities: (p: Priorities) => void
  onUpdateReturns: (r: Record<string, number>) => void
  onSelectField: (id: string) => void
}

// ---------------------------------------------------------------------- F1: Overview
export const F1Overview: React.FC<CommonProps & { onDispatch: () => void }> = ({
  field,
  plan,
  onDispatch,
}) => {
  if (!field) {
    return (
      <div className="view-panel empty-state">
        <h3>Select a Farm Field</h3>
        <p>Click on any field polygon on the map or select from below to begin decision analysis.</p>
      </div>
    )
  }

  const w = field.weather
  const wet = field.wetness
  const topPlan = plan?.plans.find((p) => !p.is_existing) || plan?.plans[0]
  const existingPlan = plan?.plans.find((p) => p.is_existing)

  return (
    <div className="view-panel">
      <div className="panel-header">
        <div>
          <span className="field-tag">{field.id}</span>
          <h2>{field.name}</h2>
          <p className="subtext">Twante Township · Yangon Region</p>
        </div>
        <button className="primary-action-btn" onClick={onDispatch}>
          🚀 {t('dispatchAgent')}
        </button>
      </div>

      <div className="grid-metrics">
        <div className="metric-box">
          <span className="label">{t('monitoredArea')}</span>
          <span className="val tabular">
            {(field.area_ha * 2.47105).toFixed(1)} <small>acres</small>
          </span>
          <span className="sub">{field.area_ha.toFixed(2)} hectares</span>
        </div>

        <div className="metric-box">
          <span className="label">{t('rain7')}</span>
          <span className="val tabular">
            {w?.rain_7d != null ? `${w.rain_7d.toFixed(1)} mm` : '–'}
          </span>
          <span className="sub">NASA POWER modelled</span>
        </div>

        <div className="metric-box">
          <span className="label">{t('wetness')}</span>
          <span className="val tabular">
            {wet?.gwetroot != null ? wet.gwetroot.toFixed(2) : '–'}
          </span>
          <span className="sub">0 (dry) to 1.0 (saturated)</span>
        </div>

        <div className="metric-box">
          <span className="label">{t('soilPh')}</span>
          <span className="val tabular">
            {field.soil?.ph != null ? field.soil.ph.toFixed(1) : '–'}
          </span>
          <span className="sub">ISRIC SoilGrids 250m</span>
        </div>
      </div>

      <div className="summary-card">
        <h4>Decision Readiness</h4>
        <div className="summary-row">
          <div>
            <strong>Current Rotation: </strong>
            <span>{field.crop_history.join(' → ') || 'Unrecorded'}</span>
            {existingPlan?.eligibility === 'unsuitable' && (
              <span className="badge badge-warn">Unsuitable constraint</span>
            )}
          </div>
        </div>
        {topPlan && (
          <div className="summary-row highlight">
            <div>
              <strong>Top Alternative: </strong>
              <span>
                {topPlan.sequence.map((s) => s.crop_name).join(' → ')}
              </span>
            </div>
            <span className="score-badge tabular">Score: {topPlan.score ?? '–'}</span>
          </div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------- F2: My Farm & Drawing
interface F2Props extends CommonProps {
  drawing: boolean
  drawnPoints: [number, number][]
  onStartDrawing: () => void
  onFinishDrawing: () => void
  onCancelDrawing: () => void
  onClearDrawing: () => void
  onSaveDrawnField: (meta: { name: string; history: string[]; irrigation: string; drainage: string }) => void
}

export const F2MyFarm: React.FC<F2Props> = ({
  drawing,
  drawnPoints,
  onStartDrawing,
  onFinishDrawing,
  onCancelDrawing,
  onClearDrawing,
  onSaveDrawnField,
}) => {
  const [name, setName] = useState('My Custom Plot')
  const [crop1, setCrop1] = useState('monsoon_rice')
  const [crop2, setCrop2] = useState('summer_rice')
  const [irrigation, setIrrigation] = useState('available')
  const [drainage, setDrainage] = useState('good')

  return (
    <div className="view-panel">
      <div className="panel-header">
        <div>
          <h2>{t('f2Title')}</h2>
          <p className="subtext">Draw your field polygon or calibrate field management conditions.</p>
        </div>
      </div>

      <div className="draw-controls-bar">
        {!drawing ? (
          <button className="btn-secondary" onClick={onStartDrawing}>
            ✏️ {t('drawBoundary')}
          </button>
        ) : (
          <div className="drawing-actions">
            <button
              className="btn-primary"
              disabled={drawnPoints.length < 3}
              onClick={onFinishDrawing}
            >
              ✅ {t('finishDraw')} ({drawnPoints.length} pts)
            </button>
            <button className="btn-subtle" onClick={onCancelDrawing}>
              {t('cancelDraw')}
            </button>
          </div>
        )}
        {drawnPoints.length > 0 && !drawing && (
          <button className="btn-subtle" onClick={onClearDrawing}>
            {t('clearBoundary')}
          </button>
        )}
      </div>

      <form
        className="form-section"
        onSubmit={(e) => {
          e.preventDefault()
          onSaveDrawnField({
            name,
            history: [crop1, crop2],
            irrigation,
            drainage,
          })
        }}
      >
        <div className="form-group">
          <label>Field Name</label>
          <input
            type="text"
            className="input-text"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>Monsoon Season Crop</label>
            <select
              className="select-box"
              value={crop1}
              onChange={(e) => setCrop1(e.target.value)}
            >
              <option value="monsoon_rice">Monsoon Rice (မိုးစပါး)</option>
              <option value="fallow">Fallow / Rest (မြေလွတ်)</option>
            </select>
          </div>

          <div className="form-group">
            <label>Dry Season Crop</label>
            <select
              className="select-box"
              value={crop2}
              onChange={(e) => setCrop2(e.target.value)}
            >
              <option value="summer_rice">Summer Rice (နွေစပါး)</option>
              <option value="green_gram">Green Gram / Mung (မတ်ပဲ/ပဲတီစိမ်း)</option>
              <option value="black_gram">Black Gram (မတ်ပဲ)</option>
              <option value="sesame">Sesame (နှမ်း)</option>
              <option value="groundnut">Groundnut (မြေပဲ)</option>
              <option value="fallow">Fallow / Rest (မြေလွတ်)</option>
            </select>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>{t('irrigationStatus')}</label>
            <select
              className="select-box"
              value={irrigation}
              onChange={(e) => setIrrigation(e.target.value)}
            >
              <option value="available">{t('available')} (ဆည်ရေ/မြေအောက်ရေ)</option>
              <option value="unavailable">{t('unavailable')} (မိုးကောင်းသောက်)</option>
              <option value="unknown">{t('unknown')}</option>
            </select>
          </div>

          <div className="form-group">
            <label>{t('drainageStatus')}</label>
            <select
              className="select-box"
              value={drainage}
              onChange={(e) => setDrainage(e.target.value)}
            >
              <option value="good">{t('goodDrainage')}</option>
              <option value="moderate">{t('moderateDrainage')}</option>
              <option value="poor">{t('poorDrainage')}</option>
            </select>
          </div>
        </div>

        <button type="submit" className="primary-action-btn full-width">
          💾 {t('runAnalysis')}
        </button>
      </form>
    </div>
  )
}

// ---------------------------------------------------------------------- F3: Environment
export const F3Environment: React.FC<CommonProps> = ({ field }) => {
  if (!field) return <div className="view-panel empty-state">No field selected.</div>

  const w = field.weather
  const wet = field.wetness
  const s = field.soil
  const prov = field.provenance || {}

  return (
    <div className="view-panel">
      <div className="panel-header">
        <div>
          <h2>{t('f3Title')}</h2>
          <p className="subtext">Traceable environmental observations & modeled evidence for {field.name}.</p>
        </div>
      </div>

      <div className="evidence-list">
        <div className="evidence-card">
          <div className="card-top">
            <h4>🌧️ Precipitation (NASA POWER)</h4>
            <span className="badge badge-live">{prov.weather?.status || 'CACHED'}</span>
          </div>
          <div className="detail-grid">
            <div>
              <span className="d-label">7-Day Sum:</span>
              <span className="d-val tabular">{w?.rain_7d != null ? `${w.rain_7d.toFixed(1)} mm` : '–'}</span>
            </div>
            <div>
              <span className="d-label">30-Day Sum:</span>
              <span className="d-val tabular">{w?.rain_30d != null ? `${w.rain_30d.toFixed(1)} mm` : '–'}</span>
            </div>
            <div>
              <span className="d-label">Monthly Mean:</span>
              <span className="d-val tabular">{w?.clim_month?.rain_mm != null ? `${w.clim_month.rain_mm.toFixed(0)} mm` : '–'}</span>
            </div>
          </div>
        </div>

        <div className="evidence-card">
          <div className="card-top">
            <h4>💧 Root-Zone Soil Moisture (GWETROOT)</h4>
            <span className="badge badge-live">{prov.wetness?.status || 'CACHED'}</span>
          </div>
          <div className="detail-grid">
            <div>
              <span className="d-label">Index (0–1):</span>
              <span className="d-val tabular">{wet?.gwetroot != null ? wet.gwetroot.toFixed(3) : '–'}</span>
            </div>
            <div>
              <span className="d-label">7-Day Change:</span>
              <span className="d-val tabular">{wet?.gwetroot_7d_change != null ? wet.gwetroot_7d_change.toFixed(3) : '–'}</span>
            </div>
            <div>
              <span className="d-label">Topsoil Wetness:</span>
              <span className="d-val tabular">{wet?.gwettop != null ? wet.gwettop.toFixed(3) : '–'}</span>
            </div>
          </div>
        </div>

        <div className="evidence-card">
          <div className="card-top">
            <h4>🧪 Soil Chemical & Physical Profile</h4>
            <span className="badge badge-cached">ISRIC SoilGrids 2.0</span>
          </div>
          <div className="detail-grid">
            <div>
              <span className="d-label">pH (0–5cm):</span>
              <span className="d-val tabular">{s?.ph != null ? s.ph.toFixed(1) : '–'}</span>
            </div>
            <div>
              <span className="d-label">Texture:</span>
              <span className="d-val">Clay {s?.clay_pct || 42}% · Silt {s?.silt_pct || 38}% · Sand {s?.sand_pct || 20}%</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------- F4: Compare Rotations
export const F4Compare: React.FC<CommonProps> = ({
  plan,
  crops,
  priorities,
  returns,
  onUpdatePriorities,
  onUpdateReturns,
}) => {
  if (!plan) return <div className="view-panel empty-state">No rotation plan calculated yet.</div>

  return (
    <div className="view-panel">
      <div className="panel-header">
        <div>
          <h2>{t('f4Title')}</h2>
          <p className="subtext">Deterministic evaluation of crop rotation sequences.</p>
        </div>
      </div>

      {/* Priorities Bar */}
      <div className="priorities-box">
        <h4>Scoring Weights</h4>
        <div className="sliders-row">
          <label>
            Income: {priorities.income}%
            <input
              type="range"
              min="0"
              max="100"
              value={priorities.income}
              onChange={(e) => onUpdatePriorities({ ...priorities, income: Number(e.target.value) })}
            />
          </label>
          <label>
            Soil: {priorities.soil}%
            <input
              type="range"
              min="0"
              max="100"
              value={priorities.soil}
              onChange={(e) => onUpdatePriorities({ ...priorities, soil: Number(e.target.value) })}
            />
          </label>
          <label>
            Water: {priorities.water}%
            <input
              type="range"
              min="0"
              max="100"
              value={priorities.water}
              onChange={(e) => onUpdatePriorities({ ...priorities, water: Number(e.target.value) })}
            />
          </label>
        </div>
      </div>

      {/* Farmer Net Returns Inputs */}
      <div className="returns-drawer">
        <details>
          <summary>
            <strong>💰 {t('returnsTitle')} ({Object.keys(returns).length} configured)</strong>
          </summary>
          <p className="hint">{t('returnsHint')}</p>
          <div className="returns-grid">
            {crops.map((c) => (
              <label key={c.id} className="return-input-row">
                <span>{c.name}:</span>
                <input
                  type="number"
                  placeholder="0"
                  className="input-text"
                  value={returns[c.id] ?? ''}
                  onChange={(e) => {
                    const val = e.target.value === '' ? undefined : Number(e.target.value)
                    const next = { ...returns }
                    if (val == null) delete next[c.id]
                    else next[c.id] = val
                    onUpdateReturns(next)
                  }}
                />
              </label>
            ))}
          </div>
        </details>
      </div>

      {/* Comparison Table */}
      <div className="table-responsive">
        <table className="comparison-table">
          <thead>
            <tr>
              <th>Rank</th>
              <th>Rotation Strategy</th>
              <th className="num-col">Score</th>
              <th className="num-col">Soil</th>
              <th className="num-col">Water</th>
              <th className="num-col">Income</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {plan.plans.map((p) => {
              const isUnsuitable = p.eligibility === 'unsuitable'
              return (
                <tr key={p.id} className={p.is_existing ? 'row-existing' : ''}>
                  <td className="tabular">{p.rank != null ? `#${p.rank}` : '–'}</td>
                  <td>
                    <strong>{p.sequence.map((s) => s.crop_name).join(' → ')}</strong>
                    {p.is_existing && <span className="tag-baseline">Baseline</span>}
                  </td>
                  <td className="num-col tabular font-bold">{p.score != null ? p.score : '–'}</td>
                  <td className="num-col tabular">{p.breakdown.soil != null ? p.breakdown.soil : '–'}</td>
                  <td className="num-col tabular">{p.breakdown.water != null ? p.breakdown.water : '–'}</td>
                  <td className="num-col tabular">{p.breakdown.income != null ? p.breakdown.income : '–'}</td>
                  <td>
                    {isUnsuitable ? (
                      <span className="badge badge-warn">Unsuitable</span>
                    ) : (
                      <span className="badge badge-live">Eligible</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <div className="reasons-breakdown">
        <h4>Detailed Findings</h4>
        {plan.plans.map((p) => (
          <div key={p.id} className="finding-item">
            <strong>{p.sequence.map((s) => s.crop_name).join(' → ')}: </strong>
            {p.reasons_for.map((r, i) => (
              <span key={i} className="f-pos">+{r.points} {r.text}. </span>
            ))}
            {p.reasons_against.map((r, i) => (
              <span key={i} className="f-neg">{r.points} {r.text}. </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------- F5: Scenarios
interface F5Props extends CommonProps {
  scenario: ScenarioRequest
  onUpdateScenario: (s: ScenarioRequest) => void
  onRunScenarioAnalysis: () => void
  scenarioResult: PlanResult | null
}

export const F5Scenarios: React.FC<F5Props> = ({
  plan,
  scenario,
  onUpdateScenario,
  onRunScenarioAnalysis,
  scenarioResult,
}) => {
  return (
    <div className="view-panel">
      <div className="panel-header">
        <div>
          <h2>{t('f5Title')}</h2>
          <p className="subtext">Simulate drought, planting delays, and irrigation constraints.</p>
        </div>
      </div>

      <div className="scenario-controls">
        <div className="slider-group">
          <label>
            {t('rainfallChange')}: <strong className="tabular">{scenario.rainfall_change_percent ?? 0}%</strong>
            <input
              type="range"
              min="-60"
              max="60"
              step="5"
              value={scenario.rainfall_change_percent ?? 0}
              onChange={(e) =>
                onUpdateScenario({ ...scenario, rainfall_change_percent: Number(e.target.value) })
              }
            />
          </label>
        </div>

        <div className="slider-group">
          <label>
            {t('plantingDelay')}: <strong className="tabular">{scenario.planting_delay_days ?? 0} days</strong>
            <input
              type="range"
              min="0"
              max="30"
              step="5"
              value={scenario.planting_delay_days ?? 0}
              onChange={(e) =>
                onUpdateScenario({ ...scenario, planting_delay_days: Number(e.target.value) })
              }
            />
          </label>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label>{t('irrigationStatus')}</label>
            <select
              className="select-box"
              value={scenario.irrigation ?? 'available'}
              onChange={(e) =>
                onUpdateScenario({ ...scenario, irrigation: e.target.value as any })
              }
            >
              <option value="available">{t('available')}</option>
              <option value="unavailable">{t('unavailable')}</option>
            </select>
          </div>

          <div className="form-group">
            <label>{t('drainageStatus')}</label>
            <select
              className="select-box"
              value={scenario.drainage ?? 'good'}
              onChange={(e) =>
                onUpdateScenario({ ...scenario, drainage: e.target.value as any })
              }
            >
              <option value="good">{t('goodDrainage')}</option>
              <option value="moderate">{t('moderateDrainage')}</option>
              <option value="poor">{t('poorDrainage')}</option>
            </select>
          </div>
        </div>

        <button className="primary-action-btn" onClick={onRunScenarioAnalysis}>
          ⚡ Run Scenario Projection
        </button>
      </div>

      {scenarioResult && (
        <div className="scenario-diff-card">
          <h4>Scenario Impact Analysis</h4>
          <table className="comparison-table">
            <thead>
              <tr>
                <th>Rotation</th>
                <th className="num-col">Baseline</th>
                <th className="num-col">Scenario</th>
                <th className="num-col">Delta</th>
              </tr>
            </thead>
            <tbody>
              {scenarioResult.plans.map((sp) => {
                const bp = plan?.plans.find((p) => p.id === sp.id)
                const baseScore = bp?.score ?? null
                const scenScore = sp.score ?? null
                const delta = baseScore != null && scenScore != null ? scenScore - baseScore : null
                return (
                  <tr key={sp.id}>
                    <td>{sp.sequence.map((s) => s.crop_name).join(' → ')}</td>
                    <td className="num-col tabular">{baseScore != null ? baseScore : '–'}</td>
                    <td className="num-col tabular font-bold">{scenScore != null ? scenScore : '–'}</td>
                    <td className={`num-col tabular ${delta && delta < 0 ? 'text-warn' : 'text-pos'}`}>
                      {delta != null ? (delta > 0 ? `+${delta.toFixed(1)}` : delta.toFixed(1)) : '–'}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

// ---------------------------------------------------------------------- F6: Decision Report
export const F6Report: React.FC<CommonProps> = ({ field, plan }) => {
  if (!field || !plan) {
    return <div className="view-panel empty-state">No decision report available.</div>
  }

  const topPlan = plan.plans.find((p) => !p.is_existing) || plan.plans[0]

  return (
    <div className="view-panel print-container">
      <div className="report-header">
        <div>
          <h1>GARVESTY FARM REPORT</h1>
          <p className="subtext">Decision Support for Myanmar Delta Farms · NASA Space Apps 2026</p>
        </div>
        <div className="report-actions no-print">
          <button className="btn-primary" onClick={() => window.print()}>
            🖨️ {t('printReport')}
          </button>
        </div>
      </div>

      <div className="report-summary-box">
        <div className="summary-item">
          <span className="lbl">Target Field:</span>
          <strong>{field.name} ({field.id})</strong>
        </div>
        <div className="summary-item">
          <span className="lbl">Area:</span>
          <strong className="tabular">{(field.area_ha * 2.47105).toFixed(1)} acres ({field.area_ha.toFixed(2)} ha)</strong>
        </div>
        <div className="summary-item">
          <span className="lbl">Recommended Strategy:</span>
          <strong className="text-pos">
            {topPlan ? topPlan.sequence.map((s) => s.crop_name).join(' → ') : 'N/A'}
          </strong>
        </div>
      </div>

      <div className="report-section">
        <h3>Local Action Checklist</h3>
        <ul className="checklist">
          <li>✓ Check dry season salt intrusion risk near local waterways.</li>
          <li>✓ Confirm certified pulse seed availability (Mung Bean / Black Gram).</li>
          <li>✓ Verify current market prices at township trade center.</li>
        </ul>
      </div>

      <div className="report-disclaimer">
        <p>{t('disclaimer')}</p>
      </div>
    </div>
  )
}
