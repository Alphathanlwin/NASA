// AI-assisted: Claude Code
// Field Shift mark: a plot split by an irrigation canal. Rice rows sit on the left, the next
// crop's rows on the right are set half a row lower: the field "shifts" to a new crop.
export function LogoMark({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true" className="logo-mark">
      <rect width="64" height="64" rx="16" fill="#0f3b33" />
      <rect x="1.5" y="1.5" width="61" height="61" rx="14.5" fill="none" stroke="#ffffff" strokeOpacity="0.12" strokeWidth="1.5" />
      <path d="M32 13v38" stroke="#6fb3d6" strokeWidth="3" strokeLinecap="round" />
      <g strokeWidth="6" strokeLinecap="round" fill="none">
        <path d="M14 17h11M14 27h11M14 37h11M14 47h11" stroke="#8fbf5a" />
        <path d="M39 22h11M39 32h11M39 42h11" stroke="#e3a21a" />
      </g>
    </svg>
  )
}
