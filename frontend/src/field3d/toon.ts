// AI-assisted: Claude Code
// Cartoon look for the field scene: one shared three-step toon ramp and a bright palette that replaces the
// Blender materials by name, so the models keep their shapes but read like a handheld-game overworld.
import * as THREE from 'three'

/** Three flat bands of light (shadow, mid, lit). NearestFilter keeps the steps hard. */
export const TOON_RAMP = (() => {
  const steps = new Uint8Array([120, 195, 255])
  const tex = new THREE.DataTexture(steps, steps.length, 1, THREE.RedFormat)
  tex.minFilter = THREE.NearestFilter
  tex.magFilter = THREE.NearestFilter
  tex.generateMipmaps = false
  tex.needsUpdate = true
  return tex
})()

export function toon(color: THREE.ColorRepresentation, extra: THREE.MeshToonMaterialParameters = {}) {
  return new THREE.MeshToonMaterial({ color, gradientMap: TOON_RAMP, ...extra })
}

/** Blender material name → bright cartoon colour (sRGB). Names not listed keep their own colour. */
export const PALETTE: Record<string, string> = {
  // surroundings
  white: '#fff6e6',
  ground: '#86d456',
  creekWater: '#4cc6ec',
  mud: '#9a6a3e',
  nipa: '#57b445',
  canoeWood: '#9a6338',
  wood: '#b07843',
  crop_golden: '#ecc35c',
  bund: '#cf9555',
  crop_stubble: '#e0b062',
  paddyWater: '#74d6f2',
  seedlingGreen: '#86e05e',
  crop_green: '#62bf42',
  bambooWall: '#efc073',
  shade: '#4a3626',
  thatch: '#d79a52',
  clay: '#d46e43',
  bamboo: '#a7d24f',
  bambooLeaf: '#63c440',
  palmTrunk: '#a8713f',
  palmFrond: '#45b84a',
  nut: '#8a5d2c',
  straw: '#f4d470',
  gold: '#ffd23f',
  // harvester
  trim: '#ffb31f',
  body: '#2f8fe6',
  dark: '#34343e',
  steel: '#a9bcc8',
  // farmer (shared with the harvester's driver)
  skin: '#cf8f60',
  legs: '#6a4630',
  longyi: '#d23a52',
  shirt: '#fffaf0',
  hair: '#2e2019',
  hat: '#f4c86a',
  band: '#b0582e',
}

const WATER = new Set(['creekWater', 'paddyWater'])

/** Swap every mesh's material for a toon one in the palette colour, reusing one material per name. */
export function toonify(root: THREE.Object3D) {
  const made = new Map<string, THREE.MeshToonMaterial>()
  root.traverse((o) => {
    const mesh = o as THREE.Mesh
    if (!mesh.isMesh) return
    const swap = (m: THREE.Material) => {
      const key = m.name || m.uuid
      let t = made.get(key)
      if (!t) {
        const src = m as THREE.MeshStandardMaterial
        const color = PALETTE[m.name] ?? (src.color ? '#' + src.color.getHexString() : '#ffffff')
        t = toon(color, WATER.has(m.name) ? { transparent: true, opacity: 0.85 } : {})
        t.name = m.name
        t.side = m.side
        made.set(key, t)
      }
      return t
    }
    mesh.material = Array.isArray(mesh.material) ? mesh.material.map(swap) : swap(mesh.material)
  })
  return root
}
