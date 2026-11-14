// AI-assisted: Claude Code
// Blender-made models (scripts/blender/build_field_assets.py): Myaungmya-style surroundings, a crawler
// rice combine with the farmer driving, and the farmer on foot. Animation is done here, from layout.ts.
import { useFrame, useLoader } from '@react-three/fiber'
import { useMemo } from 'react'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { actionPose, harvesterPose } from './layout'
import type { Action } from './layout'

const url = (file: string) => `${import.meta.env.BASE_URL}models/${file}`

function useModel(file: string, shadows: { cast: boolean; receive: boolean }) {
  const gltf = useLoader(GLTFLoader, url(file))
  return useMemo(() => {
    const scene = gltf.scene.clone(true)
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
  const driver = useMemo(() => scene.getObjectByName('driver'), [scene])
  useFrame((_, dt) => {
    const pose = harvesterPose(action, performance.now())
    scene.position.set(pose.x, 0, pose.z)
    scene.rotation.y = pose.heading
    if (reel && pose.working) reel.rotation.z -= dt * 7
    // the farmer is in the seat only while the machine is working the field
    if (driver) driver.visible = action?.kind === 'cut'
  })
  return <primitive object={scene} />
}

/** The farmer on foot: stands by the field, walks the rows when sowing, rides the harvester when cutting. */
export function Farmer({ action }: { action: Action | null }) {
  const scene = useModel('farmer.glb', { cast: true, receive: false })
  const parts = useMemo(() => {
    const get = (n: string) => scene.getObjectByName(n)
    return { legL: get('legL'), legR: get('legR'), armL: get('armL'), armR: get('armR'), torso: get('torso') }
  }, [scene])
  // the Blender farmer faces +x; this wrapper turns him to face +z, the convention the poses use
  const holder = useMemo(() => {
    const g = new THREE.Group()
    scene.rotation.y = -Math.PI / 2
    g.add(scene)
    return g
  }, [scene])

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime()
    const pose = actionPose(action, performance.now())
    holder.visible = action?.kind !== 'cut'
    holder.position.set(pose.x, 0, pose.z)
    holder.rotation.y += (pose.heading - holder.rotation.y) * 0.2
    // limbs swing about the farmer's side-to-side axis (local z after export)
    const swing = pose.walking ? Math.sin(t * 9) * 0.6 : 0
    if (parts.legL) parts.legL.rotation.z = swing
    if (parts.legR) parts.legR.rotation.z = -swing
    if (parts.armL) parts.armL.rotation.z = -swing * 0.8 - (pose.working ? 0.9 : 0)
    if (parts.armR) parts.armR.rotation.z = swing * 0.8 - (pose.working ? 0.9 : 0)
    if (parts.torso) parts.torso.rotation.z = pose.working ? -(0.45 + Math.sin(t * 9) * 0.08) : Math.sin(t * 1.6) * 0.02
  })
  return <primitive object={holder} />
}
