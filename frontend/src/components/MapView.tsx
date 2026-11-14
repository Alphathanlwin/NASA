// AI-assisted: Claude Code
import { useEffect, useRef, useState } from 'react'
import { CircleMarker, MapContainer, Polygon, Polyline, TileLayer, Tooltip, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import type { Snapshot } from '../data'
import { t } from '../i18n'

// CARTO's keyless light basemap was retired in 2026 (tiles now carry an "API KEY REQUIRED"
// watermark), so the public build uses OpenStreetMap's keyless tiles instead.
const BASE = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
const GIBS_DATE = '2026-01-10'
const GIBS =
  `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/MODIS_Terra_CorrectedReflectance_TrueColor/default/${GIBS_DATE}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`
// High-resolution imagery for the "Satellite" view. Esri World Imagery is not a NASA product;
// it is credited on the map. NASA imagery stays available as its own layer (GIBS, 250 m).
const ESRI =
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
type Layer = 'map' | 'satellite' | 'nasa'
const BASE_STYLE = { color: '#1f3d2b', weight: 1.6, opacity: 0.7, dashArray: '3 3', fillOpacity: 0.08 }
const ACTIVE_STYLE = { color: '#1f6b43', weight: 2.6, opacity: 1, fillColor: '#2e7d4f', fillOpacity: 0.28 }
// On imagery the outlines need to be bright to stay visible.
const BASE_STYLE_IMG = { ...BASE_STYLE, color: '#ffffff', opacity: 0.9, fillOpacity: 0.05 }
const ACTIVE_STYLE_IMG = { ...ACTIVE_STYLE, color: '#facc15', fillColor: '#facc15', fillOpacity: 0.18 }

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

export function MapView({ snap, selectedId, onSelect, agentRun, runId }: {
  snap: Snapshot
  selectedId: string | null
  onSelect: (id: string) => void
  agentRun: { waypoints: [number, number][] } | null
  runId: number
}) {
  const [layer, setLayer] = useState<Layer>('map')
  const imagery = layer !== 'map'
  const [tileErrors, setTileErrors] = useState(0)
  const selected = selectedId ? snap.fields[selectedId] : null
  const center: [number, number] = selected ? selected.centroid : [16.7, 95.2]
  const feature = selectedId ? snap.geojson.features.find((f) => f.id === selectedId) : null
  const selectedCoords = feature
    ? feature.geometry.coordinates[0].map(([lon, lat]) => [lat, lon] as [number, number])
    : null

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
          {(['map', 'satellite', 'nasa'] as Layer[]).map((l) => (
            <button key={l} className={layer === l ? 'active' : ''} aria-pressed={layer === l}
              onClick={() => { setTileErrors(0); setLayer(l) }}>
              {t(l === 'map' ? 'map.layerMap' : l === 'satellite' ? 'map.layerSatellite' : 'map.layerNasa')}
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
          {!tilesDown && layer === 'nasa' && (
            <TileLayer key="nasa" url={GIBS} attribution={t('map.attributionNasa')}
              eventHandlers={{ tileerror: tileError }} maxNativeZoom={9} maxZoom={18} />
          )}
          {snap.geojson.features.map((f) => {
            const active = f.id === selectedId
            const coords = f.geometry.coordinates[0].map(([lon, lat]) => [lat, lon] as [number, number])
            return (
              <Polygon
                key={f.id}
                positions={coords}
                pathOptions={imagery ? (active ? ACTIVE_STYLE_IMG : BASE_STYLE_IMG) : (active ? ACTIVE_STYLE : BASE_STYLE)}
                eventHandlers={{ click: () => onSelect(f.id) }}
              >
                <Tooltip sticky>
                  <b>{f.properties.name}</b>
                  <br />
                  {t('field.acres', { a: f.properties.area_acres })}
                </Tooltip>
              </Polygon>
            )
          })}
          {agentRun && <AgentTrace waypoints={agentRun.waypoints} runId={runId} />}
          <CircleMarker center={[snap.geojson.agent_base.lat, snap.geojson.agent_base.lon]} radius={4}
            pathOptions={{ color: '#1d4ed8', fillColor: '#1d4ed8', fillOpacity: 1 }}>
            <Tooltip>{snap.geojson.agent_base.name}</Tooltip>
          </CircleMarker>
          <FitField coords={selectedCoords} />
        </MapContainer>
        {layer === 'nasa' && <div className="map-caption">{t('map.fixedDate', { d: GIBS_DATE })}</div>}
        {layer === 'satellite' && <div className="map-caption">{t('map.esriNote')}</div>}
        {tilesDown && (
          <div className="map-offline">
            <b>{t('map.offline')}</b>
            <span>{t('map.attribution')}</span>
          </div>
        )}
      </div>
      <div className="map-foot">
        {layer === 'map' ? t('map.attribution') : layer === 'satellite' ? t('map.attributionEsri') : t('map.attributionNasa')}
      </div>
    </section>
  )
}
