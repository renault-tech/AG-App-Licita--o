'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Clock, CheckCircle2, XCircle, Loader2, ChevronRight,
  AlertTriangle, ArrowRightCircle, Building2
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { recusarSolicitacao, aprovarSolicitacao } from '@/lib/actions/solicitacoes'
import type { SolicitacaoResumo } from '@/lib/actions/solicitacoes'

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode }> = {
  rascunho:   { label: 'Rascunho',     variant: 'outline',     icon: <Clock className="w-3 h-3" /> },
  enviada:    { label: 'Enviada',      variant: 'secondary',   icon: <ArrowRightCircle className="w-3 h-3" /> },
  em_analise: { label: 'Em Análise',   variant: 'default',     icon: <Loader2 className="w-3 h-3" /> },
  aprovada:   { label: 'Aprovada',     variant: 'default',     icon: <CheckCircle2 className="w-3 h-3" /> },
  recusada:   { label: 'Recusada',     variant: 'destructive', icon: <XCircle className="w-3 h-3" /> },
  convertida: { label: 'Em Processo',  variant: 'default',     icon: <CheckCircle2 className="w-3 h-3" /> },
}

const PRIORIDADE_CONFIG: Record<string, { label: string; className: string }> = {
  baixa:   { label: 'Baixa',   className: 'text-gray-500 bg-gray-100' },
  media:   { label: 'Média',   className: 'text-blue-600 bg-blue-50' },
  alta:    { label: 'Alta',    className: 'text-orange-600 bg-orange-50' },
  urgente: { label: 'Urgente', className: 'text-red-600 bg-red-50' },
}

interface ModalRecusaProps {
  solicitacaoId: string
  objeto: string
  onClose: () => void
  onConfirm: (motivo: string) => void
  carregando: boolean
}

function ModalRecusa({ solicitacaoId, objeto, onClose, onConfirm, carregando }: ModalRecusaProps) {
  const [motivo, setMotivo] = useState('')
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <div className="bg-white rounded-xl shadow-xl p-6 max-w-md w-full mx-4 space-y-4">
        <h2 className="text-base font-semibold text-gray-900">Recusar Solicitação</h2>
        <p className="text-sm text-gray-600">
          Você está recusando: <strong>{objeto}</strong>
        </p>
        <div className="space-y-2">
          <label className="text-sm font-medium text-gray-700">Motivo da recusa <span className="text-red-500">*</span></label>
          <textarea
            value={motivo}
            onChange={e => setMotivo(e.target.value)}
            rows={3}
            placeholder="Explique o motivo para o requisitante..."
            className="w-full rounded-md border border-input px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
          />
        </div>
        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose} disabled={carregando}>Cancelar</Button>
          <Button
            variant="destructive"
            onClick={() => onConfirm(motivo)}
            disabled={!motivo.trim() || carregando}
          >
            {carregando ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
            Confirmar Recusa
          </Button>
        </div>
      </div>
    </div>
  )
}

interface Props {
  solicitacoes: SolicitacaoResumo[]
  isGestao: boolean
}

