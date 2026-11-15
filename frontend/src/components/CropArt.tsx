// AI-assisted: Claude Code
// Crop photos, bundled with the app so they work offline. Decorative: the crop name is always shown next to them.
import blackGramPhoto from '../assets/black_gram.jpg'
import mungBeanPhoto from '../assets/mung_bean.jpg'
import ricePhoto from '../assets/rice.jpg'

const PHOTOS: Record<string, string> = { black_gram: blackGramPhoto, mung_bean: mungBeanPhoto, rice: ricePhoto }
// CC BY-SA requires credit with the photo: shown on hover / long-press. Full credits: docs/REFERENCES.md
const CREDIT: Record<string, string> = {
  black_gram: 'Photo: Sanjay Acharya, Wikimedia Commons, CC BY-SA 3.0 (cropped)',
  mung_bean: 'Photo: Sanjay Acharya, Wikimedia Commons, CC BY-SA 4.0 (cropped)',
  rice: 'Photo: Undeka 11, Wikimedia Commons, CC BY-SA 4.0 (cropped)',
}

export function CropArt({ crop, size = 72 }: { crop: string; size?: number }) {
  const photo = PHOTOS[crop]
  if (photo) return <img src={photo} width={size} height={size} alt="" title={CREDIT[crop]} className="crop-art crop-photo" />
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" className="crop-art">
      <circle cx="32" cy="32" r="31" fill="#ebe8e1" />
    </svg>
  )
}
