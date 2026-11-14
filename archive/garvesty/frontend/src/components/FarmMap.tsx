import { useEffect, useMemo, useState } from 'react'
import L from 'leaflet'
import {
  CircleMarker,
  GeoJSON,
  MapContainer,
  Marker,
  Polygon,
  Polyline,
  TileLayer,
  Tooltip,
  useMap,
  useMapEvents,
} from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { t } from '../i18n'

type Fields = GeoJSON.FeatureCollection & {
  agent_base: { lat: number; lon: number; name: string }
}

export type AgentRole = 'scout' | 'water' | 'planner'

const scoutIcon = L.divIcon({
  className: 'agent-icon scout',
  html: '<div class="agent-avatar scout" title="Field Scout"><span class="avatar-glyph">🛰️</span></div>',
  iconSize: [38, 38],
  iconAnchor: [19, 19],
})

const waterIcon = L.divIcon({
  className: 'agent-icon water',
  html: '<div class="agent-avatar water" title="Water Analyst"><span class="avatar-glyph">💧</span></div>',
  iconSize: [38, 38],
  iconAnchor: [19, 19],
})

const plannerIcon = L.divIcon({
  className: 'agent-icon planner',
  html: '<div class="agent-avatar planner" title="Crop Planner"><span class="avatar-glyph">🌱</span></div>',
  iconSize: [38, 38],
  iconAnchor: [19, 19],
})

const baseIcon = L.divIcon({
  className: 'base-icon',
  html: '<div class="base-dot"></div>',
  iconSize: [14, 14],
  iconAnchor: [7, 7],
})

function gibsUrl() {
  const d = new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10)
  return `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_NOAA20_CorrectedReflectance_TrueColor/default/${d}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpg`
}

function FitToFields({ fields }: { fields: Fields }) {
  const map = useMap()
  useEffect(() => {
    const bounds = L.geoJSON(fields).getBounds()
    if (bounds.isValid()) map.fitBounds(bounds.pad(0.2))
  }, [fields, map])
  return null
}

function MapClickHandler({
  drawing,
  onAddVertex,
}: {
  drawing: boolean
  onAddVertex: (pt: [number, number]) => void
}) {
  useMapEvents({
    click(e) {
      if (drawing) {
        onAddVertex([e.latlng.lat, e.latlng.lng])
      }
    },
  })
  return null
}

interface Props {
  fields: Fields
  selectedId: string | null
  agentPos: [number, number] | null
  route: [number, number][] | null
  scanning: boolean
  drawing: boolean
  drawnPoints: [number, number][]
  agentRole?: AgentRole
  onSelect: (id: string) => void
  onAddVertex: (pt: [number, number]) => void
}

