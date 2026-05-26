'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import {
  TICKER_CATEGORIAS,
  type TickerCategoriaId,
  type TickerEvento,
} from '@/lib/ticker/categorias'

const TONE_COLORS: Record<TickerEvento['tone'], string> = {
  accent:  'var(--accent)',
  success: '#5BC892',
  warn:    '#E8B547',
  danger:  '#E07D7D',
  neutral: 'rgba(255,255,255,0.55)',
}

export function TickerStrip({
  eventos,
  categoriasAtivas,
}: {
  eventos: TickerEvento[]
  categoriasAtivas: Record<TickerCategoriaId, boolean>
}) {
  const iconePorCat = useMemo(
    () => Object.fromEntries(TICKER_CATEGORIAS.map(c => [c.id, c.icon])),
    [],
  )
  const filtrados = eventos.filter(e => categoriasAtivas[e.categoria])

  if (filtrados.length === 0) {
    return (
      <div
        className="h-8 flex items-center justify-center"
        style={{ background: 'var(--ink)' }}
      >
        <span className="font-mono text-[10px]" style={{ color: 'rgba(255,255,255,0.5)', letterSpacing: '0.18em' }}>
          FAIXA DESATIVADA · CONFIGURAÇÕES → FAIXA DE INFORMAÇÕES
        </span>
      </div>
    )
  }

  const items = [...filtrados, ...filtrados, ...filtrados]
  const dur = Math.max(40, filtrados.length * 6)

  return (
    <div
      className="relative flex items-center overflow-hidden h-8"
      style={{
        background: 'var(--ink)',
        borderTop: '1px solid var(--rule)',
        borderBottom: '1px solid rgba(0,0,0,0.15)',
      }}
    >
      {/* Selo AO VIVO */}
      <div
        className="shrink-0 h-full flex items-center gap-1.5 px-3.5 font-mono"
        style={{
          background: 'var(--accent)', color: 'var(--accentInk)',
          fontSize: 9.5, fontWeight: 700, letterSpacing: '0.22em',
          zIndex: 2, position: 'relative',
        }}
      >
        <span
          className="w-1.5 h-1.5 rounded-full"
          style={{ background: 'var(--accentInk)', animation: 'licita-pulse 1.6s ease-in-out infinite' }}
        />
        AO VIVO
      </div>

      {/* Fade esquerda */}
      <div
        className="absolute top-0 bottom-0 w-6 pointer-events-none"
        style={{ left: 84, zIndex: 1, background: 'linear-gradient(to right, var(--ink), transparent)' }}
      />
      {/* Fade direita */}
      <div
        className="absolute right-0 top-0 bottom-0 w-8 pointer-events-none z-[1]"
        style={{ background: 'linear-gradient(to left, var(--ink), transparent)' }}
      />

      {/* Track animado */}
      <div className="flex-1 overflow-hidden relative h-full">
        <div
          className="flex items-center h-full whitespace-nowrap"
          style={{ animation: `licita-ticker ${dur}s linear infinite`, willChange: 'transform' }}
        >
          {items.map((it, i) => {
            const tone    = TONE_COLORS[it.tone]
            const content = (
              <>
                <span className="font-mono text-[12px] font-bold w-3.5 text-center shrink-0" style={{ color: tone, lineHeight: 1 }}>
                  {iconePorCat[it.categoria] ?? '·'}
                </span>
                <span className="font-mono text-[9.5px] font-bold uppercase" style={{ color: 'rgba(255,255,255,0.55)', letterSpacing: '0.12em' }}>
                  {it.num}
                </span>
                <span className="text-[11.5px] font-medium" style={{ color: 'rgba(255,255,255,0.92)', letterSpacing: '-0.005em' }}>
                  {it.txt}
                </span>
                <span className="font-mono text-[9px] font-semibold pl-0.5" style={{ color: 'rgba(255,255,255,0.4)', letterSpacing: '0.08em' }}>
                  {it.ts}
                </span>
              </>
            )

            const itemClass = 'inline-flex items-center gap-2.5 h-full px-[18px]'
            const itemStyle = { borderRight: '1px solid rgba(255,255,255,0.08)' }

            if (it.href) {
              return (
                <Link
                  key={i}
                  href={it.href}
                  className={`${itemClass} hover:bg-white/5 transition-colors`}
                  style={itemStyle}
                >
                  {content}
                </Link>
              )
            }

            return (
              <div key={i} className={itemClass} style={itemStyle}>
                {content}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
