// AI-assisted: Claude Code
// The 3D field. Lazy-loaded, so the map view never downloads Three.js.
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import type { SimState } from '../sim/types'
import { Agent, CropRows } from './Actors'
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
      <mesh rotation-x={-Math.PI / 2} position={[0, -0.02, 0]}>
        <planeGeometry args={[90, 70]} />
        <meshStandardMaterial color="#9cbc67" roughness={1} />
      </mesh>
      <mesh rotation-x={-Math.PI / 2} position={[0, 0, 0]}>
        <planeGeometry args={[w, d]} />
        <meshStandardMaterial color={soil} roughness={1} />
      </mesh>
      {flooded && (
        <mesh rotation-x={-Math.PI / 2} position={[0, 0.05, 0]}>
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
        <mesh key={i} position={[x, 0.12, z]}>
          <boxGeometry args={[sx, 0.26, sz]} />
          <meshStandardMaterial color={bund} roughness={1} flatShading />
        </mesh>
      ))}
      {/* irrigation channel behind the field */}
      <mesh rotation-x={-Math.PI / 2} position={[0, 0.01, -d / 2 - 1.6]}>
        <planeGeometry args={[w + 14, 1.4]} />
        <meshStandardMaterial color="#5f93b5" roughness={0.2} />
      </mesh>
    </group>
  )
}

function Palm({ x, z, h = 5 }: { x: number; z: number; h?: number }) {
  return (
    <group position={[x, 0, z]}>
      <mesh position={[0, h / 2, 0]}>
        <cylinderGeometry args={[0.14, 0.22, h, 6]} />
        <meshStandardMaterial color="#6b5137" flatShading />
      </mesh>
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <mesh key={i} position={[Math.cos(i) * 0.7, h, Math.sin(i) * 0.7]} rotation={[Math.sin(i) * 0.9, i, Math.cos(i) * 0.9]}>
          <coneGeometry args={[0.35, 1.9, 4]} />
          <meshStandardMaterial color="#3f7a35" flatShading />
        </mesh>
      ))}
    </group>
  )
}

function Props() {
  return (
    <group>
      {/* bamboo hut on stilts */}
      <group position={[-12.5, 0, -2.5]} rotation-y={0.5}>
        {[[-1, -1], [1, -1], [-1, 1], [1, 1]].map(([x, z], i) => (
          <mesh key={i} position={[x, 0.5, z]}>
            <cylinderGeometry args={[0.08, 0.08, 1, 5]} />
            <meshStandardMaterial color="#6b5137" />
          </mesh>
        ))}
        <mesh position={[0, 1.6, 0]}>
          <boxGeometry args={[2.4, 1.3, 2.4]} />
          <meshStandardMaterial color="#c9a46b" flatShading />
        </mesh>
        <mesh position={[0, 2.85, 0]} rotation-y={Math.PI / 4}>
          <coneGeometry args={[2.3, 1.3, 4]} />
          <meshStandardMaterial color="#8c6b3b" flatShading />
        </mesh>
      </group>
      <Palm x={12.5} z={-5} />
      <Palm x={14} z={-1} h={6} />
      <Palm x={-14.5} z={4} h={5.5} />
      <Palm x={-9} z={-9} h={6.5} />
      <Palm x={9} z={-10} h={5} />
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
    <Canvas dpr={[1, 1.5]} camera={{ position: [0, 9.5, 17], fov: 42 }} gl={{ antialias: true, alpha: true }}
      aria-label="3D field view">
      <hemisphereLight args={['#fff4dc', '#5f7f45', 1.15]} />
      <directionalLight position={[8, 14, 6]} intensity={1.7} color="#fff1d6" />
      <fog attach="fog" args={['#dfe9e0', 30, 70]} />
      <Controls />
      <Terrain moisture={sim.moisture} flooded={flooded} />
      <Props />
      <CropRows crop={sim.crop} stage={sim.stage} progress={sim.progress} health={sim.health}
        action={action} sweepMode={sweepMode} />
      <Agent action={action} />
      <Rain active={sim.rainToday >= 3} />
    </Canvas>
  )
}
