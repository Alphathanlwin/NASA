// AI-assisted: Claude Code
import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { CircleMarker, MapContainer, Polygon, Polyline, TileLayer, Tooltip, useMap, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import type { Snapshot, SnapshotField } from '../data'
import type { runPlans } from '../data'
import type { LatLng, UserField } from '../userfields'
import { t } from '../i18n'
import type { Key } from '../i18n'
import { Icon } from './Sidebar'
import { CropArt } from './CropArt'

// CARTO's keyless light basemap was retired in 2026 (tiles now carry an "API KEY REQUIRED"
// watermark), so the public build uses OpenStreetMap's keyless tiles instead.
const BASE = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
// High-resolution imagery for the "Satellite" view. Esri World Imagery is not a NASA product;
// it is credited on the map.
const ESRI =
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
type Layer = 'map' | 'satellite'
const BASE_STYLE = { color: '#1f3d2b', weight: 1.6, opacity: 0.7, dashArray: '3 3', fillOpacity: 0.08 }
const ACTIVE_STYLE = { color: '#1f6b43', weight: 2.6, opacity: 1, fillColor: '#2e7d4f', fillOpacity: 0.28 }
// On imagery the outlines need to be bright to stay visible.
const BASE_STYLE_IMG = { ...BASE_STYLE, color: '#ffffff', opacity: 0.9, fillOpacity: 0.05 }
const ACTIVE_STYLE_IMG = { ...ACTIVE_STYLE, color: '#facc15', fillColor: '#facc15', fillOpacity: 0.18 }

// The farmer's own fields: orange, so they never look like the demo examples.
const USER_STYLE = { color: '#c2410c', weight: 2, opacity: 0.95, fillColor: '#fb923c', fillOpacity: 0.15 }
const USER_ACTIVE = { ...USER_STYLE, weight: 3, fillOpacity: 0.3 }
const DRAFT_STYLE = { color: '#facc15', weight: 3, opacity: 1, fillColor: '#facc15', fillOpacity: 0.25, dashArray: '6 4' }

function DrawClicks({ onPoint }: { onPoint: (p: LatLng) => void }) {
  useMapEvents({ click: (e) => onPoint([e.latlng.lat, e.latlng.lng]) })
  return null
}

/** When drawing starts, zoom close to the current field so one paddy is several taps wide. */
function DrawFocus({ center }: { center: LatLng }) {
  const map = useMap()
  useEffect(() => { map.setView(center, 16, { animate: !matchMedia('(prefers-reduced-motion: reduce)').matches }) }, [map, center])
  return null
}

function FitField({ coords }: { coords: [number, number][] | null }) {
  const map = useMap()
  useEffect(() => {
    const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches
    if (coords && coords.length > 2) {
      if (reduced) map.fitBounds(coords, { padding: [40, 40], maxZoom: 15, animate: false })
      else map.flyToBounds(coords, { padding: [40, 40], maxZoom: 15, duration: 0.7 })
    } else {
      if (reduced) map.setView([16.7, 95.2], 9, { animate: false })
      else map.flyTo([16.7, 95.2], 9, { duration: 0.7 })
    }
  }, [coords, map])
  return null
}

function ResizeMap() {
  const map = useMap()
  useEffect(() => {
    const observer = new ResizeObserver(() => map.invalidateSize({ animate: false, debounceMoveend: true }))
    observer.observe(map.getContainer())
    return () => observer.disconnect()
  }, [map])
  return null
}

function ease(x: number) {
  return x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2
}

/** Animates a dot along the scripted waypoints. This visualises analysis steps, not a vehicle. */
function AgentTrace({ waypoints, runId }: { waypoints: [number, number][]; runId: number }) {
  const [pos, setPos] = useState<[number, number] | null>(null)
  const raf = useRef(0)
  useEffect(() => {
    if (!waypoints.length) return
    if (waypoints.length === 1 || matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setPos(waypoints[waypoints.length - 1])
      return
    }
    const start = performance.now()
    const duration = 2200
    const step = (now: number) => {
      const k = Math.min(1, (now - start) / duration)
      const at = ease(k) * (waypoints.length - 1)
      const i = Math.min(waypoints.length - 2, Math.floor(at))
      const f = at - i
      const a = waypoints[i]
      const b = waypoints[Math.min(i + 1, waypoints.length - 1)]
      setPos([a[0] + (b[0] - a[0]) * f, a[1] + (b[1] - a[1]) * f])
      if (k < 1) raf.current = requestAnimationFrame(step)
    }
    raf.current = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf.current)
  }, [waypoints, runId])

  if (!waypoints.length) return null
  return (
    <>
      <Polyline positions={waypoints} pathOptions={{ color: '#b45309', weight: 1.6, dashArray: '5 6', opacity: 0.75 }} />
      {pos && (
        <CircleMarker center={pos} radius={7} pathOptions={{ color: '#fff', weight: 2, fillColor: '#b45309', fillOpacity: 1 }}>
          <Tooltip direction="top">{t('agent.metaphor')}</Tooltip>
        </CircleMarker>
      )}
    </>
  )
}

