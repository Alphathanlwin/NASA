// AI-assisted: Claude Code
// "Your field measurements": what the farmer measured or sees. Each value is USER-INPUT and,
// where the rules can use it, replaces the grid-cell estimate in the plans.
import { useEffect, useId, useState } from 'react'
import type { ReactNode } from 'react'
import { t } from '../i18n'
import type { Readings } from '../userfields'
import { PhGuideButton } from './PhGuide'
import { StatusPill } from './Provenance'

type Choice<T extends string> = { value: T; key: string }

function Choices<T extends string>({ label, hint, value, options, onChange }: {
  label: string; hint?: string; value: T | null | undefined; options: Choice<T>[]; onChange: (v: T | null) => void
}) {
  return (
    <div className="reading">
      <span className="reading-label">{label}</span>
      {hint && <small>{hint}</small>}
      <div className="choice-row">
        {options.map((o) => (
          <button key={o.value} className={`choice ${value === o.value ? 'on' : ''}`} aria-pressed={value === o.value}
            onClick={() => onChange(value === o.value ? null : o.value)}>{t(o.key as never)}</button>
        ))}
      </div>
    </div>
  )
}

function NumberInput({ label, hint, value, min, max, step, onChange, id, help }: {
  label: string; hint?: string; value: number | null | undefined; min: number; max: number; step: number
  onChange: (v: number | null) => void; id?: string; help?: ReactNode
}) {
  const auto = useId()
  const inputId = id ?? auto
  const [text, setText] = useState(value == null ? '' : String(value))
  useEffect(() => { setText(value == null ? '' : String(value)) }, [value])
  const n = text === '' ? null : Number(text)
  const bad = n !== null && (Number.isNaN(n) || n < min || n > max)
  return (
    <div className="reading">
      <span className="reading-label-row">
        <label className="reading-label" htmlFor={inputId}>{label}</label>
        {help}
      </span>
      {hint && <small>{hint}</small>}
      <input id={inputId} inputMode="decimal" value={text} className={bad ? 'invalid' : ''} aria-invalid={bad}
        onChange={(e) => {
          setText(e.target.value)
          const v = e.target.value === '' ? null : Number(e.target.value)
          if (v === null || (!Number.isNaN(v) && v >= min && v <= max)) onChange(v === null ? null : Math.round(v / step) * step)
        }} />
      {bad && <small className="invalid-note">{t('readings.range', { min, max })}</small>}
    </div>
  )
}

export function ReadingsCard({ readings, onChange, inMap }: { readings: Readings; onChange: (r: Readings) => void; inMap?: boolean }) {
  const set = (patch: Partial<Readings>) => {
    const next = { ...readings, ...patch }
    if (!next.measured_on) next.measured_on = new Date().toISOString().slice(0, 10)
    onChange(next)
  }
  const used = [readings.soil_ph, readings.moisture, readings.standing_water, readings.irrigation, readings.rain_gauge_mm]
    .filter((v) => v != null).length

  return (
    <section className="card readings-card">
      <div className="split-head">
        <div>
          <h3 id={inMap ? undefined : 'field-measurements'} tabIndex={-1}>{t('readings.title')}</h3>
        </div>
        <StatusPill status="USER-INPUT" />
      </div>

      <div className="readings-grid">
        <NumberInput label={t('readings.ph')} value={readings.soil_ph} min={3} max={10} step={0.1}
          id={inMap ? 'soil-ph-map' : 'soil-ph'} help={<PhGuideButton inputId={inMap ? 'soil-ph-map' : 'soil-ph'} />}
          onChange={(v) => set({ soil_ph: v })} />
        <Choices label={t('readings.moisture')} value={readings.moisture}
          options={[{ value: 'dry', key: 'm.dry' }, { value: 'moist', key: 'm.moist' }, { value: 'wet', key: 'm.wet' }]}
          onChange={(v) => set({ moisture: v })} />
        <Choices label={t('readings.water')} value={readings.standing_water}
          options={[{ value: 'yes', key: 'common.yes' }, { value: 'no', key: 'common.no' }]}
          onChange={(v) => set({ standing_water: v })} />
        <Choices label={t('readings.irrigation')} value={readings.irrigation}
          options={[{ value: 'available', key: 'irr.available' }, { value: 'sometimes', key: 'irr.sometimes' }, { value: 'unavailable', key: 'irr.unavailable' }]}
          onChange={(v) => set({ irrigation: v })} />
        <NumberInput label={t('readings.rain')} value={readings.rain_gauge_mm} min={0} max={2000} step={1}
          onChange={(v) => set({ rain_gauge_mm: v })} />
        <label className="reading">
          <span className="reading-label">{t('readings.date')}</span>
          <input type="date" value={readings.measured_on ?? ''} max={new Date().toISOString().slice(0, 10)}
            onChange={(e) => set({ measured_on: e.target.value || null })} />
        </label>
      </div>

      <div className="readings-foot">
        <span>{used > 0 ? t('readings.used', { n: used }) : t('readings.none')}</span>
        {used > 0 && <button className="btn ghost small" onClick={() => onChange({})}>{t('readings.clear')}</button>}
      </div>
    </section>
  )
}
