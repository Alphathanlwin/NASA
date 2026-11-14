import type * as GeoJSON from 'geojson'
import { useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { t } from '../i18n'

type Fields = GeoJSON.FeatureCollection & { agent_base: { lat: number; lon: number; name: string } }
type Layer = 'map' | 'sat'

interface Props {
  fields: Fields
  selectedId: string | null
  agentPos: [number, number] | null
  route: [number, number][] | null
  scanning: boolean
  onSelect: (id: string) => void
}

const FIELD_HEIGHT = 30 // metres, exaggerated so the blocks read as 3D
const COLORS = { field: 0x5fae7a, fieldEdge: 0x1f5f3a, selected: 0xf59e0b, selectedEdge: 0xc2410c, agent: 0xc2410c, ground: 0xece6d4 }

// NASA GIBS imagery two days back, so the daily global mosaic is complete.
const gibsDate = new Date(Date.now() - 2 * 86400000).toISOString().slice(0, 10)
const TILE_SOURCES: Record<Layer, { zoom: number; url: (z: number, x: number, y: number) => string; credit: string }> = {
  map: { zoom: 14, url: (z, x, y) => `https://tile.openstreetmap.org/${z}/${x}/${y}.png`, credit: '© OpenStreetMap contributors' },
  sat: {
    zoom: 9,
    url: (z, x, y) =>
      `https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/VIIRS_NOAA20_CorrectedReflectance_TrueColor/default/${gibsDate}/GoogleMapsCompatible_Level9/${z}/${y}/${x}.jpg`,
    credit: 'Imagery: NASA GIBS, VIIRS NOAA-20 true colour (250 m)',
  },
}

const tileX = (lon: number, z: number) => Math.floor(((lon + 180) / 360) * 2 ** z)
const tileY = (lat: number, z: number) => {
  const r = (lat * Math.PI) / 180
  return Math.floor(((1 - Math.asinh(Math.tan(r)) / Math.PI) / 2) * 2 ** z)
}
const tileLon = (x: number, z: number) => (x / 2 ** z) * 360 - 180
const tileLat = (y: number, z: number) => (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / 2 ** z))) * 180) / Math.PI

function labelSprite(text: string) {
  const canvas = document.createElement('canvas')
  canvas.width = 256
  canvas.height = 96
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = 'rgba(31,61,43,0.92)'
  ctx.beginPath()
  ctx.roundRect(8, 8, 240, 80, 20)
  ctx.fill()
  ctx.fillStyle = '#fff'
  ctx.font = '700 52px system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(text, 128, 50)
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(canvas), depthTest: false }))
  sprite.scale.set(440, 165, 1)
  sprite.renderOrder = 10
  return sprite
}

interface Scene3D {
  toWorld: (lat: number, lon: number) => THREE.Vector3
  fieldMeshes: Map<string, { mesh: THREE.Mesh; edges: THREE.LineSegments; center: THREE.Vector3 }>
  agent: THREE.Group
  routeLine: THREE.Line | null
  scene: THREE.Scene
  tiles: THREE.Group
  pulse: THREE.Mesh
  state: { scanning: boolean; selected: string | null; focus: THREE.Vector3 | null }
}

