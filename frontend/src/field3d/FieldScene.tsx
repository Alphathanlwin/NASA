// AI-assisted: Claude Code
// The 3D field. Lazy-loaded, so the map view never downloads Three.js.
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { Suspense, useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { SimState } from '../sim/types'
import { CropRows } from './Actors'
import { Farmer, Harvester, Surroundings } from './Models'
import { PLOT } from './layout'
import type { Action } from './layout'

const DRY = new THREE.Color('#c9a46b')
const WET = new THREE.Color('#4b3322')

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
      camera.position.set(0, 9.5, 17)
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
  const bund = '#8a6a3f'
  const { w, d } = PLOT
  return (
    <group>
      <mesh receiveShadow rotation-x={-Math.PI / 2} position={[0, -0.02, 0]}>
        <planeGeometry args={[90, 70]} />
        <meshStandardMaterial color="#9cbc67" roughness={1} />
      </mesh>
      <mesh receiveShadow rotation-x={-Math.PI / 2} position={[0, 0, 0]}>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial color={soil} roughness={1} />
      </mesh>
      {flooded && (
        <mesh receiveShadow rotation-x={-Math.PI / 2} position={[0, 0.05, 0]}>
          <planeGeometry args={[w - 0.2, d - 0.2]} />
          <meshStandardMaterial color="#6fa3c4" transparent opacity={0.45} roughness={0.15} metalness={0.1} />
        </mesh>
      )}
      {[
        [0, -d / 2, w + 0.5, 0.5],
        [0, d / 2, w + 0.5, 0.5],
        [-w / 2, 0, 0.5, d],
        [w / 2, 0, 0.5, d],
      ].map(([x, z, sx, sz], i) => (
        <mesh receiveShadow key={i} position={[x, 0.12, z]}>
          <boxGeometry args={[sx, 0.26, sz]} />
          <meshStandardMaterial color={bund} roughness={1} flatShading />
        </mesh>
      ))}
      {/* irrigation channel behind the field */}
      <mesh receiveShadow rotation-x={-Math.PI / 2} position={[0, 0.01, -d / 2 - 1.6]}>
        <planeGeometry args={[w + 14, 1.4]} />
        <meshStandardMaterial color="#5f93b5" roughness={0.2} />
      </mesh>
    </group>
  )
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
      <pointsMaterial color="#cfe3f2" size={0.08} transparent opacity={0.8} />
    </points>
  )
}

export default function FieldScene({ sim, action, sweepMode }: {
  sim: SimState
  action: Action | null
  sweepMode: 'cut' | 'sow' | null
}) {
  const flooded = sim.crop === 'rice' && sim.moisture >= 0.88 && sim.stage !== 'harvested'
  return (
    <Canvas dpr={[1, 1.5]} shadows camera={{ position: [0, 9.5, 17], fov: 42 }} gl={{ antialias: true }}
      aria-label="3D field view">
      <color attach="background" args={['#cfe2ea']} />
      <fog attach="fog" args={['#cfe2ea', 34, 85]} />
      <hemisphereLight args={['#fff4dc', '#5f7f45', 1.0]} />
      {/* low afternoon sun from the west-south-west, as in the dry-season harvest months */}
      <directionalLight position={[-14, 18, 9]} intensity={1.9} color="#ffe9c4" castShadow
        shadow-mapSize={[2048, 2048]} shadow-bias={-0.0004}
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
      <Rain active={sim.rainToday >= 3} />
    </Canvas>
  )
}
