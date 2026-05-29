'use client'

import { useState, useRef } from 'react'
import type { TramitacaoHistoricoRow, FaseProcesso } from '@/types/database'
import { LABEL_PAPEL, COR_PAPEL, ICONE_PAPEL, ORDEM_FLUXO } from '@/lib/permissions'

interface ProcessoTimelineProps {
  historico: TramitacaoHistoricoRow[]
  faseAtual: FaseProcesso
  onSetorClick?: (fase: FaseProcesso) => void
  className?: string
}

type StatusEtapa = 'concluido' | 'pendente' | 'em_andamento' | 'aguardando'

function calcularStatusEtapas(
  historico: TramitacaoHistoricoRow[],
  faseAtual: FaseProcesso
): Record<FaseProcesso, StatusEtapa> {
  const indiceAtual = ORDEM_FLUXO.indexOf(faseAtual)
  const resultado = {} as Record<FaseProcesso, StatusEtapa>

  // Fases que ja tiveram pelo menos uma entrada no historico como "de_papel"
  // Isso cobre o caso da 2a passagem do setor_licitacao (apos parecer):
  // o procurador ja foi "de_papel" no historico, entao deve aparecer como concluido
  // mesmo que indiceAtual da fase atual seja menor que o indice do procurador.
  const fasesComHistorico = new Set(historico.map(h => h.de_papel))

  ORDEM_FLUXO.forEach((fase, i) => {
    const faseComoFase = fase as FaseProcesso
    const jaPassouPelaFase = fasesComHistorico.has(faseComoFase)

    if (fase === faseAtual) {
      resultado[faseComoFase] = 'em_andamento'
    } else if (i < indiceAtual || jaPassouPelaFase) {
      const temPendencia = historico.some(
        h => h.de_papel === faseComoFase && h.pendencias && h.pendencias.length > 0
      )
      resultado[faseComoFase] = temPendencia ? 'pendente' : 'concluido'
    } else {
      resultado[faseComoFase] = 'aguardando'
    }
  })

  return resultado
}

function calcularCorConectora(statusA: StatusEtapa, statusB: StatusEtapa): string {
  if (statusA === 'concluido' && statusB === 'concluido') return '#22C55E'
  if (statusA === 'concluido' && statusB === 'pendente') return '#F59E0B'
  if (statusA === 'concluido' && statusB === 'em_andamento') return '#22C55E'
  if (statusA === 'pendente') return '#F59E0B'
  return '#CBD5E1'
}

function encontrarUltimaEntradaDaFase(
  historico: TramitacaoHistoricoRow[],
  fase: FaseProcesso
): TramitacaoHistoricoRow | null {
  const entradas = historico.filter(h => h.para_papel === fase || h.de_papel === fase)
  return entradas.length > 0 ? entradas[entradas.length - 1] : null
}