export function ListaSolicitacoes({ solicitacoes, isGestao }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [recusandoId, setRecusandoId] = useState<string | null>(null)
  const [carregando, setCarregando] = useState<string | null>(null)

  function handleAprovar(id: string) {
    setCarregando(id)
    startTransition(async () => {
      const res = await aprovarSolicitacao(id)
      setCarregando(null)
      if (!res.success) { toast.error(res.error ?? 'Erro ao aprovar.'); return }
      toast.success('Solicitação aprovada. Abrindo processo...')
      router.push(res.redirectUrl!)
    })
  }

  function handleConfirmarRecusa(solicitacaoId: string, motivo: string) {
    setCarregando(solicitacaoId)
    startTransition(async () => {
      const res = await recusarSolicitacao(solicitacaoId, motivo)
      setCarregando(null)
      setRecusandoId(null)
      if (!res.success) { toast.error(res.error ?? 'Erro ao recusar.'); return }
      toast.success('Solicitação recusada.')
      router.refresh()
    })
  }

  if (solicitacoes.length === 0) {
    return (
      <Card className="border-gray-200 shadow-sm">
        <CardContent className="p-12 text-center space-y-3">
          <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
            <Clock className="w-5 h-5 text-gray-400" />
          </div>
          <p className="text-sm font-medium text-gray-600">Nenhuma solicitação encontrada</p>
          <p className="text-xs text-gray-400">
            {isGestao
              ? 'As solicitações enviadas pelas secretarias aparecerão aqui.'
              : 'Crie uma nova solicitação para iniciar o processo de compra.'}
          </p>
        </CardContent>
      </Card>
    )
  }

  const solicitacaoRecusando = solicitacoes.find(s => s.id === recusandoId)

  return (
    <>
      {recusandoId && solicitacaoRecusando && (
        <ModalRecusa
          solicitacaoId={recusandoId}
          objeto={solicitacaoRecusando.objeto}
          onClose={() => setRecusandoId(null)}
          onConfirm={motivo => handleConfirmarRecusa(recusandoId, motivo)}
          carregando={carregando === recusandoId}
        />
      )}

      <div className="space-y-3">
        {solicitacoes.map(sol => {
          const status = STATUS_CONFIG[sol.status] ?? STATUS_CONFIG.rascunho
          const prioridade = PRIORIDADE_CONFIG[sol.prioridade] ?? PRIORIDADE_CONFIG.media
          const podeProceder = isGestao && (sol.status === 'enviada' || sol.status === 'em_analise')

          return (
            <Card key={sol.id} className="lift border-[var(--hairline)] cursor-default">
              <CardContent className="p-4">
                <div className="flex items-start gap-4">
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${prioridade.className}`}>
                        {sol.prioridade === 'urgente' && <AlertTriangle className="w-3 h-3" />}
                        {prioridade.label}
                      </span>
                      <Badge variant={status.variant} className="gap-1 text-xs">
                        {status.icon}
                        {status.label}
                      </Badge>
                      <span className="text-xs text-gray-400">
                        {new Date(sol.created_at).toLocaleDateString('pt-BR')}
                      </span>
                    </div>

                    <p className="text-sm font-semibold text-gray-900 truncate">{sol.objeto}</p>

                    <div className="flex items-center gap-3 text-xs text-gray-500 flex-wrap">
                      {sol.secretaria_nome && (
                        <span className="flex items-center gap-1">
                          <Building2 className="w-3 h-3" />
                          {sol.secretaria_nome}
                        </span>
                      )}
                      <span>{sol.usuario_nome}</span>
                      <span>{sol.total_itens} {sol.total_itens === 1 ? 'item' : 'itens'}</span>
                      {sol.data_necessidade && (
                        <span>Necessidade: {new Date(sol.data_necessidade).toLocaleDateString('pt-BR')}</span>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {podeProceder && (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setRecusandoId(sol.id)}
                          disabled={carregando === sol.id}
                          className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300 text-xs h-8"
                        >
                          <XCircle className="w-3.5 h-3.5 mr-1" />
                          Recusar
                        </Button>
                        <Button
                          size="sm"
                          onClick={() => handleAprovar(sol.id)}
                          disabled={carregando === sol.id}
                          className="text-xs h-8 gap-1 hover:brightness-110 transition-all"
                          style={{ background: 'var(--primary)', color: 'var(--primaryInk)' }}
                        >
                          {carregando === sol.id
                            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            : <CheckCircle2 className="w-3.5 h-3.5" />
                          }
                          Abrir Processo
                        </Button>
                      </>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => router.push(`/solicitacoes/${sol.id}`)}
                      className="text-gray-400 hover:text-gray-700 h-8 w-8 p-0"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </>
  )
}
