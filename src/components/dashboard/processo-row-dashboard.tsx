import Link from 'next/link'
import { ArrowRight, FileText } from 'lucide-react'
import { StatusPill } from '@/components/licita/status-pill'
import type { StatusProcesso } from '@/components/licita/status-pill'

const MODALIDADE_LABEL: Record<string, string> = {
  pregao_eletronico:   'Pregão Eletrônico',
  pregao_presencial:   'Pregão Presencial',
  concorrencia:        'Concorrência',
  concurso:            'Concurso',
  leilao:              'Leilão',
  dialogo_competitivo: 'Diálogo Competitivo',
  dispensa:            'Dispensa',
  inexigibilidade:     'Inexigibilidade',
}

const FASE_LABEL: Record<string, string> = {
  requisitante:    'Requisitante',
  setor_compras:   'Compras',
  setor_licitacao: 'Licitações',
  procurador:      'Procuradoria',
  gestor_publico:  'Autorização',
  publicacao:      'Publicação',
}

export interface ProcessoRowDashboardProps {
  id: string
  objeto: string
  numero_processo: string | null
  modalidade: string
  status: string
  fase_atual: string | null
  updated_at: string
  href?: string
  diasParado?: number
}

export function ProcessoRowDashboard({
  id, objeto, numero_processo, modalidade, status, fase_atual, updated_at, href, diasParado,
}: ProcessoRowDashboardProps) {
  const dias = diasParado ?? Math.floor((Date.now() - new Date(updated_at).getTime()) / 86400000)
  const destino = href ?? `/processos/${id}/dfd`

  return (
    <Link
      href={destino}
      className="flex items-center gap-4 px-6 py-4 border-b transition-colors hover:bg-[var(--surfaceAlt)] last:border-b-0"
      style={{ borderColor: 'var(--hairline)' }}
    >
      <div
        className="w-9 h-9 rounded-[var(--r-md)] flex items-center justify-center shrink-0"
        style={{ background: 'var(--primaryWash)' }}
      >
        <FileText className="w-4 h-4" style={{ color: 'var(--primary)' }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[14px] font-semibold truncate" style={{ color: 'var(--ink)' }}>
          {numero_processo ? `${numero_processo} — ` : ''}{objeto}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs" style={{ color: 'var(--muted)' }}>
            {MODALIDADE_LABEL[modalidade] ?? modalidade}
          </span>
          {fase_atual && (
            <>
              <span style={{ color: 'var(--hairline)' }}>·</span>
              <span className="text-xs" style={{ color: 'var(--muted)' }}>
                {FASE_LABEL[fase_atual] ?? fase_atual}
              </span>
            </>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {dias > 0 && (
          <span
            className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
            style={{
              background: dias > 10 ? 'var(--dangerWash)' : dias > 5 ? 'var(--warnWash)' : 'var(--surfaceAlt)',
              color: dias > 10 ? 'var(--danger)' : dias > 5 ? 'var(--warn)' : 'var(--muted)',
            }}
          >
            {dias}d
          </span>
        )}
        <StatusPill status={status as StatusProcesso} size="sm" />
        <ArrowRight className="w-3.5 h-3.5" style={{ color: 'var(--mutedSoft)' }} />
      </div>
    </Link>
  )
}