function formatarDataHora(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export function ProcessoTimeline({
  historico,
  faseAtual,
  onSetorClick,
  className = '',
}: ProcessoTimelineProps) {
  const [hoveredFase, setHoveredFase] = useState<FaseProcesso | null>(null)
  const [tooltipPos, setTooltipPos] = useState({ top: 0, left: 0 })
  const containerRef = useRef<HTMLDivElement>(null)

  // Filtra ORDEM_FLUXO para apenas FaseProcesso (exclui admin_organizacao e admin_plataforma)
  const fasesDaTimeline = ORDEM_FLUXO.filter(
    p => p !== 'admin_organizacao' && p !== 'admin_plataforma'
  ) as FaseProcesso[]

  const statusEtapas = calcularStatusEtapas(historico, faseAtual)

  const COR_STATUS: Record<StatusEtapa, string> = {
    concluido:    '#22C55E',
    pendente:     '#F59E0B',
    em_andamento: '#7C3AED',
    aguardando:   '#CBD5E1',
  }

  const SOMBRA_STATUS: Record<StatusEtapa, string> = {
    concluido:    '0 0 0 3px #22C55E',
    pendente:     '0 0 0 3px #F59E0B',
    em_andamento: '0 0 0 4px #C4B5FD',
    aguardando:   'none',
  }

  function handleMouseEnter(fase: FaseProcesso, e: React.MouseEvent<HTMLButtonElement>) {
    setHoveredFase(fase)
    const rect = e.currentTarget.getBoundingClientRect()
    const containerRect = containerRef.current?.getBoundingClientRect()
    if (containerRect) {
      setTooltipPos({
        top: rect.bottom - containerRect.top + 8,
        left: rect.left + rect.width / 2 - containerRect.left,
      })
    }
  }

  const tooltipData = hoveredFase ? encontrarUltimaEntradaDaFase(historico, hoveredFase) : null
  const statusHovered = hoveredFase ? statusEtapas[hoveredFase] : null

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <div className="flex items-center justify-between px-2 py-4 relative">
        {fasesDaTimeline.map((fase, idx) => {
          const status = statusEtapas[fase]
          const isLast = idx === fasesDaTimeline.length - 1
          const corNo = COR_STATUS[status]
          const sombra = SOMBRA_STATUS[status]
          const isAtual = fase === faseAtual

          return (
            <div key={fase} className="flex items-center flex-1">
              <div className="flex flex-col items-center gap-1.5" style={{ minWidth: 64 }}>
                <button
                  type="button"
                  onMouseEnter={e => handleMouseEnter(fase, e)}
                  onMouseLeave={() => setHoveredFase(null)}
                  onClick={() => onSetorClick?.(fase)}
                  title={LABEL_PAPEL[fase]}
                  style={{
                    width: 48, height: 48,
                    borderRadius: '50%',
                    background: corNo,
                    border: '3px solid white',
                    boxShadow: isAtual ? undefined : sombra,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    cursor: onSetorClick ? 'pointer' : 'default',
                    fontSize: 20,
                    animation: isAtual ? 'pulse-ring 2s infinite' : undefined,
                    opacity: status === 'aguardando' ? 0.5 : 1,
                    transition: 'transform 0.15s',
                  }}
                  onFocus={e => { e.currentTarget.style.transform = 'scale(1.1)' }}
                  onBlur={e => { e.currentTarget.style.transform = 'scale(1)' }}
                >
                  {ICONE_PAPEL[fase]}
                </button>
                <span
                  className="text-[10px] font-bold text-center leading-tight"
                  style={{ color: status === 'aguardando' ? '#94A3B8' : '#1E293B', maxWidth: 64 }}
                >
                  {LABEL_PAPEL[fase]}
                </span>
                {status !== 'aguardando' && (
                  <span
                    className="text-[9px] px-1.5 py-0.5 rounded font-semibold"
                    style={{
                      background: status === 'concluido' ? '#F0FDF4'
                               : status === 'pendente'   ? '#FFFBEB'
                               : status === 'em_andamento' ? '#F5F3FF' : '#F8FAFC',
                      color: status === 'concluido' ? '#15803D'
                           : status === 'pendente'   ? '#B45309'
                           : status === 'em_andamento' ? '#6D28D9' : '#64748B',
                      border: `1px solid ${status === 'concluido' ? '#86EFAC'
                             : status === 'pendente'   ? '#FCD34D'
                             : status === 'em_andamento' ? '#A78BFA' : '#E2E8F0'}`,
                    }}
                  >
                    {status === 'concluido' ? '✓ Concluido'
                    : status === 'pendente' ? '⚠ Pendencia'
                    : status === 'em_andamento' ? '● Em andamento' : '○ Aguardando'}
                  </span>
                )}
              </div>

              {!isLast && (
                <div
                  className="flex-1 h-1 mx-1"
                  style={{
                    background: calcularCorConectora(status, statusEtapas[fasesDaTimeline[idx + 1]]),
                    minWidth: 8,
                  }}
                />
              )}
            </div>
          )
        })}
      </div>

      {hoveredFase && (
        <div
          className="absolute z-50 pointer-events-none"
          style={{
            top: tooltipPos.top,
            left: tooltipPos.left,
            transform: 'translateX(-50%)',
          }}
        >
          <div
            className="rounded-xl shadow-xl p-3"
            style={{ background: '#1E293B', minWidth: 220, maxWidth: 300 }}
          >
            <div className="text-[10px] text-slate-400 uppercase tracking-wide mb-2">
              {LABEL_PAPEL[hoveredFase]}
            </div>
            {statusHovered === 'aguardando' ? (
              <div className="text-[12px] text-slate-400">Aguardando chegada do processo</div>
            ) : tooltipData ? (
              <div className="flex flex-col gap-1.5 text-[12px]">
                <div className="flex gap-2">
                  <span style={{ color: COR_PAPEL[hoveredFase] }}>&#128100;</span>
                  <span className="text-white font-semibold">{tooltipData.nome_usuario}</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-blue-400">&#128197;</span>
                  <span className="text-slate-300">{formatarDataHora(tooltipData.created_at)}</span>
                </div>
                {tooltipData.tipo === 'avanco' && (
                  <div className="flex gap-2">
                    <span className="text-yellow-400">&#8594;</span>
                    <span className="text-slate-300">
                      Enviado para {LABEL_PAPEL[tooltipData.para_papel]}
                    </span>
                  </div>
                )}
                {tooltipData.tipo === 'devolucao' && tooltipData.motivo && (
                  <div className="flex gap-2">
                    <span className="text-red-400">&#8617;</span>
                    <span className="text-red-300">{tooltipData.motivo}</span>
                  </div>
                )}
                {tooltipData.pendencias && tooltipData.pendencias.length > 0 && (
                  <div className="flex gap-2">
                    <span className="text-yellow-400">&#9888;</span>
                    <span className="text-yellow-300">{tooltipData.pendencias.join(', ')}</span>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-[12px] text-slate-400">Sem historico disponivel</div>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes pulse-ring {
          0%, 100% { box-shadow: 0 0 0 4px #C4B5FD; }
          50%       { box-shadow: 0 0 0 8px #DDD6FE; }
        }
      `}</style>
    </div>
  )
}
