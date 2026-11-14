import { useEffect, useState } from 'react'
import L from 'leaflet'
import { CircleMarker, GeoJSON, MapContainer, Marker, Polyline, TileLayer, Tooltip, useMap } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import { t } from '../i18n'

type Fields = GeoJSON.FeatureCollection & { agent_base: { lat: number; lon: number; name: string } }

const agentIcon = L.divIcon({ className: 'agent-icon', html: '<div class="agent-dot"><span>▲</span></div>', iconSize: [34, 34], iconAnchor: [17, 17] })
const baseIcon = L.divIcon({ className: 'base-icon', html: '<div class="base-dot"></div>', iconSize: [14, 14], iconAnchor: [7, 7] })

// High-resolution satellite basemap (no key needed). Real detail to zoom 18 in this area; above that it upscales.
const SAT_URL = 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'

function FitToFields({ fields }: { fields: Fields }) {
  const map = useMap()
  useEffect(() => {
    const bounds = L.geoJSON(fields).getBounds()
    if (bounds.isValid()) map.fitBounds(bounds.pad(0.25))
  }, [fields, map])
  return null
}

interface Props {
  fields: Fields
  selectedId: string | null
  agentPos: [number, number] | null
  route: [number, number][] | null
  scanning: boolean
  onSelect: (id: string) => void
}

export function FarmMap({ fields, selectedId, agentPos, route, scanning, onSelect }: Props) {
  const [layer, setLayer] = useState<'map' | 'sat'>('map')
  // Tiles count as failed only while errors have happened and none has loaded.
  const [tiles, setTiles] = useState({ loaded: 0, errors: 0 })
  const tilesFailed = tiles.errors > 0 && tiles.loaded === 0
  const tileEvents = {
    tileerror: () => setTiles((s) => ({ ...s, errors: s.errors + 1 })),
    tileload: () => setTiles((s) => ({ ...s, loaded: s.loaded + 1 })),
  }
  const switchLayer = (l: 'map' | 'sat') => { setTiles({ loaded: 0, errors: 0 }); setLayer(l) }
  const selected = fields.features.find((f) => f.properties?.id === selectedId)
  const base: [number, number] = [fields.agent_base.lat, fields.agent_base.lon]

  return (
    <div className={`map-wrap ${tilesFailed ? 'tiles-failed' : ''}`}>
      <MapContainer center={base} zoom={13} zoomControl={true} className="map">
        <FitToFields fields={fields} />
        {layer === 'map' && (
          <TileLayer
            key="map"
            url="https://tile.openstreetmap.org/{z}/{x}/{y}.png"
            maxZoom={19}
            attribution="&copy; OpenStreetMap contributors"
            eventHandlers={tileEvents}
          />
        )}
        {layer === 'sat' && (
          <TileLayer
            key="sat"
            url={SAT_URL}
            maxZoom={19}
            maxNativeZoom={18}
            attribution="Imagery: Esri, Maxar, Earthstar Geographics"
            eventHandlers={tileEvents}
          />
        )}
        <GeoJSON
          key={selectedId ?? 'none'}
          data={fields}
          style={(f) => ({
            color: f?.properties?.id === selectedId ? '#c2410c' : '#1f5f3a',
            weight: f?.properties?.id === selectedId ? 3 : 2,
            fillColor: f?.properties?.id === selectedId ? '#fdba74' : '#7fb88f',
            fillOpacity: 0.45,
          })}
          onEachFeature={(f, lyr) => {
            lyr.on('click', () => onSelect(f.properties.id))
            lyr.bindTooltip(`${f.properties.id} · ${f.properties.name}`, { sticky: true })
          }}
        />
        <Marker position={base} icon={baseIcon} interactive={false}>
          <Tooltip direction="top" offset={[0, -6]}>{fields.agent_base.name}</Tooltip>
        </Marker>
        {route && <Polyline positions={route} pathOptions={{ color: '#1f3d2b', weight: 2, dashArray: '4 6', opacity: 0.7 }} />}
        {scanning && selected && (
          <CircleMarker
            center={selected.properties!.centroid}
            radius={26}
            pathOptions={{ color: '#c2410c', weight: 2, fillOpacity: 0.08, className: 'scan-pulse' }}
          />
        )}
        {agentPos && <Marker position={agentPos} icon={agentIcon} interactive={false} zIndexOffset={1000} />}
      </MapContainer>
      <div className="layer-switch" role="group" aria-label="Base layer">
        <button className={layer === 'map' ? 'on' : ''} onClick={() => switchLayer('map')}>{t('baseMap')}</button>
        <button className={layer === 'sat' ? 'on' : ''} onClick={() => switchLayer('sat')}>{t('satellite')}</button>
      </div>
      {tilesFailed && <div className="tiles-note">{t('tilesOffline')}</div>}
    </div>
  )
}
