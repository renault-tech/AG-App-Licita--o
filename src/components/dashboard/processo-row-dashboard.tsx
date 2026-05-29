import Link from 'next/link'
import { ArrowRight, Users } from 'lucide-react'
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
  valor_estimado?: number | null
  secretaria?: string | null
  criadoPorNome?: string | null
  ehMeu?: boolean
  compraConjunta?: boolean
  avisoPrazo?: string | null
}

export function ProcessoRowDashboard({
  id, objeto, numero_processo, modalidade, status, fase_atual,
  updated_at, href, diasParado, valor_estimado, secretaria,
  criadoPorNome, ehMeu = true, compraConjunta = false, avisoPrazo,
}: ProcessoRowDashboardProps) {
  const dias = diasParado ?? Math.floor((Date.now() - new Date(updated_at).getTime()) / 86400000)
  const destino = href ?? `/processos/${id}/dfd`

  const diasAteAvisoPrazo = avisoPrazo
    ? Math.ceil((new Date(avisoPrazo).getTime() - Date.now()) / 86400000)
    : null

  return (
    <Link
      href={destino}
      className="glass lift rounded-[var(--r-lg)] flex items-center gap-4 px-5 py-4 group overflow-hidden relative"
      style={!ehMeu ? { borderLeft: '3px solid var(--primarySoft, #93c5fd)' } : undefined}
    >
      {/* Informacoes do processo */}
      <div className="flex-1 min-w-0">
        <div className="flex items-baseline gap-2 min-w-0">
          {numero_processo && (
            <span
              className="text-[10.5px] font-mono shrink-0 tabular-nums"
              style={{ color: 'var(--muted)' }}
            >
              {numero_processo}
            </span>
          )}
          <p className="text-[14px] font-semibold truncate" style={{ color: 'var(--ink)', fontFamily: 'var(--font-heading)' }}>
            {objeto}
          </p>
        </div>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          <span className="text-[11.5px]" style={{ color: 'var(--muted)' }}>
            {MODALIDADE_LABEL[modalidade] ?? modalidade}
          </span>
          {(fase_atual || secretaria) && (
            <span style={{ color: 'var(--hairline)' }}>·</span>
          )}
          {secretaria && (
            <span className="text-[11.5px]" style={{ color: 'var(--muted)' }}>{secretaria}</span>
          )}
          {!secretaria && fase_atual && (
            <span className="text-[11.5px]" style={{ color: 'var(--muted)' }}>{FASE_LABEL[fase_atual] ?? fase_atual}</span>
          )}
          {criadoPorNome && (
            <>
              <span style={{ color: 'var(--hairline)' }}>·</span>
              <span className="text-[11.5px]" style={{ color: 'var(--muted)' }}>
                {ehMeu ? 'por mim' : `por ${criadoPorNome}`}
              </span>
            </>
          )}
          {compraConjunta && (
            <span
              className="inline-flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full"
              style={{ background: 'var(--primaryWash, #dbeafe)', color: 'var(--primary)' }}
            >
              <Users className="w-2.5 h-2.5" />
              Compra conjunta
            </span>
          )}
        </div>
      </div>

      {/* Valor + badges + status */}
      <div className="flex items-center gap-3 shrink-0">
        {valor_estimado != null && valor_estimado > 0 && (
          <div className="text-right hidden sm:block">
            <p className="text-[13px] font-semibold l-tnum" style={{ color: 'var(--ink)' }}>
              {valor_estimado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </p>
            <p className="text-[10px]" style={{ color: 'var(--muted)' }}>estimado</p>
          </div>
        )}
        {diasAteAvisoPrazo !== null && diasAteAvisoPrazo >= 0 && (
          <span
            className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
            style={{
              background: diasAteAvisoPrazo <= 2 ? 'var(--dangerWash)' : 'var(--warnWash)',
              color: diasAteAvisoPrazo <= 2 ? 'var(--danger)' : 'var(--warn)',
            }}
          >
            {diasAteAvisoPrazo === 0 ? 'hoje' : `${diasAteAvisoPrazo}d`}
          </span>
        )}
        {dias > 3 && (
          <span
            className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
            style={{
              background: dias > 10 ? 'var(--dangerWash)' : 'var(--warnWash)',
              color: dias > 10 ? 'var(--danger)' : 'var(--warn)',
            }}
          >
            {dias}d
          </span>
        )}
        <StatusPill status={status as StatusProcesso} size="sm" />
        <ArrowRight
          className="w-3 h-3 transition-transform group-hover:translate-x-0.5"
          style={{ color: 'var(--mutedSoft)' }}
        />
      </div>
    </Link>
  )
}
