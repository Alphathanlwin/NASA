// AI-assisted: Claude Code
// The farmer as a chunky, blocky figure: big head, stepped straw kha mauk, white shirt, checked purple
// longyi with its front knot, sandals, a hoe in one hand and a bundle of rice in the other.
// Built from boxes with small pixel textures, so it matches the toon field. Faces +z; limbs swing about x.
import { useLayoutEffect, useMemo, useRef } from 'react'
import type { RefObject } from 'react'
import * as THREE from 'three'
import { toon } from './toon'

/** A tiny pixel texture drawn on a canvas; NearestFilter keeps the pixels square. */
function pixelTexture(size: number, paint: (x: number, y: number) => string) {
  const c = document.createElement('canvas')
  c.width = c.height = size
  const g = c.getContext('2d')!
  for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
    g.fillStyle = paint(x, y)
    g.fillRect(x, y, 1, 1)
  }
  const tex = new THREE.CanvasTexture(c)
  tex.magFilter = THREE.NearestFilter
  tex.minFilter = THREE.NearestFilter
  tex.generateMipmaps = false
  tex.colorSpace = THREE.SRGBColorSpace
  return tex
}

const noise = (x: number, y: number, k = 0) => {
  const v = Math.sin(x * 12.9898 + y * 78.233 + k * 37.719) * 43758.5453
  return v - Math.floor(v)
}

export function useFarmerMaterials() {
  return useMemo(() => {
    const straw = pixelTexture(16, (x, y) => ['#e2bd6c', '#d6ad5a', '#ecca7c', '#c99f4e'][Math.floor(noise(x, y) * 4)])
    const shirt = pixelTexture(16, (x, y) => (noise(x, y, 2) > 0.82 ? '#efe9dc' : '#fbf8f1'))
    // longyi check: darker bands every 4 pixels both ways, lighter where they cross
    const longyi = pixelTexture(16, (x, y) => {
      const bx = x % 4 === 0, by = y % 4 === 0
      if (bx && by) return '#7a5a86'
      if (bx || by) return '#4f3458'
      return noise(x, y, 5) > 0.85 ? '#5d4066' : '#634570'
    })
    const hair = pixelTexture(8, (x, y) => (noise(x, y, 7) > 0.7 ? '#2a211c' : '#17120f'))
    return {
      straw: toon('#ffffff', { map: straw }),
      shirt: toon('#ffffff', { map: shirt }),
      longyi: toon('#ffffff', { map: longyi }),
      hair: toon('#ffffff', { map: hair }),
      knot: toon('#4a3052'),
      skin: toon('#d99a68'),
      sole: toon('#5b3a24'),
      strap: toon('#3a2618'),
      eyeWhite: toon('#ffffff'),
      eye: toon('#16110e'),
      mouth: toon('#8a4a2c'),
      button: toon('#e4ddcc'),
      wood: toon('#9a6337'),
      iron: toon('#7d8790'),
      stalk: toon('#6cbf3c'),
      grain: toon('#f0cf4a'),
    }
  }, [])
}

export type Mats = ReturnType<typeof useFarmerMaterials>

function Box({ size, pos, mat, rot }: {
  size: [number, number, number]
  pos: [number, number, number]
  mat: THREE.Material
  rot?: [number, number, number]
}) {
  return (
    <mesh position={pos} rotation={rot} material={mat} castShadow>
      <boxGeometry args={size} />
    </mesh>
  )
}

/** Stepped straw hat: a voxel cone of shrinking slabs. */
function Hat({ m }: { m: Mats }) {
  const steps = [1.06, 0.88, 0.7, 0.54, 0.38, 0.24, 0.12]
  return (
    <group>
      {steps.map((w, i) => (
        <Box key={i} size={[w, 0.065, w]} pos={[0, i * 0.065, 0]} mat={m.straw} />
      ))}
    </group>
  )
}

