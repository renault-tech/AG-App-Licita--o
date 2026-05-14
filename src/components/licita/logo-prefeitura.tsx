/* eslint-disable @next/next/no-img-element */
'use client'

import { Brasao } from './brasao'
import type { ThemeName } from '@/lib/theme/provider'

interface LogoPrefeituraProps {
  brasaoUrl?: string | null
  theme?: ThemeName
  /** Altura em px — largura calculada automaticamente pela proporção natural da imagem */
  height?: number
  className?: string
}

/**
 * Identidade visual da prefeitura.
 * Com brasaoUrl: exibe imagem com proporção preservada via object-contain.
 * Sem brasaoUrl: exibe brasao SVG gerado por tema.
 */
export function LogoPrefeitura({
  brasaoUrl,
  theme = 'petroleo',
  height = 40,
  className = '',
}: LogoPrefeituraProps) {
  if (!brasaoUrl) {
    return <Brasao size={height} theme={theme} className={className} />
  }

  return (
    <div
      className={`shrink-0 flex items-center justify-center ${className}`}
      style={{ height }}
    >
      <img
        src={brasaoUrl}
        alt="Logo da prefeitura"
        style={{ height, width: 'auto', maxWidth: Math.round(height * 0.75), objectFit: 'contain' }}
      />
    </div>
  )
}
