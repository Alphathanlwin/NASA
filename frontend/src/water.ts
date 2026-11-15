// AI-assisted: Claude Code
// Rivers and ponds at 18 m: the JRC Global Surface Water "occurrence" map (EC Joint Research Centre,
// from NASA/USGS Landsat 1984-2021, CC BY 4.0). Each tile pixel is coloured by how often it was water:
// blue = water in most years (rivers, ponds), faint pink = water only sometimes (paddies flooded in the
// monsoon). Only blue counts as water, so rice paddies stay plantable. Read in the browser from the
// public tiles; when offline the answer is null and the 500 m MODIS land cover check is used alone.
// Raw pixels run from red to blue; blue and opacity both equal how often the spot was water (0-255).
import type { LatLng } from './userfields'

const TILES = 'https://storage.googleapis.com/global-surface-water/tiles2021/occurrence'
const Z = 13 // about 18 m per pixel in the Delta

/** Water in at least 40% of the years. Narrow rivers blend to purple at this zoom and still count;
 *  paddies flooded only in some monsoons stay far below. */
export function isWaterPixel(_r: number, _g: number, b: number, a: number): boolean {
  return a >= 100 && b >= 100
}

/** Web Mercator tile and pixel under a point. */
export function tilePixel([lat, lon]: LatLng, z: number) {
  const n = 2 ** z
  const fx = ((lon + 180) / 360) * n
  const phi = (lat * Math.PI) / 180
  const fy = ((1 - Math.log(Math.tan(phi) + 1 / Math.cos(phi)) / Math.PI) / 2) * n
  const x = Math.floor(fx), y = Math.floor(fy)
  return { x, y, px: Math.floor((fx - x) * 256), py: Math.floor((fy - y) * 256) }
}

// 'dry': the service has no tile there because no water was ever seen
const tiles = new Map<string, Promise<ImageData | 'dry' | null>>()
function tile(x: number, y: number): Promise<ImageData | 'dry' | null> {
  const key = `${x}/${y}`
  let p = tiles.get(key)
  if (!p) {
    p = fetch(`${TILES}/${Z}/${x}/${y}.png`)
      .then(async (r) => {
        if (r.status === 404) return 'dry' as const
        if (!r.ok) throw new Error(String(r.status))
        const img = await createImageBitmap(await r.blob())
        const c = document.createElement('canvas')
        c.width = img.width; c.height = img.height
        const ctx = c.getContext('2d', { willReadFrequently: true })!
        ctx.drawImage(img, 0, 0)
        return ctx.getImageData(0, 0, img.width, img.height)
      })
      .catch(() => null)
    tiles.set(key, p)
  }
  return p
}

/** True on a river or pond, false on land or seasonal flooding, null when the map can't be read. */
export async function waterAt(p: LatLng): Promise<boolean | null> {
  const { x, y, px, py } = tilePixel(p, Z)
  const img = await tile(x, y)
  if (img === 'dry') return false
  if (!img) return null
  const i = (py * img.width + px) * 4
  const d = img.data
  return isWaterPixel(d[i], d[i + 1], d[i + 2], d[i + 3])
}
