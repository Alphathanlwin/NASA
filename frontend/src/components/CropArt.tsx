// AI-assisted: Claude Code
// Simple drawn crop illustrations (no external images). Decorative: the crop name is always shown next to them.

export function CropArt({ crop, size = 72 }: { crop: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" className="crop-art">
      <circle cx="32" cy="32" r="31" fill={crop === 'rice' ? '#fdf6dc' : crop === 'black_gram' ? '#ece9e4' : '#e6f4e3'} />
      {crop === 'rice' && <Rice />}
      {crop === 'mung_bean' && <Pods pod="#4d9a3f" podDark="#3b7f2f" seed="#7cc36a" />}
      {crop === 'black_gram' && <Pods pod="#5b5446" podDark="#433d33" seed="#1f1d1a" />}
    </svg>
  )
}

function Rice() {
  const grains = [
    [33, 15], [36, 18], [38, 22], [40, 26], [41, 30], [41, 34],
    [30, 18], [28, 22], [27, 26],
  ]
  return (
    <g>
      {/* soil line */}
      <path d="M10 54 Q32 50 54 54" stroke="#8a6a3c" strokeWidth="2" fill="none" strokeLinecap="round" />
      {/* leaves */}
      <path d="M32 54 C28 40 22 34 14 30" stroke="#5f9e3a" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M32 54 C35 42 42 38 50 36" stroke="#5f9e3a" strokeWidth="3" fill="none" strokeLinecap="round" />
      <path d="M31 54 C31 40 31 26 32 13" stroke="#6aa842" strokeWidth="2.6" fill="none" strokeLinecap="round" />
      {/* drooping panicle */}
      <path d="M32 13 C38 15 42 22 41 36" stroke="#b8952f" strokeWidth="1.6" fill="none" />
      <path d="M32 13 C28 16 26 22 27 28" stroke="#b8952f" strokeWidth="1.4" fill="none" />
      {grains.map(([x, y], i) => (
        <ellipse key={i} cx={x} cy={y} rx="2.2" ry="3.4" fill="#e2bb45" stroke="#b8952f" strokeWidth="0.6"
          transform={`rotate(${x > 32 ? -25 : 25} ${x} ${y})`} />
      ))}
    </g>
  )
}

function Pods({ pod, podDark, seed }: { pod: string; podDark: string; seed: string }) {
  return (
    <g>
      {/* stem and leaves */}
      <path d="M32 10 C31 22 33 34 32 54" stroke="#5f9e3a" strokeWidth="2.4" fill="none" strokeLinecap="round" />
      <path d="M32 18 C24 12 16 14 13 20 C20 24 27 23 32 18 Z" fill="#6aa842" />
      <path d="M32 26 C40 20 48 22 51 28 C44 32 37 31 32 26 Z" fill="#6aa842" />
      {/* pods hanging */}
      <path d="M31 30 C24 36 20 44 19 52" stroke={podDark} strokeWidth="5" fill="none" strokeLinecap="round" />
      <path d="M31 30 C24 36 20 44 19 52" stroke={pod} strokeWidth="3.2" fill="none" strokeLinecap="round" />
      <path d="M33 32 C40 38 43 45 44 52" stroke={podDark} strokeWidth="5" fill="none" strokeLinecap="round" />
      <path d="M33 32 C40 38 43 45 44 52" stroke={pod} strokeWidth="3.2" fill="none" strokeLinecap="round" />
      {/* loose seeds */}
      {[[27, 57], [32, 58], [37, 57]].map(([x, y], i) => (
        <ellipse key={i} cx={x} cy={y} rx="2.4" ry="1.8" fill={seed} />
      ))}
    </g>
  )
}
