// AI-assisted: Claude Code
// The crop rows (instanced) and the farmer agent. Both read the same action timing from layout.ts.
import { useFrame } from '@react-three/fiber'
import { useLayoutEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import type { Stage } from '../sim/types'
import { PLANTS, actionPose } from './layout'
import type { Action } from './layout'

const tmp = new THREE.Object3D()
const col = new THREE.Color()
const stressCol = new THREE.Color('#b9a14a')

function growth(progress: number) {
  return Math.min(1, Math.max(0, progress / 0.6))
}

function cropColor(crop: string, stage: Stage, progress: number, health: number | null, out: THREE.Color) {
  if (crop === 'rice') {
    out.set('#4f9a3a')
    if (stage === 'fill') out.lerp(new THREE.Color('#b7b13c'), 0.45)
    if (stage === 'mature' || stage === 'harvested') out.set('#d6b04a')
  } else {
    out.set('#3f8a3a')
    if (stage === 'flowering') out.lerp(new THREE.Color('#e3d25a'), 0.25)
    if (stage === 'fill') out.set('#2f6f33')
    if (stage === 'mature' || stage === 'harvested') out.set('#7c7a3a')
  }
  if (stage === 'sown' || stage === 'germination') out.lerp(new THREE.Color('#9ccf6a'), 0.4 - progress)
  if (health !== null && health < 100) out.lerp(stressCol, ((100 - health) / 100) * 0.75)
  return out
}

function heightOf(crop: string) {
  return crop === 'rice' ? 1.05 : 0.55
}

/** One instanced mesh per crop kind. Cheap: matrices and colours only change on sim updates or during an action. */
export function CropRows({ crop, stage, progress, health, action, sweepMode }: {
  crop: string | null
  stage: Stage
  progress: number
  health: number | null
  action: Action | null
  sweepMode: 'cut' | 'sow' | null
}) {
  const rice = useRef<THREE.InstancedMesh>(null)
  const bean = useRef<THREE.InstancedMesh>(null)
  const riceGeo = useMemo(() => {
    const g = new THREE.ConeGeometry(0.08, 1, 5)
    g.translate(0, 0.5, 0)
    return g
  }, [])
  const beanGeo = useMemo(() => {
    const g = new THREE.IcosahedronGeometry(0.26, 0)
    g.scale(1, 0.75, 1)
    g.translate(0, 0.26, 0)
    return g
  }, [])
  const mat = useMemo(() => new THREE.MeshStandardMaterial({ roughness: 0.85, flatShading: true }), [])

  const shownCrop = sweepMode === 'sow' ? action?.crop ?? crop : crop

  const write = (sweep: number | null) => {
    const meshes = { rice: rice.current, bean: bean.current }
    if (!meshes.rice || !meshes.bean) return
    const kind = shownCrop === 'rice' ? 'rice' : shownCrop ? 'bean' : null
    const active = kind === 'rice' ? meshes.rice : kind === 'bean' ? meshes.bean : null
    for (const m of [meshes.rice, meshes.bean]) m.visible = m === active
    if (!active || !shownCrop) return
    const g = sweepMode === 'sow' ? 0.08 : growth(progress)
    const h = heightOf(shownCrop)
    cropColor(shownCrop, sweepMode === 'sow' ? 'sown' : stage, progress, health, col)
    PLANTS.forEach((p, i) => {
      let visible = true
      if (sweep !== null && sweepMode === 'cut') visible = p.x > sweep
      if (sweep !== null && sweepMode === 'sow') visible = p.x < sweep
      if (sweepMode === 'sow' && sweep === null) visible = false
      const s = visible ? (0.12 + 0.88 * g) * p.s : 0
      tmp.position.set(p.x, 0.02, p.z)
      tmp.rotation.set(0, p.r, (kind === 'rice' ? 0.12 : 0) * Math.sin(p.r))
      if (kind === 'rice') tmp.scale.set(0.9 + 0.3 * g, Math.max(s * h, 0.0001), 0.9 + 0.3 * g)
      else tmp.scale.set(s, s, s)
      tmp.updateMatrix()
      active.setMatrixAt(i, tmp.matrix)
      active.setColorAt(i, col)
    })
    active.instanceMatrix.needsUpdate = true
    if (active.instanceColor) active.instanceColor.needsUpdate = true
  }

  useLayoutEffect(() => {
    write(action ? actionPose(action, performance.now()).sweep : null)
  })

  useFrame(() => {
    if (action) write(actionPose(action, performance.now()).sweep)
  })

  return (
    <>
      <instancedMesh ref={rice} args={[riceGeo, mat, PLANTS.length]} castShadow={false} />
      <instancedMesh ref={bean} args={[beanGeo, mat, PLANTS.length]} castShadow={false} />
    </>
  )
}

/** Low-poly farmer with a bamboo hat. Idles facing the camera; walks the rows during an action. */
export function Agent({ action }: { action: Action | null }) {
  const root = useRef<THREE.Group>(null)
  const torso = useRef<THREE.Group>(null)
  const legL = useRef<THREE.Mesh>(null)
  const legR = useRef<THREE.Mesh>(null)
  const armL = useRef<THREE.Mesh>(null)
  const armR = useRef<THREE.Mesh>(null)

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    const pose = actionPose(action, performance.now())
    const g = root.current
    if (!g) return
    g.position.x = pose.x
    g.position.z = pose.z
    g.rotation.y += (pose.heading - g.rotation.y) * 0.2
    const swing = pose.walking ? Math.sin(t * 9) * 0.6 : 0
    if (legL.current) legL.current.rotation.x = swing
    if (legR.current) legR.current.rotation.x = -swing
    if (armL.current) armL.current.rotation.x = -swing * 0.8 + (pose.working ? -0.9 : 0)
    if (armR.current) armR.current.rotation.x = swing * 0.8 + (pose.working ? -0.9 : 0)
    if (torso.current) {
      torso.current.rotation.x = pose.working ? 0.45 + Math.sin(t * 9) * 0.08 : Math.sin(t * 1.6) * 0.02
      torso.current.position.y = 0.78 + (pose.walking ? Math.abs(Math.sin(t * 9)) * 0.05 : Math.sin(t * 1.6) * 0.012)
    }
  })

  const skin = '#a8744f'
  return (
    <group ref={root} name="agent">
      <mesh ref={legL} position={[-0.12, 0.42, 0]}>
        <boxGeometry args={[0.13, 0.8, 0.14]} />
        <meshStandardMaterial color="#5a3b2a" />
      </mesh>
      <mesh ref={legR} position={[0.12, 0.42, 0]}>
        <boxGeometry args={[0.13, 0.8, 0.14]} />
        <meshStandardMaterial color="#5a3b2a" />
      </mesh>
      {/* longyi (sarong) */}
      <mesh position={[0, 0.62, 0]}>
        <cylinderGeometry args={[0.2, 0.26, 0.55, 8]} />
        <meshStandardMaterial color="#7b2f3a" flatShading />
      </mesh>
      <group ref={torso} position={[0, 0.78, 0]}>
        <mesh position={[0, 0.35, 0]}>
          <boxGeometry args={[0.46, 0.6, 0.28]} />
          <meshStandardMaterial color="#e8e1cf" flatShading />
        </mesh>
        <mesh ref={armL} position={[-0.31, 0.58, 0]} geometry={armGeo}>
          <meshStandardMaterial color={skin} />
        </mesh>
        <mesh ref={armR} position={[0.31, 0.58, 0]} geometry={armGeo}>
          <meshStandardMaterial color={skin} />
        </mesh>
        <mesh position={[0, 0.82, 0]}>
          <sphereGeometry args={[0.17, 10, 8]} />
          <meshStandardMaterial color={skin} flatShading />
        </mesh>
        {/* kha mauk, the conical bamboo hat */}
        <mesh position={[0, 1.0, 0]}>
          <coneGeometry args={[0.48, 0.26, 14]} />
          <meshStandardMaterial color="#d9b86c" flatShading />
        </mesh>
      </group>
    </group>
  )
}

const armGeo = (() => {
  const g = new THREE.BoxGeometry(0.11, 0.55, 0.11)
  g.translate(0, -0.27, 0)
  return g
})()
