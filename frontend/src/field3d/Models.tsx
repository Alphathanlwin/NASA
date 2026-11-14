// AI-assisted: Claude Code
// Blender-made models (scripts/blender/build_field_assets.py): Myaungmya-style surroundings, a crawler
// rice combine with the farmer driving. The farmer on foot is the blocky figure in VoxelFarmer.tsx.
// Animation is done here, from layout.ts.
import { createPortal, useFrame, useLoader } from '@react-three/fiber'
import { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { actionPose, harvesterPose } from './layout'
import type { Action } from './layout'
import { toonify } from './toon'
import { SeatedFarmer, VoxelFarmerBody, useFarmerMaterials } from './VoxelFarmer'

const url = (file: string) => `${import.meta.env.BASE_URL}models/${file}`

function useModel(file: string, shadows: { cast: boolean; receive: boolean }) {
  const gltf = useLoader(GLTFLoader, url(file))
  return useMemo(() => {
    const scene = toonify(gltf.scene.clone(true))
    scene.traverse((o) => {
      if ((o as THREE.Mesh).isMesh) {
        o.castShadow = shadows.cast
        o.receiveShadow = shadows.receive
      }
    })
    return scene
  }, [gltf, shadows.cast, shadows.receive])
}

export function Surroundings() {
  const scene = useModel('surroundings.glb', { cast: true, receive: true })
  return <primitive object={scene} />
}

/** The combine: parked by the house; at harvest it drives in, cuts across, turns and drives back. */
export function Harvester({ action }: { action: Action | null }) {
  const scene = useModel('harvester.glb', { cast: true, receive: true })
  const reel = useMemo(() => scene.getObjectByName('reel'), [scene])
  const driver = useMemo(() => {
    const d = scene.getObjectByName('driver')
    // the Blender driver is replaced by the blocky farmer; keep the group, hide its old meshes
    d?.children.forEach((c) => { c.visible = false })
    return d
  }, [scene])
  useFrame((_, dt) => {
    const pose = harvesterPose(action, performance.now())
    scene.position.set(pose.x, 0, pose.z)
    scene.rotation.y = pose.heading
    if (reel && pose.working) reel.rotation.z -= dt * 7
    // the farmer is in the seat only while the machine is working the field
    if (driver) driver.visible = action?.kind === 'cut'
  })
  return (
    <>
      <primitive object={scene} />
      {/* seated on the driver's spot (seat top), turned to face the machine's front (+x), scaled to fit
          under the canopy */}
      {driver && createPortal(
        <group position={[0, -0.52, 0]} rotation-y={Math.PI / 2} scale={0.72}>
          <SeatedFarmer />
        </group>,
        driver,
      )}
    </>
  )
}

/** The farmer on foot: stands by the field, walks the rows when sowing, rides the harvester when cutting. */
export function Farmer({ action }: { action: Action | null }) {
  const m = useFarmerMaterials()
  const holder = useRef<THREE.Group>(null)
  const refs = {
    legL: useRef<THREE.Group>(null),
    legR: useRef<THREE.Group>(null),
    armL: useRef<THREE.Group>(null),
    armR: useRef<THREE.Group>(null),
    torso: useRef<THREE.Group>(null),
  }

  useFrame(({ clock }) => {
    const g = holder.current
    if (!g) return
    const t = clock.getElapsedTime()
    const pose = actionPose(action, performance.now())
    g.visible = action?.kind !== 'cut'
    g.position.set(pose.x, pose.walking ? Math.abs(Math.sin(t * 9)) * 0.04 : 0, pose.z)
    g.rotation.y += (pose.heading - g.rotation.y) * 0.2
    // the figure faces +z, so limbs swing about x
    const swing = pose.walking ? Math.sin(t * 9) * 0.6 : 0
    if (refs.legL.current) refs.legL.current.rotation.x = swing
    if (refs.legR.current) refs.legR.current.rotation.x = -swing
    if (refs.armL.current) refs.armL.current.rotation.x = -swing * 0.8 - (pose.working ? 0.9 : 0)
    if (refs.armR.current) refs.armR.current.rotation.x = swing * 0.8 - (pose.working ? 0.9 : 0)
    if (refs.torso.current) {
      refs.torso.current.rotation.x = pose.working ? 0.45 + Math.sin(t * 9) * 0.08 : Math.sin(t * 1.6) * 0.02
    }
  })
  return (
    <group ref={holder} scale={0.92}>
      <VoxelFarmerBody m={m} refs={refs} />
    </group>
  )
}
