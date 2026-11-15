// AI-assisted: Claude Code
// Step 5: the field shown back, read from the snapshot (no form), and the cross-checks
// between what the farmer said and what the satellite shows. Conflicts are shown, never hidden.
import type { SnapshotField } from '../data'
import { t } from '../i18n'
import type { Key } from '../i18n'
import { numOf } from '../planner/flow'
import type { Check, FieldFacts } from '../planner/flow'
import { Icon, StepHead, StepNav } from './PlannerUI'

function Row({ src, label, value, sub }: { src: 'nasa' | 'map'; label: string; value: string | null; sub?: string | null }) {
  return (
    <div className="fp-data-row">
      <span className={`fp-src fp-src-${src}`}>{t(`fp.src.${src}` as Key)}</span>
      <span className="fp-data-k">{label}</span>
      <span className="fp-data-v">
        {value ?? <span className="fp-missing">{t('fp.f.none')}</span>}
        {value && sub && <small>{sub}</small>}
      </span>
    </div>
  )
}

export function FieldReadings({ field, facts }: { field: SnapshotField; facts: FieldFacts }) {
  const v = field.values
  const smap = numOf(v, 'smap_soil_moisture')
  const imerg = numOf(v, 'imerg_rain_30d')
  const ndvi = numOf(v, 'ndvi')
  const ph = numOf(v, 'soil_ph')
  const clay = numOf(v, 'clay_pct')
  return (
    <div className="fp-data">
      <Row src="nasa" label={t('fp.f.moist')}
        value={facts.gwetroot === null ? null : `${t(`fp.wet.${facts.wet}` as Key)} · ${facts.gwetroot.toFixed(2)}`}
        sub={`NASA POWER GWETROOT · ${v.gwetroot?.period ?? ''}`} />
      <Row src="nasa" label={t('fp.f.smap')} value={smap === null ? null : `${smap.toFixed(2)} m³/m³`}
        sub={`SMAP · ${v.smap_soil_moisture?.period ?? ''}`} />
      <Row src="nasa" label={t('fp.f.rain')} value={facts.rain30 === null ? null : `${Math.round(facts.rain30)} mm`}
        sub={facts.rainNormal === null ? 'NASA POWER' : `${t('fp.f.rainVs', { n: Math.round(facts.rainNormal) })} · NASA POWER`} />
      <Row src="nasa" label={t('fp.f.imerg')} value={imerg === null ? null : `${Math.round(imerg)} mm`}
        sub={`GPM IMERG · ${v.imerg_rain_30d?.period ?? ''}`} />
      <Row src="nasa" label={t('fp.f.ndvi')} value={ndvi === null ? null : ndvi.toFixed(2)}
        sub={`MODIS NDVI · ${v.ndvi?.period ?? ''}`} />
      <Row src="map" label={t('fp.f.ph')} value={ph === null ? null : String(ph)}
        sub={`${clay === null ? '' : t('fp.f.clay', { c: Math.round(clay) }) + ' · '}ISRIC SoilGrids`} />
    </div>
  )
}

export function CheckList({ checks, onGoto }: { checks: Check[]; onGoto?: (step: number) => void }) {
  if (checks.length === 0) return null
  return (
    <ul className="fp-checks">
      {checks.map((c) => (
        <li key={c.id} className={`fp-check fp-check-${c.kind}`}>
          <span className="fp-check-kind">
            <Icon name={c.kind === 'agree' ? 'check' : c.kind === 'gap' ? 'question' : 'sat'} size={18} />
            {t(`fp.chk.${c.kind}` as Key)}
          </span>
          <p>{t(`fp.chk.${c.id}` as Key, {
            ...c.params,
            record: c.params.record ? t(`fp.irr.${c.params.record}` as Key) : undefined,
            said: c.params.said ? t(`fp.irr.${c.params.said}` as Key) : undefined,
          })}</p>
          {onGoto && c.kind !== 'agree' && c.step < 5 && (
            <button type="button" className="fp-link" onClick={() => onGoto(c.step)}>{t('fp.change')}</button>
          )}
        </li>
      ))}
    </ul>
  )
}

export function FieldCheck({ field, facts, checks, onNext, onBack }: {
  field: SnapshotField; facts: FieldFacts; checks: Check[]; onNext: () => void; onBack: () => void
}) {
  return (
    <section className="fp-screen">
      <StepHead title={t('fp.q5')} />
      <div className="fp-fieldcard">
        <Icon name="pin" />
        <div>
          <b>{field.name}</b>
          <small>{t('fp.f.near', { town: field.town_name })}</small>
        </div>
      </div>
      <FieldReadings field={field} facts={facts} />
      <CheckList checks={checks} />
      <StepNav onBack={onBack} onNext={onNext} nextLabel={t('fp.mine')} />
    </section>
  )
}
