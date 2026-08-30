import { cn } from '../lib/utils'

export type MascotVariant = 'happy' | 'wink' | 'surprised'

interface MascotProps {
  variant?: MascotVariant
  size?: number
  className?: string
}

const BODY_POINTS =
  '100,25 128.2,66.2 176.1,80.3 145.7,119.8 147,169.7 100,153 53,169.7 54.3,119.8 23.9,80.3 71.8,66.2'

export function Mascot({ variant = 'happy', size = 160, className }: MascotProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 200"
      role="img"
      aria-label="Storyza mascot"
      className={cn('drop-shadow-[0_12px_20px_rgba(32,122,245,0.35)]', className)}
    >
      <defs>
        <linearGradient id="mascot-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#5cbbff" />
          <stop offset="1" stopColor="#207af5" />
        </linearGradient>
      </defs>

      {/* star body */}
      <polygon
        points={BODY_POINTS}
        fill="url(#mascot-body)"
        stroke="url(#mascot-body)"
        strokeWidth="26"
        strokeLinejoin="round"
      />

      {/* glossy highlight */}
      <ellipse
        cx="78"
        cy="66"
        rx="30"
        ry="18"
        fill="#ffffff"
        opacity="0.25"
        transform="rotate(-24 78 66)"
      />

      {/* face */}
      {variant === 'wink' ? (
        <path d="M66 100 q10 -9 20 0" stroke="#1e3a8a" strokeWidth="5" strokeLinecap="round" fill="none" />
      ) : (
        <circle cx="78" cy="98" r="10" fill="#ffffff" />
      )}
      {variant === 'surprised' ? (
        <circle cx="122" cy="98" r="11" fill="#ffffff" />
      ) : (
        <circle cx="122" cy="98" r="10" fill="#ffffff" />
      )}
      <circle cx="80" cy="100" r="5" fill="#1e3a8a" />
      <circle cx="124" cy="100" r="5" fill="#1e3a8a" />
      <circle cx="81.5" cy="97.5" r="1.8" fill="#ffffff" />
      <circle cx="125.5" cy="97.5" r="1.8" fill="#ffffff" />

      {/* cheeks */}
      <circle cx="60" cy="118" r="7" fill="#ff6b81" opacity="0.55" />
      <circle cx="140" cy="118" r="7" fill="#ff6b81" opacity="0.55" />

      {/* mouth */}
      {variant === 'surprised' ? (
        <ellipse cx="100" cy="128" rx="6" ry="8" fill="#1e3a8a" />
      ) : (
        <path d="M84 122 q16 12 32 0" stroke="#1e3a8a" strokeWidth="5" strokeLinecap="round" fill="none" />
      )}

      {/* sparkles */}
      <circle cx="172" cy="36" r="3.5" fill="#ffc31c" />
      <circle cx="24" cy="46" r="2.5" fill="#ff6b81" />
      <circle cx="186" cy="128" r="2.5" fill="#ffc31c" />
    </svg>
  )
}