function Head({ m }: { m: Mats }) {
  const fz = 0.271 // just in front of the face
  return (
    <group>
      <Box size={[0.62, 0.56, 0.54]} pos={[0, 0, 0]} mat={m.skin} />
      {/* hair: top cap, back, sides and a blocky fringe */}
      <Box size={[0.66, 0.12, 0.58]} pos={[0, 0.27, 0]} mat={m.hair} />
      <Box size={[0.66, 0.42, 0.1]} pos={[0, 0.07, -0.25]} mat={m.hair} />
      <Box size={[0.08, 0.3, 0.46]} pos={[-0.31, 0.12, -0.03]} mat={m.hair} />
      <Box size={[0.08, 0.3, 0.46]} pos={[0.31, 0.12, -0.03]} mat={m.hair} />
      {[-0.24, -0.1, 0.06, 0.2].map((x, i) => (
        <Box key={i} size={[0.13, i % 2 ? 0.08 : 0.12, 0.06]} pos={[x, i % 2 ? 0.2 : 0.18, 0.25]} mat={m.hair} />
      ))}
      {/* brows, eyes (white with a dark pupil), smile */}
      <Box size={[0.14, 0.04, 0.01]} pos={[-0.14, 0.09, fz]} mat={m.eye} />
      <Box size={[0.14, 0.04, 0.01]} pos={[0.14, 0.09, fz]} mat={m.eye} />
      <Box size={[0.15, 0.14, 0.01]} pos={[-0.14, -0.02, fz]} mat={m.eyeWhite} />
      <Box size={[0.15, 0.14, 0.01]} pos={[0.14, -0.02, fz]} mat={m.eyeWhite} />
      <Box size={[0.09, 0.12, 0.012]} pos={[-0.12, -0.03, fz + 0.002]} mat={m.eye} />
      <Box size={[0.09, 0.12, 0.012]} pos={[0.12, -0.03, fz + 0.002]} mat={m.eye} />
      <Box size={[0.03, 0.03, 0.012]} pos={[-0.14, 0.0, fz + 0.004]} mat={m.eyeWhite} />
      <Box size={[0.03, 0.03, 0.012]} pos={[0.1, 0.0, fz + 0.004]} mat={m.eyeWhite} />
      <Box size={[0.08, 0.02, 0.01]} pos={[0, -0.14, fz]} mat={m.mouth} />
      <Box size={[0.025, 0.02, 0.01]} pos={[-0.05, -0.125, fz]} mat={m.mouth} />
      <Box size={[0.025, 0.02, 0.01]} pos={[0.05, -0.125, fz]} mat={m.mouth} />
      <group position={[0, 0.32, 0]}>
        <Hat m={m} />
      </group>
    </group>
  )
}

/** One arm, hanging from a pivot at the shoulder; what it holds rides along. */
function Arm({ m, side, holding }: { m: Mats; side: 1 | -1; holding: 'hoe' | 'rice' | null }) {
  return (
    <>
      <Box size={[0.17, 0.3, 0.19]} pos={[0, -0.13, 0]} mat={m.shirt} />
      <Box size={[0.15, 0.17, 0.17]} pos={[0, -0.36, 0]} mat={m.skin} />
      {holding === null ? null : holding === 'hoe' ? (
        <group position={[0, -0.4, 0.1]}>
          <Box size={[0.05, 1.15, 0.05]} pos={[0, 0.12, 0]} mat={m.wood} />
          <Box size={[0.07, 0.09, 0.28]} pos={[0, 0.66, 0.11]} mat={m.wood} />
          <Box size={[0.12, 0.26, 0.05]} pos={[0, 0.56, 0.26]} mat={m.iron} />
        </group>
      ) : (
        <group position={[side * 0.02, -0.4, 0.1]} rotation={[0.35, 0, 0]}>
          {[-0.07, -0.04, -0.01, 0.02, 0.05, 0.08].map((x, i) => (
            <group key={i} position={[x, 0, (i % 2) * 0.03]} rotation={[0.1 * (i % 3), 0, x * 3]}>
              <Box size={[0.025, 0.6, 0.025]} pos={[0, 0.25, 0]} mat={m.stalk} />
              {/* the grain head nods over */}
              <Box size={[0.05, 0.16, 0.05]} pos={[0.03, 0.56, 0.04]} rot={[0.5, 0, -0.4]} mat={m.grain} />
            </group>
          ))}
        </group>
      )}
    </>
  )
}

