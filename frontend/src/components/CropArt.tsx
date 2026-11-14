// AI-assisted: Claude Code
// Drawn crop illustrations (no external images): each crop is shown as what the farmer harvests
// and sells, so it can be recognised at a glance. Decorative: the crop name is always shown next to them.

// [x, y, rotation in degrees] for a small heap of seeds, back row first so front seeds overlap.
const HEAP: [number, number, number][] = [
  [22, 22, -20], [34, 19, 15], [45, 25, -35],
  [16, 34, 40], [28, 31, -5], [40, 33, 25], [50, 38, -15],
  [21, 45, -30], [33, 43, 10], [44, 47, 35],
]

const BG: Record<string, string> = { rice: '#fbf1d6', mung_bean: '#e8f1df', black_gram: '#ebe8e1' }

export function CropArt({ crop, size = 72 }: { crop: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" className="crop-art">
      <circle cx="32" cy="32" r="31" fill={BG[crop] ?? '#eee'} />
      {crop === 'black_gram' && <Beans body="#2a2723" edge="#141210" sheen="#57524a" hilum="#e6e2c6" odd={4} oddBody="#4b3a2a" />}
      {crop === 'mung_bean' && <Beans body="#5d9438" edge="#3d6b22" sheen="#8fbf5a" hilum="#eef2dc" />}
      {crop === 'rice' && <Paddy />}
    </svg>
  )
}

// Black gram and mung bean: small oval beans, each with the pale seed scar (hilum) along its side.
function Beans({ body, edge, sheen, hilum, odd, oddBody }: {
  body: string; edge: string; sheen: string; hilum: string; odd?: number; oddBody?: string
}) {
  return (
    <g>
      {HEAP.map(([x, y, r], i) => (
        <g key={i} transform={`translate(${x} ${y}) rotate(${r})`}>
          <ellipse rx="6.6" ry="4.9" fill={i === odd ? oddBody : body} stroke={edge} strokeWidth="0.8" />
          <ellipse cx="-2" cy="-2.2" rx="2.6" ry="1.1" fill={sheen} opacity="0.55" />
          <rect x="-2.6" y="0.6" width="5.2" height="1.7" rx="0.85" fill={hilum} />
        </g>
      ))}
    </g>
  )
}

// Rice: golden paddy grains, long and pointed, with the ridge along the husk.
function Paddy() {
  return (
    <g>
      {HEAP.map(([x, y, r], i) => (
        <g key={i} transform={`translate(${x} ${y}) rotate(${r + 60})`}>
          <path d="M0 -8.2 C3.4 -5 3.4 5 0 8.2 C-3.4 5 -3.4 -5 0 -8.2 Z" fill="#dcae3c" stroke="#a87a1c" strokeWidth="0.8" />
          <path d="M0 -6.6 V6.6" stroke="#b98a24" strokeWidth="0.7" />
          <path d="M0 -8.2 V-10" stroke="#a87a1c" strokeWidth="0.8" strokeLinecap="round" />
        </g>
      ))}
    </g>
  )
}
