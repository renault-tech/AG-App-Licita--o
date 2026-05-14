import type { ThemeName } from '@/lib/theme/provider'

interface BrasaoProps {
  size?: number
  theme?: ThemeName
  brasaoUrl?: string | null
}

export function Brasao({ size = 40, theme = 'petroleo', brasaoUrl }: BrasaoProps) {
  if (brasaoUrl) {
    return (
      <img
        src={brasaoUrl}
        alt="Brasao municipal"
        width={size}
        height={size}
        className="object-contain"
        style={{ width: size, height: size }}
      />
    )
  }

  const palettes: Record<ThemeName, { outer: string; inner: string; star: string; text: string }> = {
    petroleo: { outer: '#1F3B4E', inner: '#284A62', star: '#A8693D', text: '#FFFFFF' },
    grafite:  { outer: '#171A1F', inner: '#2E3239', star: '#3A8C6E', text: '#FBFBF8' },
    brasao:   { outer: '#1F4A33', inner: '#2E6248', star: '#9C6A14', text: '#FAF8F1' },
  }

  const p = palettes[theme]

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 40 40"
      fill="none"
      aria-label="Brasao municipal"
    >
      <rect width="40" height="40" rx="6" fill={p.outer} />
      <path
        d="M20 6 L28 12 V22 C28 27 24 32 20 34 C16 32 12 27 12 22 V12 Z"
        fill={p.inner}
        stroke={p.star}
        strokeWidth="0.75"
      />
      <path
        d="M20 14 L21.5 18.5 H26 L22.5 21 L24 25.5 L20 23 L16 25.5 L17.5 21 L14 18.5 H18.5 Z"
        fill={p.star}
      />
      <text
        x="20"
        y="39"
        textAnchor="middle"
        fontSize="5"
        fontWeight="700"
        letterSpacing="0.08em"
        fill={p.text}
        opacity="0.6"
      >
        BR
      </text>
    </svg>
  )
}
