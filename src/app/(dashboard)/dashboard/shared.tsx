import React from 'react'
import { EditorialKicker, HeadlineSerif, Wordmark } from '@/components/licita/editorial'

export function FooterEditorial() {
  return (
    <div className="pt-4 flex items-center justify-between" style={{ borderTop: '1px solid var(--hairline)' }}>
      <Wordmark />
      <div className="font-mono text-[9.5px]" style={{ color: 'var(--muted)', letterSpacing: '0.12em' }}>
        Painel atualizado · {new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }).replaceAll('/', '·')}
      </div>
    </div>
  )
}

export function SectionHeader({
  supTitle, title, contextLine, subtitle, action,
}: {
  supTitle: string
  title: string
  contextLine?: string
  subtitle?: string
  action?: React.ReactNode
}) {
  const hoje = new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }).replaceAll('/', '·')
  return (
    <div>
      <div className="flex items-center justify-between pb-3.5 mb-5" style={{ borderBottom: '2px solid var(--rule)' }}>
        <EditorialKicker kicker={supTitle} date={hoje} />
        <div className="font-mono text-[10px] font-semibold uppercase hidden sm:block" style={{ color: 'var(--muted)', letterSpacing: '0.14em' }}>
          Lei 14.133/21
        </div>
      </div>
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-6">
        <div>
          {subtitle && <div className="l-meta mb-2" style={{ color: 'var(--muted)' }}>{subtitle}</div>}
          <HeadlineSerif size="lg" as="h1">{title}</HeadlineSerif>
          {contextLine && (
            <p className="mt-3 l-h" style={{ fontFamily: 'var(--font-heading)', fontStyle: 'italic', fontSize: 19, lineHeight: 1.4, color: 'var(--inkSoft)', fontWeight: 400, maxWidth: '54ch' }}>
              {contextLine}
            </p>
          )}
        </div>
        {action}
      </div>
    </div>
  )
}

export function ListCard({ title, subtitle, action, children }: {
  title: string
  subtitle?: string
  action?: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <div className="rounded-[var(--r-lg)] border overflow-hidden" style={{ background: 'var(--surface)', borderColor: 'var(--hairline)', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}>
      <div className="flex flex-row items-center justify-between px-6 py-5 border-b" style={{ background: 'var(--surfaceAlt)', borderColor: 'var(--hairline)' }}>
        <div>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--ink)', fontFamily: 'var(--font-heading)' }}>{title}</h2>
          {subtitle && <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}
