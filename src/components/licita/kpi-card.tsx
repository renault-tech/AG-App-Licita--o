import type { ReactNode } from 'react'
import Link from 'next/link'

interface KPICardProps {
  label: string
  value: string | number
  sub?: string
  icon?: ReactNode
  trend?: { value: number; label?: string }
  accent?: boolean
  className?: string
  href?: string
}

export function KPICard({ label, value, sub, icon, trend, accent = false, className = '', href }: KPICardProps) {
  const trendPositive = trend && trend.value >= 0
  const trendColor = trendPositive ? 'var(--success)' : 'var(--danger)'

  const inner = (
    <div
      className={`relative flex flex-col gap-3 rounded-[var(--r-lg)] border border-hairline bg-surface p-5 ${href ? 'transition-shadow hover:shadow-md cursor-pointer' : ''} ${className}`}
      style={accent ? { borderColor: 'var(--primary)', boxShadow: '0 0 0 1px var(--primary)' } : {}}
    >
      {accent && (
        <div
          className="absolute inset-x-0 top-0 h-[3px] rounded-t-[var(--r-lg)]"
          style={{ background: 'var(--primary)' }}
        />
      )}

      <div className="flex items-start justify-between gap-2">
        <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted">
          {label}
        </span>
        {icon && (
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--r-md)]"
            style={{ background: 'var(--primaryWash)', color: 'var(--primary)' }}
          >
            {icon}
          </span>
        )}
      </div>

      <div>
        <div
          className="font-heading text-3xl font-bold leading-none tracking-tight"
          style={{ fontFamily: 'var(--font-heading)', color: accent ? 'var(--primary)' : 'var(--ink)' }}
        >
          {value}
        </div>
        {sub && (
          <p className="mt-1 text-xs text-muted">{sub}</p>
        )}
      </div>

      {trend && (
        <div className="flex items-center gap-1 text-[11px] font-semibold" style={{ color: trendColor }}>
          <span>{trendPositive ? '▲' : '▼'}</span>
          <span>{Math.abs(trend.value)}%{trend.label ? ` ${trend.label}` : ''}</span>
        </div>
      )}
    </div>
  )

  if (href) return <Link href={href} className="block">{inner}</Link>
  return inner
}
