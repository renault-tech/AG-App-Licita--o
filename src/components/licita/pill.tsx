import type { ReactNode } from 'react'

type PillVariant = 'default' | 'primary' | 'accent' | 'success' | 'warn' | 'danger' | 'muted'

const VARIANT_STYLE: Record<PillVariant, React.CSSProperties> = {
  default: { background: 'var(--surfaceSink)', color: 'var(--inkSoft)', border: '1px solid var(--hairline)' },
  primary: { background: 'var(--primaryWash)', color: 'var(--primary)', border: '1px solid transparent' },
  accent:  { background: 'var(--accentWash)',  color: 'var(--accent)',  border: '1px solid transparent' },
  success: { background: 'var(--successWash)', color: 'var(--success)', border: '1px solid transparent' },
  warn:    { background: 'var(--warnWash)',    color: 'var(--warn)',    border: '1px solid transparent' },
  danger:  { background: 'var(--dangerWash)',  color: 'var(--danger)',  border: '1px solid transparent' },
  muted:   { background: 'var(--surfaceSink)', color: 'var(--muted)',   border: '1px solid transparent' },
}

interface PillProps {
  children: ReactNode
  variant?: PillVariant
  size?: 'sm' | 'md'
  icon?: ReactNode
  className?: string
}

export function Pill({ children, variant = 'default', size = 'md', icon, className = '' }: PillProps) {
  return (
    <span
      className={`
        inline-flex items-center gap-1 rounded-[var(--r-pill)] font-medium
        ${size === 'sm' ? 'px-2 py-0.5 text-[10.5px]' : 'px-2.5 py-1 text-xs'}
        ${className}
      `}
      style={VARIANT_STYLE[variant]}
    >
      {icon && <span className="shrink-0">{icon}</span>}
      {children}
    </span>
  )
}
