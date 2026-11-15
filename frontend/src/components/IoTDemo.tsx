import { useState } from 'react'
import { t } from '../i18n'
import { toggleDemo } from './irrigationDemo'

export function IoTDemo({ visible }: { visible: boolean }) {
  const [state, setState] = useState({ pump: false, valve: false })
  const [readings, setReadings] = useState<Record<string, string>>({})
  const parameters = [
    { id: 'moisture', label: t('iot.moisture'), unit: '%', min: 0, max: 100 },
    { id: 'water', label: t('iot.water'), unit: 'cm', min: 0, max: 500 },
    { id: 'light', label: t('iot.light'), unit: 'lux', min: 0, max: 200000 },
    { id: 'co2', label: t('iot.co2'), unit: 'ppm', min: 0, max: 100000 },
    { id: 'ph', label: t('iot.ph'), unit: '', min: 0, max: 14 },
  ]
  return (
    <section id="iot-panel" className="iot-panel" aria-labelledby="iot-title" hidden={!visible}>
      <div className="iot-heading">
        <div><span className="iot-eyebrow">{t('iot.demo')}</span><h2 id="iot-title">{t('iot.title')}</h2></div>
      </div>
      <p className="iot-intro">{t('iot.simpleIntro')}</p>
      <p className="iot-sensor-key"><span aria-hidden="true">●</span> {t('iot.sensorKey')}</p>
      <h3>{t('iot.enterValues')}</h3>
      <p className="iot-input-note">{t('iot.valuesNote')}</p>
      <div className="iot-readings">
        {parameters.map((r) => <label className="iot-reading" key={r.id}>
          <span>{r.label} {r.unit && <small>({r.unit})</small>}</span>
          <input type="number" inputMode="decimal" min={r.min} max={r.max} step="any"
            value={readings[r.id] ?? ''} placeholder="—" aria-invalid={readings[r.id] !== undefined && readings[r.id] !== '' && (Number(readings[r.id]) < r.min || Number(readings[r.id]) > r.max)}
            onChange={e => setReadings(current => ({ ...current, [r.id]: e.target.value }))} />
          {readings[r.id] !== undefined && readings[r.id] !== '' && (Number(readings[r.id]) < r.min || Number(readings[r.id]) > r.max) && <small role="alert">{t('readings.range', { min: r.min, max: r.max })}</small>}
        </label>)}
      </div>
      <div className="iot-controls">
        <div><h3>{t('iot.controls')}</h3><p>{t('iot.interlock')}</p></div>
        <div className="iot-control-actions" aria-live="polite">
          <div><span>{t('iot.pump')}: <b>{t(state.pump ? 'iot.on' : 'iot.off')}</b></span>
            <button type="button" onClick={() => setState(s => toggleDemo(s, 'pump'))}>{t(state.pump ? 'iot.stop' : 'iot.start')}</button></div>
          <div><span>{t('iot.valve')}: <b>{t(state.valve ? 'iot.open' : 'iot.closed')}</b></span>
            <button type="button" onClick={() => setState(s => toggleDemo(s, 'valve'))}>{t(state.valve ? 'iot.closeValve' : 'iot.openValve')}</button></div>
        </div>
      </div>
      <details className="iot-details"><summary>{t('iot.more')}</summary>
        <p>{t('iot.phNote')} {t('iot.luxNote')}. {t('iot.co2Note')}.</p>
        <p>{t('iot.network')} {t('iot.range')}</p>
        <p><b>{t('iot.node')}:</b> {t('iot.nodeSpec')}<br /><b>{t('iot.gateway')}:</b> {t('iot.gatewaySpec')}<br /><b>{t('iot.power')}:</b> {t('iot.powerSpec')}</p>
        <p>{t('iot.pilot')}</p>
      </details>
    </section>
  )
}
