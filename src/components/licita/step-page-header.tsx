import type { ReactNode } from 'react'

interface StepPageHeaderProps {
  title: string
  subtitle?: string
  artigo?: string
  actions?: ReactNode
}

export function StepPageHeader({ title, subtitle, artigo, actions }: StepPageHeaderProps) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h1
          className="text-lg font-bold leading-snug"
          style={{ color: 'var(--ink)', fontFamily: 'var(--font-heading)' }}
        >
          {title}
        </h1>
        {subtitle && (
          <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>
            {subtitle}
          </p>
        )}
      </div>
      {(actions || artigo) && (
        <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
          {actions}
          {artigo && (
            <span
              className="hidden sm:inline-flex items-center px-2.5 py-1.5 text-xs font-medium rounded-[var(--r-md)]"
              style={{
                background: 'var(--primaryWash)',
                color: 'var(--primary)',
                border: '1px solid transparent',
              }}
            >
              {artigo}
            </span>
          )}
        </div>
      )}
    </div>
  )
}
