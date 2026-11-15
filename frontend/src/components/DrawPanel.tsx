// AI-assisted: Claude Code
// Overlay on the map while the farmer draws their own field: tap corners, see the area, name it.
import { useState } from 'react'
import { t } from '../i18n'
import { areaAcres, outline } from '../userfields'
import type { LatLng, UserField } from '../userfields'
import type { FieldCheck, Ground } from '../landcover'

type Irrigation = UserField['irrigation']

/** Shown instead of advice where nothing can be planted: river, forest hills, town, wetland. */
export function NotPlantable({ ground, year, compact = false }: { ground: Ground; year?: string; compact?: boolean }) {
  return (
    <div className={`not-plantable${compact ? ' compact' : ''}`} role="alert">
      <b>{t('land.title')}</b>
      <p>{t(`land.${ground}` as never)}</p>
      {year && <small>{t('land.source', { y: year })}</small>}
    </div>
  )
}

export function DrawPanel({ draft, check, landYear, onUndo, onCancel, onSave }: {
  draft: LatLng[]
  check: FieldCheck
  landYear?: string
  onUndo: () => void
  onCancel: () => void
  onSave: (name: string, irrigation: Irrigation) => void
}) {
  const [step, setStep] = useState<'corners' | 'details'>('corners')
  const [name, setName] = useState('')
  const [irrigation, setIrrigation] = useState<Irrigation | null>(null)
  const acres = Math.round(areaAcres(outline(draft)) * 10) / 10
  const canFinish = draft.length >= 3 && check.plantable

  return (
    <div className="draw-panel" role="dialog" aria-label={t('draw.title')}>
      {step === 'corners' ? (
        <>
          <b className="draw-title">{t('draw.title')}</b>
          <p>{t('draw.help')}</p>
          <div className="draw-stats">
            <span>{t('draw.corners', { n: draft.length })}</span>
            {draft.length >= 3 && check.plantable && <b>{t('field.acres', { a: acres })}</b>}
          </div>
          {draft.length > 0 && !check.plantable && <NotPlantable ground={check.ground} year={landYear} compact />}
          {draft.length > 0 && check.plantable && <p className="plantable-ok" role="status">✓ {t('land.ok')}</p>}
          <div className="draw-actions">
            <button className="btn ghost" onClick={onUndo} disabled={draft.length === 0}>{t('draw.undo')}</button>
            <button className="btn ghost" onClick={onCancel}>{t('draw.cancel')}</button>
            <button className="btn primary" onClick={() => setStep('details')} disabled={!canFinish}>{t('draw.done')}</button>
          </div>
        </>
      ) : (
        <>
          <b className="draw-title">{t('field.acres', { a: acres })}</b>
          <label className="draw-field">
            <span>{t('draw.name')}</span>
            <input value={name} placeholder={t('draw.namePlaceholder')} onChange={(e) => setName(e.target.value)} maxLength={40} />
          </label>
          <div className="draw-field">
            <span>{t('readings.irrigation')}</span>
            <div className="choice-row">
              {(['available', 'sometimes', 'unavailable'] as Irrigation[]).map((v) => (
                <button key={v} className={`choice ${irrigation === v ? 'on' : ''}`} aria-pressed={irrigation === v}
                  onClick={() => setIrrigation(v)}>{t(`irr.${v}` as never)}</button>
              ))}
            </div>
          </div>
          <div className="draw-actions">
            <button className="btn ghost" onClick={() => setStep('corners')}>{t('draw.back')}</button>
            <button className="btn primary" disabled={!irrigation}
              onClick={() => onSave(name.trim() || t('draw.namePlaceholder'), irrigation!)}>{t('draw.save')}</button>
          </div>
          <p className="draw-note">{t('mine.note')}</p>
        </>
      )}
    </div>
  )
}
