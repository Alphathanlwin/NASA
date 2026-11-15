// AI-assisted: Claude Code
// Paddy plant geometry for the instanced crop rows: a clump of thin blades fanning out from one base, and,
// once the grain fills, drooping panicles. Both are built to unit height so the rows scale them by growth.
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

const rand = (i: number) => {
  const x = Math.sin(i * 91.345 + 17.17) * 43758.5453
  return x - Math.floor(x)
}

/** One curved, tapering blade as a flat strip, leaning out along `angle`. */
function blade(angle: number, height: number, lean: number, width: number, seg = 5) {
  const dir = new THREE.Vector3(Math.cos(angle), 0, Math.sin(angle))
  // the blade's flat face is turned partly toward the viewer so it never shows only its edge
  const across = new THREE.Vector3(-dir.z, 0, dir.x).multiplyScalar(0.85).addScaledVector(dir, 0.15).normalize()
  const pts: THREE.Vector3[][] = []
  for (let k = 0; k <= seg; k++) {
    const t = k / seg
    const out = lean * (0.3 * t + 0.7 * t * t) // arches outward more toward the tip
    const c = dir.clone().multiplyScalar(out).setY(height * t - lean * 0.25 * t * t * t)
    const w = width * Math.pow(1 - t, 0.75) * 0.5
    pts.push([c.clone().addScaledVector(across, -w), c.clone().addScaledVector(across, w)])
  }
  const pos: number[] = []
  for (let k = 0; k < seg; k++) {
    const [a, b] = pts[k]
    const [c, d] = pts[k + 1]
    pos.push(a.x, a.y, a.z, b.x, b.y, b.z, c.x, c.y, c.z)
    pos.push(b.x, b.y, b.z, d.x, d.y, d.z, c.x, c.y, c.z)
  }
  const g = new THREE.BufferGeometry()
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
  g.computeVertexNormals()
  return g
}

/** Directions of the tallest blades, which carry the panicles. */
const HEAD_ANGLES = [0.4, 2.2, 3.9, 5.4]

/** A clump of 11 blades: short ones splaying wide, tall ones nearly upright. Unit height. */
export function paddyClumpGeometry() {
  const parts: THREE.BufferGeometry[] = []
  for (let i = 0; i < 7; i++) {
    const a = (i / 7) * Math.PI * 2 + rand(i) * 0.5
    parts.push(blade(a, 0.62 + rand(i + 20) * 0.22, 0.22 + rand(i + 40) * 0.12, 0.055))
  }
  for (const a of HEAD_ANGLES) parts.push(blade(a, 1.0, 0.1, 0.045))
  return mergeGeometries(parts)!
}

/** Drooping panicles at the tips of the tall blades: a row of grains arching over. Unit height. */
export function paddyHeadsGeometry() {
  const parts: THREE.BufferGeometry[] = []
  HEAD_ANGLES.forEach((a, h) => {
    const dir = new THREE.Vector3(Math.cos(a), 0, Math.sin(a))
    const n = 10
    for (let k = 0; k < n; k++) {
      const u = k / (n - 1)
      const p = dir.clone().multiplyScalar(0.1 + 0.2 * u).setY(0.98 + 0.07 * Math.sin(u * 1.6) - 0.3 * u * u)
      const grain = new THREE.IcosahedronGeometry(0.03 - u * 0.008, 0)
      grain.scale(0.75, 1.5, 0.75)
      // each grain hangs along the arch's slope
      grain.rotateZ(-0.4 - u * 1.2 + rand(h * 10 + k) * 0.2)
      grain.rotateY(-a)
      grain.translate(p.x, p.y, p.z)
      parts.push(grain)
    }
  })
  return mergeGeometries(parts)!
}