export function FarmMap({
  fields,
  selectedId,
  agentPos,
  route,
  scanning,
  drawing,
  drawnPoints,
  agentRole = 'scout',
  onSelect,
  onAddVertex,
}: Props) {
  const [layer, setLayer] = useState<'map' | 'sat'>('map')
  const [tiles, setTiles] = useState({ loaded: 0, errors: 0 })
  const tilesFailed = tiles.errors > 0 && tiles.loaded === 0
  const tileEvents = {
    tileerror: () => setTiles((s) => ({ ...s, errors: s.errors + 1 })),
    tileload: () => setTiles((s) => ({ ...s, loaded: s.loaded + 1 })),
  }
  const switchLayer = (l: 'map' | 'sat') => {
    setTiles({ loaded: 0, errors: 0 })
    setLayer(l)
  }
  const satUrl = useMemo(gibsUrl, [])
  const selected = fields.features.find((f) => f.properties?.id === selectedId)
  const base: [number, number] = [fields.agent_base.lat, fields.agent_base.lon]

  const currentAgentIcon =
    agentRole === 'water' ? waterIcon : agentRole === 'planner' ? plannerIcon : scoutIcon

  return (
    <div className={`map-wrap ${tilesFailed ? 'tiles-failed' : ''} ${drawing ? 'drawing-active' : ''}`}>
      <MapContainer
        center={base}
        zoom={13}
        zoomControl={true}
        className="map"
      >
        <FitToFields fields={fields} />
        <MapClickHandler drawing={drawing} onAddVertex={onAddVertex} />

        {layer === 'map' ? (
          <TileLayer
            key="map"
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
            attribution="&copy; OpenStreetMap contributors"
            eventHandlers={tileEvents}
          />
        ) : (
          <TileLayer
            key="sat"
            url={satUrl}
            maxNativeZoom={9}
            attribution="Imagery: NASA GIBS, VIIRS NOAA-20 true colour (250 m)"
            eventHandlers={tileEvents}
          />
        )}

        {/* Static and pre-defined fields */}
        <GeoJSON
          key={`${selectedId ?? 'none'}-${fields.features.length}`}
          data={fields}
          style={(f) => ({
            color: f?.properties?.id === selectedId ? '#15803D' : '#354A34',
            weight: f?.properties?.id === selectedId ? 3 : 1.5,
            fillColor: f?.properties?.id === selectedId ? '#BCEB86' : '#A7DC75',
            fillOpacity: f?.properties?.id === selectedId ? 0.6 : 0.28,
          })}
          onEachFeature={(f, lyr) => {
            lyr.on('click', () => onSelect(f.properties.id))
            lyr.bindTooltip(`${f.properties.id} · ${f.properties.name}`, { sticky: true })
          }}
        />

        {/* In-progress drawing layer */}
        {drawnPoints.length > 0 && (
          <>
            <Polyline
              positions={drawnPoints}
              pathOptions={{ color: '#7E22CE', weight: 2.5, dashArray: '5 5' }}
            />
            {drawnPoints.map((pt, idx) => (
              <CircleMarker
                key={idx}
                center={pt}
                radius={5}
                pathOptions={{
                  fillColor: idx === 0 ? '#15803D' : '#7E22CE',
                  color: '#FFFFFF',
                  weight: 2,
                  fillOpacity: 1,
                }}
              />
            ))}
            {drawnPoints.length >= 3 && (
              <Polygon
                positions={drawnPoints}
                pathOptions={{
                  fillColor: '#F3E8FF',
                  fillOpacity: 0.35,
                  stroke: false,
                }}
              />
            )}
          </>
        )}

        <Marker position={base} icon={baseIcon} interactive={false}>
          <Tooltip direction="top" offset={[0, -6]}>
            {fields.agent_base.name}
          </Tooltip>
        </Marker>

        {route && (
          <Polyline
            positions={route}
            pathOptions={{ color: '#1B3213', weight: 2.5, dashArray: '4 6', opacity: 0.8 }}
          />
        )}

        {scanning && selected && (
          <CircleMarker
            center={selected.properties!.centroid}
            radius={28}
            pathOptions={{
              color: '#15803D',
              weight: 2,
              fillOpacity: 0.12,
              className: 'scan-pulse',
            }}
          />
        )}

        {agentPos && (
          <Marker
            position={agentPos}
            icon={currentAgentIcon}
            interactive={false}
            zIndexOffset={1000}
          />
        )}
      </MapContainer>

      {/* Floating Refraction Controls */}
      <div className="layer-switch glass-panel" role="group" aria-label="Base layer">
        <button
          className={layer === 'map' ? 'on' : ''}
          onClick={() => switchLayer('map')}
        >
          {t('baseMap')}
        </button>
        <button
          className={layer === 'sat' ? 'on' : ''}
          onClick={() => switchLayer('sat')}
        >
          {t('satellite')}
        </button>
      </div>

      {drawing && (
        <div className="drawing-banner glass-panel">
          <span>Click on map to place field boundary vertices ({drawnPoints.length} points)</span>
        </div>
      )}
    </div>
  )
}