/**
 * The farmer, about 2 units tall with the hat. Named parts (legL, legR, armL, armR, torso) are what the
 * scene animates: legs and arms swing about x, the torso bends forward about x when working.
 */
export function VoxelFarmerBody({ m, refs, empty = false }: {
  m: Mats
  /** hands free, e.g. when driving */
  empty?: boolean
  refs: {
    legL: RefObject<THREE.Group | null>
    legR: RefObject<THREE.Group | null>
    armL: RefObject<THREE.Group | null>
    armR: RefObject<THREE.Group | null>
    torso: RefObject<THREE.Group | null>
  }
}) {
  return (
    <group name="farmer">
      {/* legs: pivot at the hip, mostly hidden by the longyi; sandals at the bottom */}
      {([['legL', -0.11, refs.legL], ['legR', 0.11, refs.legR]] as const).map(([name, x, ref]) => (
        <group key={name} name={name} ref={ref} position={[x, 0.66, 0]}>
          <Box size={[0.15, 0.6, 0.16]} pos={[0, -0.32, 0]} mat={m.skin} />
          <Box size={[0.17, 0.04, 0.27]} pos={[0, -0.64, 0.04]} mat={m.sole} />
          <Box size={[0.17, 0.03, 0.05]} pos={[0, -0.6, 0.09]} mat={m.strap} />
        </group>
      ))}
      {/* longyi: slightly flared, with the knot at the front of the waist */}
      <Box size={[0.5, 0.3, 0.36]} pos={[0, 0.63, 0]} mat={m.longyi} />
      <Box size={[0.54, 0.34, 0.39]} pos={[0, 0.32, 0]} mat={m.longyi} />
      <Box size={[0.13, 0.12, 0.08]} pos={[0, 0.71, 0.2]} mat={m.knot} />
      <Box size={[0.08, 0.18, 0.04]} pos={[0, 0.58, 0.21]} mat={m.knot} />

      <group name="torso" ref={refs.torso} position={[0, 0.78, 0]}>
        <Box size={[0.52, 0.44, 0.34]} pos={[0, 0.2, 0]} mat={m.shirt} />
        {/* mandarin collar and the button strip */}
        <Box size={[0.24, 0.05, 0.22]} pos={[0, 0.44, 0.03]} mat={m.shirt} />
        {[0.34, 0.24, 0.14].map((y) => (
          <Box key={y} size={[0.06, 0.025, 0.01]} pos={[0, y, 0.172]} mat={m.button} />
        ))}
        <group name="armL" ref={refs.armL} position={[-0.345, 0.38, 0]}>
          <Arm m={m} side={-1} holding={empty ? null : 'rice'} />
        </group>
        <group name="armR" ref={refs.armR} position={[0.345, 0.38, 0]}>
          <Arm m={m} side={1} holding={empty ? null : 'hoe'} />
        </group>
        <group position={[0, 0.74, 0]}>
          <Head m={m} />
        </group>
      </group>
    </group>
  )
}

/** The same farmer sitting down with his hands forward on the controls, for the harvester's seat. */
export function SeatedFarmer() {
  const m = useFarmerMaterials()
  const refs = {
    legL: useRef<THREE.Group>(null),
    legR: useRef<THREE.Group>(null),
    armL: useRef<THREE.Group>(null),
    armR: useRef<THREE.Group>(null),
    torso: useRef<THREE.Group>(null),
  }
  useLayoutEffect(() => {
    for (const leg of [refs.legL, refs.legR]) if (leg.current) leg.current.rotation.x = -Math.PI / 2
    for (const arm of [refs.armL, refs.armR]) if (arm.current) arm.current.rotation.x = -1.0
  })
  return <VoxelFarmerBody m={m} refs={refs} empty />
}