export function FarmMap({ fields, selectedId, agentPos, route, scanning, onSelect }: Props) {
  const mountRef = useRef<HTMLDivElement>(null)
  const s3 = useRef<Scene3D | null>(null)
  const onSelectRef = useRef(onSelect)
  onSelectRef.current = onSelect
  const [layer, setLayer] = useState<Layer>('map')
  const [tiles, setTiles] = useState({ loaded: 0, errors: 0 })
  const [hover, setHover] = useState<{ x: number; y: number; text: string } | null>(null)
  const tilesFailed = tiles.errors > 0 && tiles.loaded === 0

  // Build the scene once per field set.
  useEffect(() => {
    const mount = mountRef.current!
    const lat0 = fields.agent_base.lat
    const lon0 = fields.agent_base.lon
    const mLat = 111320
    const mLon = 111320 * Math.cos((lat0 * Math.PI) / 180)
    // x = east, z = south, y = up, in metres from the agent base.
    const toWorld = (lat: number, lon: number) => new THREE.Vector3((lon - lon0) * mLon, 0, -(lat - lat0) * mLat)

    const renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    mount.appendChild(renderer.domElement)

    const scene = new THREE.Scene()
    scene.background = new THREE.Color(0xdfe9e2)
    scene.fog = new THREE.Fog(0xdfe9e2, 14000, 42000)
    scene.add(new THREE.AmbientLight(0xffffff, 1.6))
    const sun = new THREE.DirectionalLight(0xffffff, 1.4)
    sun.position.set(-3000, 6000, 2500)
    scene.add(sun)

    const camera = new THREE.PerspectiveCamera(45, 1, 10, 120000)
    camera.position.set(-1200, 5200, 6800)
    const controls = new OrbitControls(camera, renderer.domElement)
    controls.enableDamping = true
    controls.maxPolarAngle = Math.PI / 2.25
    controls.minDistance = 600
    controls.maxDistance = 20000
    controls.target.set(0, 0, 0)

    // Plain ground under the tiles: what is left when tiles cannot load.
    const ground = new THREE.Mesh(new THREE.PlaneGeometry(200000, 200000).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: COLORS.ground }))
    ground.position.y = -2
    scene.add(ground)
    const tileGroup = new THREE.Group()
    scene.add(tileGroup)

    // Field blocks.
    const fieldMeshes: Scene3D['fieldMeshes'] = new Map()
    for (const f of fields.features) {
      const id = f.properties!.id as string
      const ring = (f.geometry as GeoJSON.Polygon).coordinates[0]
      const shape = new THREE.Shape(ring.map(([lon, lat]) => new THREE.Vector2((lon - lon0) * mLon, (lat - lat0) * mLat)))
      const geo = new THREE.ExtrudeGeometry(shape, { depth: FIELD_HEIGHT, bevelEnabled: false }).rotateX(-Math.PI / 2)
      const mesh = new THREE.Mesh(geo, new THREE.MeshLambertMaterial({ color: COLORS.field, transparent: true, opacity: 0.88 }))
      mesh.userData = { id, name: f.properties!.name }
      const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geo), new THREE.LineBasicMaterial({ color: COLORS.fieldEdge }))
      const [clat, clon] = f.properties!.centroid as [number, number]
      const center = toWorld(clat, clon)
      const label = labelSprite(id)
      label.position.set(center.x, FIELD_HEIGHT + 230, center.z)
      scene.add(mesh, edges, label)
      fieldMeshes.set(id, { mesh, edges, center })
    }

    // Agent base and agent.
    const base = new THREE.Mesh(new THREE.BoxGeometry(110, 60, 110), new THREE.MeshLambertMaterial({ color: 0x1f3d2b }))
    base.position.y = 30
    scene.add(base)
    const agent = new THREE.Group()
    const body = new THREE.Mesh(new THREE.ConeGeometry(70, 190, 20).rotateX(Math.PI), new THREE.MeshLambertMaterial({ color: COLORS.agent }))
    body.position.y = 150
    const head = new THREE.Mesh(new THREE.SphereGeometry(62, 20, 16), new THREE.MeshLambertMaterial({ color: 0xffffff }))
    head.position.y = 270
    const shadow = new THREE.Mesh(new THREE.CircleGeometry(80, 24).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.25 }))
    shadow.position.y = FIELD_HEIGHT + 3
    agent.add(body, head, shadow)
    agent.scale.setScalar(1.5)
    scene.add(agent)

    // Scan pulse ring.
    const pulse = new THREE.Mesh(
      new THREE.RingGeometry(0.82, 1, 48).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({ color: COLORS.selectedEdge, transparent: true, side: THREE.DoubleSide, depthWrite: false }),
    )
    pulse.visible = false
    scene.add(pulse)

    const state: Scene3D['state'] = { scanning: false, selected: null, focus: null }
    s3.current = { toWorld, fieldMeshes, agent, routeLine: null, scene, tiles: tileGroup, pulse, state }

    // Picking.
    const ray = new THREE.Raycaster()
    const pointer = new THREE.Vector2()
    const meshes = [...fieldMeshes.values()].map((f) => f.mesh)
    const pick = (e: PointerEvent) => {
      const r = renderer.domElement.getBoundingClientRect()
      pointer.set(((e.clientX - r.left) / r.width) * 2 - 1, -((e.clientY - r.top) / r.height) * 2 + 1)
      ray.setFromCamera(pointer, camera)
      return ray.intersectObjects(meshes)[0]?.object.userData as { id: string; name: string } | undefined
    }
    let down = { x: 0, y: 0 }
    const onDown = (e: PointerEvent) => { down = { x: e.clientX, y: e.clientY } }
    const onUp = (e: PointerEvent) => {
      if (Math.hypot(e.clientX - down.x, e.clientY - down.y) > 5) return // it was a drag
      const hit = pick(e)
      if (hit) onSelectRef.current(hit.id)
    }
    const onMove = (e: PointerEvent) => {
      const hit = pick(e)
      renderer.domElement.style.cursor = hit ? 'pointer' : 'grab'
      const r = renderer.domElement.getBoundingClientRect()
      setHover(hit ? { x: e.clientX - r.left, y: e.clientY - r.top, text: `${hit.id} · ${hit.name}` } : null)
    }
    renderer.domElement.addEventListener('pointerdown', onDown)
    renderer.domElement.addEventListener('pointerup', onUp)
    renderer.domElement.addEventListener('pointermove', onMove)
    renderer.domElement.addEventListener('pointerleave', () => setHover(null))

    const resize = () => {
      const w = mount.clientWidth
      const h = mount.clientHeight
      if (!w || !h) return
      renderer.setSize(w, h)
      camera.aspect = w / h
      camera.updateProjectionMatrix()
    }
    const observer = new ResizeObserver(resize)
    observer.observe(mount)
    resize()

    const clock = new THREE.Clock()
    let frame = 0
    const tick = () => {
      frame = requestAnimationFrame(tick)
      const time = clock.getElapsedTime()
      if (state.focus) controls.target.lerp(state.focus, 0.04)
      body.rotation.y = time * 1.5
      agent.position.y = Math.sin(time * 3) * 6
      const sel = state.selected ? fieldMeshes.get(state.selected) : null
      pulse.visible = state.scanning && !!sel
      if (pulse.visible && sel) {
        const k = (time % 1.1) / 1.1
        pulse.position.set(sel.center.x, FIELD_HEIGHT + 6, sel.center.z)
        pulse.scale.setScalar(150 + k * 650)
        ;(pulse.material as THREE.MeshBasicMaterial).opacity = 1 - k
      }
      controls.update()
      renderer.render(scene, camera)
    }
    tick()

    return () => {
      cancelAnimationFrame(frame)
      observer.disconnect()
      controls.dispose()
      renderer.dispose()
      mount.removeChild(renderer.domElement)
      s3.current = null
    }
  }, [fields])

  // Ground tiles for the chosen layer.
  useEffect(() => {
    const s = s3.current
    if (!s) return
    const src = TILE_SOURCES[layer]
    const z = src.zoom
    let alive = true
    setTiles({ loaded: 0, errors: 0 })
    s.tiles.clear()
    const lats = fields.features.map((f) => f.properties!.centroid[0] as number)
    const lons = fields.features.map((f) => f.properties!.centroid[1] as number)
    const pad = 0.035
    const [x0, x1] = [tileX(Math.min(...lons) - pad, z), tileX(Math.max(...lons) + pad, z)]
    const [y0, y1] = [tileY(Math.max(...lats) + pad, z), tileY(Math.min(...lats) - pad, z)]
    const loader = new THREE.TextureLoader()
    loader.setCrossOrigin('anonymous')
    for (let x = x0; x <= x1; x++) {
      for (let y = y0; y <= y1; y++) {
        const nw = s.toWorld(tileLat(y, z), tileLon(x, z))
        const se = s.toWorld(tileLat(y + 1, z), tileLon(x + 1, z))
        loader.load(
          src.url(z, x, y),
          (tex) => {
            if (!alive) return
            tex.colorSpace = THREE.SRGBColorSpace
            tex.anisotropy = 8
            const plane = new THREE.Mesh(
              new THREE.PlaneGeometry(se.x - nw.x, se.z - nw.z).rotateX(-Math.PI / 2),
              new THREE.MeshBasicMaterial({ map: tex }),
            )
            plane.position.set((nw.x + se.x) / 2, 0, (nw.z + se.z) / 2)
            s.tiles.add(plane)
            setTiles((v) => ({ ...v, loaded: v.loaded + 1 }))
          },
          undefined,
          () => alive && setTiles((v) => ({ ...v, errors: v.errors + 1 })),
        )
      }
    }
    return () => { alive = false }
  }, [layer, fields])

  // Selected field colour and camera focus.
  useEffect(() => {
    const s = s3.current
    if (!s) return
    s.state.selected = selectedId
    for (const [id, f] of s.fieldMeshes) {
      const on = id === selectedId
      ;(f.mesh.material as THREE.MeshLambertMaterial).color.setHex(on ? COLORS.selected : COLORS.field)
      ;(f.edges.material as THREE.LineBasicMaterial).color.setHex(on ? COLORS.selectedEdge : COLORS.fieldEdge)
      if (on) s.state.focus = f.center.clone()
    }
  }, [selectedId, fields])

  useEffect(() => { if (s3.current) s3.current.state.scanning = scanning }, [scanning])

  useEffect(() => {
    const s = s3.current
    if (!s || !agentPos) return
    const p = s.toWorld(agentPos[0], agentPos[1])
    s.agent.position.x = p.x
    s.agent.position.z = p.z
  }, [agentPos, fields])

  useEffect(() => {
    const s = s3.current
    if (!s) return
    if (s.routeLine) { s.scene.remove(s.routeLine); s.routeLine.geometry.dispose(); s.routeLine = null }
    if (!route) return
    const pts = route.map(([lat, lon]) => s.toWorld(lat, lon).setY(FIELD_HEIGHT + 8))
    const line = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), new THREE.LineDashedMaterial({ color: 0x1f3d2b, dashSize: 90, gapSize: 60 }))
    line.computeLineDistances()
    s.scene.add(line)
    s.routeLine = line
  }, [route, fields])

  return (
    <div className="map-wrap">
      <div ref={mountRef} className="map" />
      <div className="layer-switch" role="group" aria-label="Base layer">
        <button className={layer === 'map' ? 'on' : ''} onClick={() => setLayer('map')}>{t('baseMap')}</button>
        <button className={layer === 'sat' ? 'on' : ''} onClick={() => setLayer('sat')}>{t('satellite')}</button>
      </div>
      {hover && <div className="map-tip" style={{ left: hover.x + 14, top: hover.y + 14 }}>{hover.text}</div>}
      <div className="map-credit">{TILE_SOURCES[layer].credit}</div>
      <div className="map-help">{t('mapHelp')}</div>
      {tilesFailed && <div className="tiles-note">{t('tilesOffline')}</div>}
    </div>
  )
}
