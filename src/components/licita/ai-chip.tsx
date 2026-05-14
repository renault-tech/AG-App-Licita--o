'use client'

import { Sparkles, Loader2 } from 'lucide-react'

interface AIChipProps {
  label?: string
  loading?: boolean
  onClick?: () => void
  disabled?: boolean
  credits?: number
  size?: 'sm' | 'md'
  variant?: 'default' | 'ghost'
  className?: string
}

export function AIChip({
  label = 'Aprimorar com IA',
  loading = false,
  onClick,
  disabled = false,
  credits,
  size = 'md',
  variant = 'default',
  className = '',
}: AIChipProps) {
  const isSmall = size === 'sm'

  const baseStyle: React.CSSProperties = variant === 'default'
    ? {
        background: 'var(--primaryWash)',
        color: 'var(--primary)',
        border: '1px solid var(--primary)',
      }
    : {
        background: 'transparent',
        color: 'var(--muted)',
        border: '1px solid var(--hairline)',
      }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className={`
        inline-flex items-center gap-1.5 font-semibold transition-all
        rounded-[var(--r-pill)] cursor-pointer
        hover:opacity-80 active:scale-95
        disabled:opacity-40 disabled:cursor-not-allowed
        ${isSmall ? 'px-2.5 py-1 text-[11px]' : 'px-3 py-1.5 text-xs'}
        ${className}
      `}
      style={baseStyle}
    >
      {loading
        ? <Loader2 className={`animate-spin shrink-0 ${isSmall ? 'w-3 h-3' : 'w-3.5 h-3.5'}`} />
        : <Sparkles className={`shrink-0 ${isSmall ? 'w-3 h-3' : 'w-3.5 h-3.5'}`} />
      }
      <span>{loading ? 'Gerando...' : label}</span>
      {credits !== undefined && !loading && (
        <span
          className="ml-0.5 rounded-full px-1.5 py-0.5 text-[9px] font-bold"
          style={{ background: 'var(--accentWash)', color: 'var(--accent)' }}
        >
          {credits} cr
        </span>
      )}
    </button>
  )
}
