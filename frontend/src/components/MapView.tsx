// AI-assisted: Claude Code
import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import { CircleMarker, MapContainer, Polygon, Polyline, TileLayer, Tooltip, useMap, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import type { Snapshot } from '../data'
import type { LatLng, UserField } from '../userfields'
import { t } from '../i18n'

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

function FitField({ coords }: { coords: [number, number][] | null }) {
  const map = useMap()
  useEffect(() => {
    if (coords && coords.length > 2) {
      map.flyToBounds(coords as never, { padding: [40, 40], maxZoom: 15, duration: 0.7 })
    } else {
      map.flyTo([16.7, 95.2], 9, { duration: 0.7 })
    }
  }, [coords, map])
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
  draft = [], onDraftPoint, overlay }: {
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
}) {
  const [layer, setLayer] = useState<Layer>('map')
  // Fields are easiest to trace on imagery, so drawing switches to the satellite view.
  useEffect(() => { if (drawing) setLayer('satellite') }, [drawing])
  const imagery = layer !== 'map'
  const [tileErrors, setTileErrors] = useState(0)
  const selected = selectedId ? snap.fields[selectedId] : null
  const center: [number, number] = selected ? selected.centroid : [16.7, 95.2]
  const feature = selectedId ? snap.geojson.features.find((f) => f.id === selectedId) : null
  const userSelected = userFields.find((u) => u.id === selectedId)
  const selectedCoords = feature
    ? feature.geometry.coordinates[0].map(([lon, lat]) => [lat, lon] as [number, number])
    : userSelected ? userSelected.points : null

  const tileError = () => setTileErrors((n) => n + 1)
  const tilesDown = tileErrors > 6

  return (
    <section className="map-card" aria-label={t('map.title')}>
      <div className="map-toolbar">
        <div className="map-title">
          <b>{t('map.title')}</b>
          <span>{t('app.region')}</span>
        </div>
        <div className="layer-seg" role="group" aria-label={t('map.layers')}>
          {(['map', 'satellite'] as Layer[]).map((l) => (
            <button key={l} className={layer === l ? 'active' : ''} aria-pressed={layer === l}
              onClick={() => { setTileErrors(0); setLayer(l) }}>
              {t(l === 'map' ? 'map.layerMap' : 'map.layerSatellite')}
            </button>
          ))}
        </div>
      </div>

      <div className="map-box">
        <MapContainer center={center} zoom={selected ? 12 : 9} scrollWheelZoom className="leaflet-host">
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
        {layer === 'satellite' && !drawing && <div className="map-caption">{t('map.esriNote')}</div>}
        {overlay}
        {tilesDown && (
          <div className="map-offline">
            <b>{t('map.offline')}</b>
            <span>{t('map.attribution')}</span>
          </div>
        )}
      </div>
      <div className="map-foot">
        {layer === 'map' ? t('map.attribution') : t('map.attributionEsri')}
      </div>
    </section>
  )
}