export function MapView({ snap, selectedId, onSelect, agentRun, runId, userFields = [], drawing = false,
  draft = [], onDraftPoint, overlay, initialLayer = 'map', compact = false, rotation, fieldOptions, details, scenario }: {
  snap: Snapshot
  selectedId: string | null
  onSelect: (id: string) => void
  agentRun: { waypoints: [number, number][] } | null
  runId: number
  userFields?: UserField[]
  drawing?: boolean
  draft?: LatLng[]
  onDraftPoint?: (p: LatLng) => void
  overlay?: ReactNode
  initialLayer?: Layer
  compact?: boolean
  rotation: { fieldName: string; previous?: string; next: ReturnType<typeof runPlans>['plans'] }
  fieldOptions: SnapshotField[]
  details: ReactNode
  scenario: ReactNode
}) {
  const surface = useRef<HTMLDialogElement>(null)
  const expandButton = useRef<HTMLButtonElement>(null)
  const [expanded, setExpanded] = useState(false)
  const [panel, setPanel] = useState<'details' | 'scenario' | null>(null)
  const inspector = useRef<HTMLElement>(null)
  useEffect(() => {
    if (expanded && panel) inspector.current?.focus({ preventScroll: true })
  }, [expanded, panel])
  const toggleExpanded = () => {
    const dialog = surface.current
    if (!dialog) return
    dialog.close()
    if (expanded) dialog.show()
    else dialog.showModal()
    setExpanded(!expanded)
    expandButton.current?.focus()
  }
  const [layer, setLayer] = useState<Layer>(initialLayer)
  // Fields are easiest to trace on imagery, so drawing switches to the satellite view.
  useEffect(() => { if (drawing) setLayer('satellite') }, [drawing])
  const imagery = layer !== 'map'
  const [tileErrors, setTileErrors] = useState(0)
  const selected = selectedId ? snap.fields[selectedId] : null
  const center: [number, number] = selected ? selected.centroid : [16.7, 95.2]
  const feature = selectedId ? snap.geojson.features.find((f) => f.id === selectedId) : null
  const userSelected = userFields.find((u) => u.id === selectedId)
  const selectedCoords = useMemo(() => feature
    ? feature.geometry.coordinates[0].map(([lon, lat]) => [lat, lon] as LatLng)
    : userSelected?.points ?? null, [feature, userSelected])

  const tileError = () => setTileErrors((n) => n + 1)
  const tilesDown = tileErrors > 6
  const cropName = (crop: string) => t(`crop.${crop}` as Key)

  return (
    <section className="map-card" aria-label={t('map.title')}>
      <dialog open ref={surface} className={`map-surface${expanded ? ' is-expanded' : ''}`}
        role={expanded ? 'dialog' : 'group'} aria-label={t('map.title')} onCancel={(event) => {
          event.preventDefault()
          if (expanded) toggleExpanded()
        }}>
      <div className="map-toolbar">
        {(!compact || expanded) && (
          <div className="map-title">
            <b>{t('map.title')}</b>
            {!expanded && <span>{t('app.region')}</span>}
          </div>
        )}
        {expanded && (
          <select className="map-field-select" aria-label={t('field.choose')} value={selectedId ?? ''}
            onChange={(event) => onSelect(event.target.value)}>
            {fieldOptions.map((field) => <option key={field.id} value={field.id}>{field.name}</option>)}
          </select>
        )}
        <div className="layer-seg" role="group" aria-label={t('map.layers')}>
          {(['map', 'satellite'] as Layer[]).map((l) => (
            <button key={l} className={layer === l ? 'active' : ''} aria-pressed={layer === l}
              onClick={() => { setTileErrors(0); setLayer(l) }}>
              {t(l === 'map' ? 'map.layerMap' : 'map.layerSatellite')}
            </button>
          ))}
        </div>
      </div>

      <div className="map-workspace">
      <div className="map-box">
        {!drawing && (
          <button ref={expandButton} type="button" className="map-expand" aria-expanded={expanded}
            onClick={toggleExpanded}>
            <Icon size={17} d={expanded ? 'M4 9h5V4m11 5h-5V4M4 15h5v5m11-5h-5v5' : 'M9 4H4v5m11-5h5v5M9 20H4v-5m11 5h5v-5'} />
            {t(expanded ? 'map.collapse' : 'map.expand')}
          </button>
        )}
        <MapContainer center={center} zoom={selected ? 12 : 9} scrollWheelZoom className="leaflet-host">
          <ResizeMap />
          {!tilesDown && layer === 'map' && (
            <TileLayer key="map" url={BASE} attribution={t('map.attribution')}
              eventHandlers={{ tileerror: tileError }} maxZoom={19} />
          )}
          {!tilesDown && layer === 'satellite' && (
            <TileLayer key="satellite" url={ESRI} attribution={t('map.attributionEsri')}
              eventHandlers={{ tileerror: tileError }} maxNativeZoom={17} maxZoom={19} />
          )}
          {snap.geojson.features.map((f) => {
            const active = f.id === selectedId
            const coords = f.geometry.coordinates[0].map(([lon, lat]) => [lat, lon] as [number, number])
            return (
              <Polygon
                key={f.id}
                positions={coords}
                pathOptions={imagery ? (active ? ACTIVE_STYLE_IMG : BASE_STYLE_IMG) : (active ? ACTIVE_STYLE : BASE_STYLE)}
                eventHandlers={{ click: () => { if (!drawing) onSelect(f.id) } }}
                interactive={!drawing}
              >
                <Tooltip sticky>
                  <b>{f.properties.name}</b>
                  <br />
                  {t('field.acres', { a: f.properties.area_acres })}
                </Tooltip>
              </Polygon>
            )
          })}
          {userFields.map((u) => (
            <Polygon key={u.id} positions={u.points} interactive={!drawing}
              pathOptions={u.id === selectedId ? USER_ACTIVE : USER_STYLE}
              eventHandlers={{ click: () => { if (!drawing) onSelect(u.id) } }}>
              <Tooltip sticky><b>{u.name}</b><br />{t('mine.badge')}</Tooltip>
            </Polygon>
          ))}
          {drawing && onDraftPoint && <DrawClicks onPoint={onDraftPoint} />}
          {drawing && <DrawFocus center={center} />}
          {drawing && draft.length >= 3 && <Polygon positions={draft} pathOptions={DRAFT_STYLE} interactive={false} />}
          {drawing && draft.length === 2 && <Polyline positions={draft} pathOptions={DRAFT_STYLE} interactive={false} />}
          {drawing && draft.map((p, i) => (
            <CircleMarker key={i} center={p} radius={6} interactive={false}
              pathOptions={{ color: '#fff', weight: 2, fillColor: '#facc15', fillOpacity: 1 }} />
          ))}
          {!drawing && agentRun && <AgentTrace waypoints={agentRun.waypoints} runId={runId} />}
          <CircleMarker center={[snap.geojson.agent_base.lat, snap.geojson.agent_base.lon]} radius={4}
            pathOptions={{ color: '#1d4ed8', fillColor: '#1d4ed8', fillOpacity: 1 }}>
            <Tooltip>{snap.geojson.agent_base.name}</Tooltip>
          </CircleMarker>
          {!drawing && <FitField coords={selectedCoords} />}
        </MapContainer>
        {overlay}
        {tilesDown && (
          <div className="map-offline">
            <b>{t('map.offline')}</b>
            <span>{t(imagery ? 'map.attributionEsri' : 'map.attribution')}</span>
          </div>
        )}
      </div>
      {expanded && panel && (
        <section className="map-inspector" aria-label={t(panel === 'details' ? 'glance.open' : 'map.tryScenario')}
          tabIndex={0} id="map-inspector" ref={inspector}>
          {panel === 'details' ? details : (
            <>
              <div className="map-inspector-heading">
                <strong>{rotation.fieldName}</strong>
                <p>{t('map.scenarioScope')}</p>
              </div>
              {scenario}
            </>
          )}
        </section>
      )}
      </div>
      {expanded && (
        <section className="map-rotation" aria-label={t('rec.title')}>
          <div className="map-crop-card">
            {rotation.previous && <CropArt crop={rotation.previous} size={42} />}
            <div>
              <span>{t('map.previousCrop')}</span>
              <strong>{rotation.previous ? cropName(rotation.previous) : t('map.noCrop')}</strong>
              <small>{rotation.fieldName}</small>
            </div>
          </div>
          {rotation.next.map((plan) => (
            <div className="map-crop-card map-crop-next" key={plan.id}>
              <CropArt crop={plan.dry_crop} size={42} />
              <div>
                <span>{t('tile.next')}{rotation.next.length > 1 ? ` · ${t('rec.tie')}` : ''}</span>
                <strong>{cropName(plan.dry_crop)}</strong>
                <small>{t(`cat.${plan.category}` as Key)} · {Math.round(plan.score)}/100</small>
                <small>{t('overview.sow', { d: plan.calendar.sow })}</small>
              </div>
            </div>
          ))}
          {!rotation.next.length && <div className="map-crop-card"><div><span>{t('tile.next')}</span><strong>{t('map.noCrop')}</strong></div></div>}
          <div className="map-workspace-actions">
            <button type="button" aria-expanded={panel === 'details'} aria-controls={panel === 'details' ? 'map-inspector' : undefined}
              onClick={() => setPanel(panel === 'details' ? null : 'details')}>{t('glance.open')}</button>
            <button type="button" aria-expanded={panel === 'scenario'} aria-controls={panel === 'scenario' ? 'map-inspector' : undefined}
              onClick={() => setPanel(panel === 'scenario' ? null : 'scenario')}>{t('map.tryScenario')}</button>
          </div>
        </section>
      )}
      <div className="map-foot">
        {layer === 'map' ? t('map.attribution') : t('map.attributionEsri')}
      </div>
      </dialog>
    </section>
  )
}
