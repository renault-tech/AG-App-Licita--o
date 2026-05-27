'use client'

import Link from 'next/link'
import { ChevronRight } from 'lucide-react'

export interface FaseNode {
  key: string
  label: string
  count: number
  devolvidos: number
  parados: number
  href: string
  isCurrent?: boolean
}

export function FaseTimeline({ fases }: { fases: FaseNode[] }) {
  return (
    <div className="flex items-center gap-0 overflow-x-auto pb-1">
      {fases.map((fase, i) => {
        const hasDevolvidos = fase.devolvidos > 0
        const hasParados = fase.parados > 0 && !hasDevolvidos

        let borderColor = 'var(--hairline)'
        let bgColor = 'var(--surfaceAlt)'
        let textColor = 'var(--inkSoft)'

        if (fase.isCurrent) {
          borderColor = 'var(--primary)'
          bgColor = 'var(--primaryWash)'
          textColor = 'var(--primary)'
        } else if (hasDevolvidos) {
          borderColor = 'var(--danger)'
          bgColor = 'var(--dangerWash)'
          textColor = 'var(--danger)'
        } else if (hasParados) {
          borderColor = 'var(--warn)'
          bgColor = 'var(--warnWash)'
          textColor = 'var(--warn)'
        }

        return (
          <div key={fase.key} className="flex items-center shrink-0">
            <Link
              href={fase.href}
              className="flex flex-col items-center px-4 py-3 rounded-[var(--r-md)] border transition-all hover:opacity-80"
              style={{ borderColor, background: bgColor, minWidth: 90 }}
            >
              <span
                className="l-tnum font-semibold"
                style={{
                  fontFamily: 'var(--font-heading)',
                  fontSize: 28,
                  lineHeight: 1,
                  color: textColor,
                  letterSpacing: '-0.02em',
                }}
              >
                {fase.count}
              </span>
              <span
                className="text-[10px] font-semibold uppercase tracking-wide mt-1 text-center leading-tight"
                style={{ color: textColor }}
              >
                {fase.label}
              </span>
              {hasDevolvidos && (
                <span className="text-[9px] mt-1 font-bold" style={{ color: 'var(--danger)' }}>
                  {fase.devolvidos} devolvido{fase.devolvidos !== 1 ? 's' : ''}
                </span>
              )}
            </Link>
            {i < fases.length - 1 && (
              <ChevronRight className="w-4 h-4 mx-1 shrink-0" style={{ color: 'var(--hairline)' }} />
            )}
          </div>
        )
      })}
    </div>
  )
}
