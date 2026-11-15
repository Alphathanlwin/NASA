// AI-assisted: Claude Code
// The 3D field. Lazy-loaded, so the map view never downloads Three.js.
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Suspense, useEffect, useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js'
import type { SimState } from '../sim/types'
import { CropRows } from './Actors'
import { Farmer, Harvester, Surroundings } from './Models'
import { AGENT_HOME, PLOT } from './layout'
import type { Action } from './layout'
import { toon } from './toon'

const DRY = new THREE.Color('#e6b878')
const WET = new THREE.Color('#8f5a36')

/** Default camera: a high three-quarter view, like a handheld-game overworld. */
const CAM_POS: [number, number, number] = [0, 12, 16]

function Controls() {
  const { camera, gl } = useThree()
  useEffect(() => {
    const c = new OrbitControls(camera, gl.domElement)
    c.target.set(0, 0, 0.5)
    c.enableDamping = true
    c.enablePan = false
    c.minDistance = 11
    c.maxDistance = 26
    c.minPolarAngle = THREE.MathUtils.degToRad(35)
    c.maxPolarAngle = THREE.MathUtils.degToRad(70)
    c.minAzimuthAngle = THREE.MathUtils.degToRad(-40)
    c.maxAzimuthAngle = THREE.MathUtils.degToRad(40)
    c.update()
    const reset = () => {
      camera.position.set(...CAM_POS)
      c.target.set(0, 0, 0.5)
      c.update()
    }
    gl.domElement.addEventListener('dblclick', reset)
    let raf = 0
    const tick = () => {
      c.update()
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      gl.domElement.removeEventListener('dblclick', reset)
      c.dispose()
    }
  }, [camera, gl])
  return null
}

function Terrain({ moisture, flooded }: { moisture: number; flooded: boolean }) {
  const soil = useMemo(() => DRY.clone().lerp(WET, Math.min(1, Math.max(0, moisture))), [moisture])
  const mats = useMemo(() => ({
    grass: toon('#86d456'),
    soil: toon('#ffffff'),
    bund: toon('#d39a5a'),
    water: toon('#74d6f2', { transparent: true, opacity: 0.6 }),
    channel: toon('#4cc6ec'),
  }), [])
  useEffect(() => { mats.soil.color.copy(soil) }, [mats, soil])
  const { w, d } = PLOT
  const bunds = useMemo(() => [
    [0, -d / 2, w + 0.5, 0.5],
    [0, d / 2, w + 0.5, 0.5],
    [-w / 2, 0, 0.5, d],
    [w / 2, 0, 0.5, d],
  ].map(([x, z, sx, sz]) => ({ x, z, geo: new RoundedBoxGeometry(sx, 0.3, sz, 3, 0.12) })), [w, d])
  return (
    <group>
      <mesh receiveShadow rotation-x={-Math.PI / 2} position={[0, -0.02, 0]} material={mats.grass}>
        <planeGeometry args={[90, 70]} />
      </mesh>
      <mesh receiveShadow rotation-x={-Math.PI / 2} position={[0, 0, 0]} material={mats.soil}>
        <planeGeometry args={[w, d]} />
      </mesh>
      {flooded && (
        <mesh receiveShadow rotation-x={-Math.PI / 2} position={[0, 0.05, 0]} material={mats.water}>
          <planeGeometry args={[w - 0.2, d - 0.2]} />
        </mesh>
      )}
      {bunds.map((b, i) => (
        <mesh castShadow receiveShadow key={i} position={[b.x, 0.12, b.z]} geometry={b.geo} material={mats.bund} />
      ))}
      {/* irrigation channel behind the field */}
      <mesh receiveShadow rotation-x={-Math.PI / 2} position={[0, 0.01, -d / 2 - 1.6]} material={mats.channel}>
        <planeGeometry args={[w + 14, 1.4]} />
      </mesh>
      <Shrubs />
      <GrassTufts />
    </group>
  )
}

/** Round, puffy shrubs along the near edge of the field, kept clear of the farmer's spot and the path in. */
function Shrubs() {
  const spots = useMemo(() => {
    const out: { x: number; z: number; s: number }[] = []
    const { w, d } = PLOT
    for (let x = -w / 2 + 0.6; x <= w / 2 - 0.4; x += 1.25) {
      if (Math.abs(x - AGENT_HOME[0]) < 1.6) continue
      out.push({ x, z: d / 2 + 1.25, s: 0.85 + ((Math.sin(x * 91.7) + 1) / 2) * 0.3 })
    }
    return out
  }, [])
  const leaf = useMemo(() => toon('#4fbf45'), [])
  const leafHi = useMemo(() => toon('#6fd856'), [])
  const ball = useMemo(() => new THREE.SphereGeometry(0.42, 16, 12), [])
  return (
    <group>
      {spots.map((p, i) => (
        <group key={i} position={[p.x, 0, p.z]} scale={p.s}>
          <mesh castShadow geometry={ball} material={leaf} position={[0, 0.36, 0]} />
          <mesh castShadow geometry={ball} material={leafHi} position={[0.28, 0.3, 0.12]} scale={0.7} />
          <mesh castShadow geometry={ball} material={leafHi} position={[-0.26, 0.28, 0.08]} scale={0.65} />
        </group>
      ))}
    </group>
  )
}

