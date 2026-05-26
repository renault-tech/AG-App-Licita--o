import type { LucideIcon } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

interface EmptyStateCTA {
  label:    string
  href?:    string
  onClick?: () => void
}

interface EmptyStateProps {
  icon:      LucideIcon
  titulo:    string
  descricao: string
  cta?:      EmptyStateCTA
  className?: string
}

export function EmptyState({ icon: Icon, titulo, descricao, cta, className = '' }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center justify-center py-14 px-6 text-center ${className}`}>
      <div
        className="w-12 h-12 rounded-full flex items-center justify-center mb-4"
        style={{ background: 'var(--surface)', border: '1px solid var(--hairline)' }}
      >
        <Icon className="w-6 h-6" style={{ color: 'var(--muted)' }} />
      </div>
      <p className="text-sm font-semibold mb-1" style={{ color: 'var(--ink)' }}>
        {titulo}
      </p>
      <p className="text-xs mb-5 max-w-xs" style={{ color: 'var(--muted)' }}>
        {descricao}
      </p>
      {cta && (
        cta.href ? (
          <Link href={cta.href}>
            <Button size="sm" className="h-8 text-xs">
              {cta.label}
            </Button>
          </Link>
        ) : (
          <Button size="sm" className="h-8 text-xs" onClick={cta.onClick}>
            {cta.label}
          </Button>
        )
      )}
    </div>
  )
}
