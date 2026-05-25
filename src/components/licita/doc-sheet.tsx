'use client'

import type { ReactNode } from 'react'

export type DocSecao = { titulo: string; corpo: string }

export function DocSheet({
  kicker,
  titulo,
  meta,
  secoes,
  actions,
  footer,
  dropCap = false,
  className = '',
}: {
  kicker?: string
  titulo: string
  meta?: string
  secoes: DocSecao[]
  actions?: ReactNode
  footer?: ReactNode
  dropCap?: boolean
  className?: string
}) {
  return (
    <div
      className={`flex flex-col rounded-[var(--r-lg)] border border-hairline bg-surface ${className}`}
      style={{
        padding: '28px 38px 24px',
        boxShadow:
          '0 1px 0 rgba(15, 20, 24, 0.02), 0 12px 32px -16px rgba(15, 20, 24, 0.08)',
      }}
    >
      {/* Cabecalho */}
      <div
        className="flex items-start justify-between gap-5 pb-4 mb-5"
        style={{ borderBottom: '0.5px solid var(--hairlineSoft)' }}
      >
        <div className="flex-1 min-w-0">
          {kicker && (
            <div className="flex items-center gap-2 mb-2">
              <span
                className="text-[9.5px] font-bold uppercase"
                style={{ color: 'var(--accent)', letterSpacing: '0.2em' }}
              >
                {kicker}
              </span>
              <span className="h-px w-4" style={{ background: 'var(--accentSoft)' }} />
              <span
                className="font-mono text-[9.5px]"
                style={{ color: 'var(--muted)', letterSpacing: '0.06em' }}
              >
                Documento institucional
              </span>
            </div>
          )}
          <div
            className="l-h"
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: 26, lineHeight: 1.12, letterSpacing: '-0.018em',
              color: 'var(--ink)', fontWeight: 500, textWrap: 'balance',
            }}
          >
            {titulo}
          </div>
          {meta && (
            <div className="flex items-center gap-2 mt-2.5 text-[11px]">
              <span className="l-meta" style={{ letterSpacing: '0.16em', color: 'var(--muted)' }}>
                Por
              </span>
              <span style={{ color: 'var(--inkSoft)', fontWeight: 500 }}>{meta}</span>
            </div>
          )}
        </div>
        {actions && <div className="flex gap-1.5 shrink-0">{actions}</div>}
      </div>

      {/* Secoes */}
      <div className="flex-1">
        {secoes.map((s, i) => (
          <div key={i} className="mb-[18px]">
            <div className="flex items-baseline gap-2.5 mb-2">
              <span
                className="font-mono text-[10px] font-bold"
                style={{ color: 'var(--accent)', letterSpacing: '0.06em', lineHeight: 1 }}
              >
                § {String(i + 1).padStart(2, '0')}
              </span>
              <div
                className="l-h"
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: 14, fontWeight: 600,
                  color: 'var(--primary)', letterSpacing: '-0.008em',
                }}
              >
                {s.titulo}
              </div>
            </div>
            <p
              className={dropCap && i === 0 ? 'l-dropcap l-justify' : 'l-justify'}
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: 14, lineHeight: 1.6,
                color: 'var(--inkSoft)', margin: 0, fontWeight: 400,
              }}
            >
              {s.corpo}
            </p>
          </div>
        ))}
      </div>

      {footer}
    </div>
  )
}