/** Little grass tufts scattered on the lawn around the field, one instanced mesh. */
function GrassTufts() {
  const ref = useRef<THREE.InstancedMesh>(null)
  const geo = useMemo(() => {
    const g = new THREE.ConeGeometry(0.07, 0.32, 4)
    g.translate(0, 0.16, 0)
    return g
  }, [])
  const mat = useMemo(() => toon('#5fb83f'), [])
  const count = 420
  useLayoutEffect(() => {
    const m = ref.current
    if (!m) return
    const o = new THREE.Object3D()
    const r = (i: number) => { const x = Math.sin(i * 12.9898) * 43758.5453; return x - Math.floor(x) }
    let n = 0
    for (let i = 0; n < count && i < count * 4; i++) {
      const x = (r(i) - 0.5) * 34
      const z = (r(i + 500) - 0.5) * 22 + 2
      // keep off the field, its bunds and the channel behind it
      if (Math.abs(x) < PLOT.w / 2 + 0.8 && z > -PLOT.d / 2 - 2.6 && z < PLOT.d / 2 + 0.6) continue
      for (let k = 0; k < 3 && n < count; k++, n++) {
        o.position.set(x + (k - 1) * 0.08, 0, z + (k % 2) * 0.06)
        o.rotation.set((k - 1) * 0.3, r(i + k) * Math.PI, 0)
        o.scale.setScalar(0.8 + r(i + k + 9) * 0.6)
        o.updateMatrix()
        m.setMatrixAt(n, o.matrix)
      }
    }
    m.count = n
    m.instanceMatrix.needsUpdate = true
  }, [])
  return <instancedMesh ref={ref} args={[geo, mat, count]} />
}

function Rain({ active }: { active: boolean }) {
  const ref = useRef<THREE.Points>(null)
  const positions = useMemo(() => {
    const n = 900
    const a = new Float32Array(n * 3)
    for (let i = 0; i < n; i++) {
      a[i * 3] = (Math.sin(i * 12.9898) * 0.5) * 26
      a[i * 3 + 1] = ((i * 7.31) % 12)
      a[i * 3 + 2] = (Math.cos(i * 78.233) * 0.5) * 18
    }
    return a
  }, [])
  useFrame((_, dt) => {
    const p = ref.current
    if (!p || !active) return
    const arr = p.geometry.attributes.position.array as Float32Array
    for (let i = 1; i < arr.length; i += 3) {
      arr[i] -= dt * 14
      if (arr[i] < 0) arr[i] += 12
    }
    p.geometry.attributes.position.needsUpdate = true
  })
  if (!active) return null
  return (
    <points ref={ref}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial color="#e6f6ff" size={0.08} transparent opacity={0.8} />
    </points>
  )
}

export default function FieldScene({ sim, action, sweepMode, showSensors }: {
  sim: SimState
  action: Action | null
  sweepMode: 'cut' | 'sow' | null
  showSensors: boolean
}) {
  const flooded = sim.crop === 'rice' && sim.moisture >= 0.88 && sim.stage !== 'harvested'
  return (
    <Canvas dpr={[1, 1.5]} shadows flat camera={{ position: CAM_POS, fov: 42 }} gl={{ antialias: true }}
      aria-label="3D field view">
      {/* bright, clear sky; flat (no tone mapping) keeps the cartoon colours saturated */}
      <color attach="background" args={['#9fdcff']} />
      <fog attach="fog" args={['#c4ecff', 40, 95]} />
      <hemisphereLight args={['#ffffff', '#8fd06a', 1.35]} />
      <ambientLight intensity={0.25} />
      {/* high, warm sun so shadows sit short and soft under things */}
      <directionalLight position={[-10, 22, 12]} intensity={2.1} color="#fff2d8" castShadow
        shadow-mapSize={[2048, 2048]} shadow-bias={-0.0004} shadow-normalBias={0.02}
        shadow-camera-left={-26} shadow-camera-right={26} shadow-camera-top={20} shadow-camera-bottom={-20}
        shadow-camera-near={1} shadow-camera-far={70} />
      <Controls />
      <Terrain moisture={sim.moisture} flooded={flooded} />
      <CropRows crop={sim.crop} stage={sim.stage} progress={sim.progress} health={sim.health}
        action={action} sweepMode={sweepMode} />
      <Suspense fallback={null}>
        <Surroundings />
        <Harvester action={action} />
        <Farmer action={action} />
      </Suspense>
      {/* Example sensor stations; these are not real device locations. */}
      {showSensors && [[-2, 4.7], [2, 4.7]].map(([x, z]) => (
        <group key={`${x}-${z}`} position={[x, 0, z]}>
          <mesh position={[0, 0.52, 0]}><cylinderGeometry args={[0.06, 0.06, 1.04, 8]} /><meshStandardMaterial color="#415548" /></mesh>
          <mesh position={[0, 1.1, 0]}><boxGeometry args={[0.48, 0.4, 0.22]} /><meshStandardMaterial color="#e5f0dc" /></mesh>
          <mesh position={[0, 1.45, 0]} rotation-x={-0.35}><boxGeometry args={[0.6, 0.04, 0.4]} /><meshStandardMaterial color="#214c68" /></mesh>
        </group>
      ))}
      <Rain active={sim.rainToday >= 3} />
    </Canvas>
  )
}
