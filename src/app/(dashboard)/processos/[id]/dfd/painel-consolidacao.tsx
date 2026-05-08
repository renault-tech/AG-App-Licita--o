'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Layers, ChevronDown, ChevronRight, Check, X, Clock, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { consolidarDFD } from '@/lib/actions/dfd'
import type { DFDItemRow, DFDParticipacaoRow, DFDParticipacaoItemRow } from '@/types/database'

type ParticipacaoComItens = DFDParticipacaoRow & {
  dfd_participacoes_itens: DFDParticipacaoItemRow[]
}

type DFDConsolidado = {
  id: string
  objeto: string
  justificativa_necessidade: string | null
  secretaria_nome: string
  prazo_adesao: string | null
  status_adesao: string
  consolidado_em: string | null
  itens: DFDItemRow[]
  participacoes: ParticipacaoComItens[]
}

interface Props {
  dfd: DFDConsolidado
  processoId: string
}

// Calcula total de quantidade de um item somando todas as secretarias aderidas
function totalPorItem(
  itemId: string,
  participacoes: ParticipacaoComItens[]
): number {
  return participacoes
    .filter(p => p.status === 'aderida')
    .reduce((acc, p) => {
      const pit = p.dfd_participacoes_itens.find(i => i.dfd_item_id === itemId)
      return acc + (pit ? Number(pit.quantidade) : 0)
    }, 0)
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'prazo_encerrado') {
    return (
      <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-orange-50 text-orange-700 border border-orange-200">
        <Clock className="w-3 h-3" />
        Prazo encerrado
      </span>
    )
  }
  if (status === 'consolidado') {
    return (
      <span className="flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">
        <Check className="w-3 h-3" />
        Consolidado
      </span>
    )
  }
  return null
}

export default function PainelConsolidacao({ dfd, processoId }: Props) {
  const router = useRouter()
  const [consolidando, setConsolidando] = useState(false)
  const [expandidas, setExpandidas] = useState<Set<string>>(new Set())

  const jaConsolidado = dfd.status_adesao === 'consolidado'
  const podeConsolidar = dfd.status_adesao === 'prazo_encerrado'

  const aderidas = dfd.participacoes.filter(p => p.status === 'aderida')
  const pendentes = dfd.participacoes.filter(p => p.status === 'pendente' && p.tipo === 'participante')
  const recusadas = dfd.participacoes.filter(p => p.status === 'recusada')

  function toggleExpand(id: string) {
    setExpandidas(prev => {
      const novo = new Set(prev)
      if (novo.has(id)) { novo.delete(id) } else { novo.add(id) }
      return novo
    })
  }

  async function handleConsolidar() {
    setConsolidando(true)
    const res = await consolidarDFD(dfd.id)
    if (!res.success) {
      toast.error(res.error ?? 'Erro ao consolidar.')
      setConsolidando(false)
      return
    }
    toast.success('DFD consolidado com sucesso.')
    router.refresh()
  }

  return (
    <Card className="border-gray-200 shadow-sm">
      <CardContent className="p-6 space-y-6">

        {/* Cabecalho de status */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-800">Resumo das adesoes</h3>
            <p className="text-xs text-gray-500 mt-0.5">
              {aderidas.length} secretaria{aderidas.length !== 1 ? 's' : ''} confirmou participacao
              {recusadas.length > 0 && `, ${recusadas.length} recusou`}
              {pendentes.length > 0 && `, ${pendentes.length} nao respondeu`}
            </p>
          </div>
          <StatusBadge status={dfd.status_adesao} />
        </div>

        {/* Aviso se ainda ha pendentes */}
        {pendentes.length > 0 && dfd.status_adesao === 'prazo_encerrado' && (
          <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <span>
              {pendentes.length} secretaria{pendentes.length !== 1 ? 's' : ''} nao respondeu dentro do prazo.
              Suas demandas nao serao incluidas na consolidacao.
            </span>
          </div>
        )}

        {/* Tabela consolidada de itens */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Demanda consolidada por item</p>
          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-gray-600 w-12">Item</th>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-gray-600">Especificacao</th>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-gray-600 w-24">Unidade</th>
                  <th className="text-right px-3 py-2 text-xs font-semibold text-gray-600 w-28">Total geral</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {dfd.itens.map(item => {
                  const total = totalPorItem(item.id, dfd.participacoes)
                  return (
                    <tr key={item.id} className="bg-white">
                      <td className="px-3 py-2.5 text-gray-500 text-center font-mono text-xs">
                        {String(item.numero_item).padStart(2, '0')}
                      </td>
                      <td className="px-3 py-2.5 text-gray-800">{item.especificacao}</td>
                      <td className="px-3 py-2.5 text-gray-500">{item.unidade_medida}</td>
                      <td className="px-3 py-2.5 text-right font-semibold text-gray-900">
                        {total > 0 ? total.toLocaleString('pt-BR') : <span className="text-gray-300">---</span>}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Detalhamento por secretaria */}
        <div className="space-y-2">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Detalhamento por secretaria
          </p>

          {dfd.participacoes.map(p => {
            const isExpanded = expandidas.has(p.id)
            const itensAderidos = p.dfd_participacoes_itens.filter(pi => pi.quantidade > 0)

            return (
              <div key={p.id} className="border border-gray-200 rounded-lg overflow-hidden">
                <button
                  type="button"
                  onClick={() => toggleExpand(p.id)}
                  className="w-full flex items-center gap-3 px-4 py-3 bg-white hover:bg-gray-50 transition-colors text-left"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-800">{p.secretaria_nome}</span>
                      {p.tipo === 'iniciadora' && (
                        <span className="text-xs px-1.5 py-0.5 rounded bg-blue-50 text-blue-600 border border-blue-100">Iniciadora</span>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {p.status === 'aderida' && (
                      <span className="flex items-center gap-1 text-xs text-green-700 bg-green-50 border border-green-100 px-2 py-0.5 rounded-full">
                        <Check className="w-3 h-3" />
                        Aderiu
                      </span>
                    )}
                    {p.status === 'pendente' && (
                      <span className="flex items-center gap-1 text-xs text-amber-700 bg-amber-50 border border-amber-100 px-2 py-0.5 rounded-full">
                        <Clock className="w-3 h-3" />
                        Sem resposta
                      </span>
                    )}
                    {p.status === 'recusada' && (
                      <span className="flex items-center gap-1 text-xs text-red-600 bg-red-50 border border-red-100 px-2 py-0.5 rounded-full">
                        <X className="w-3 h-3" />
                        Recusou
                      </span>
                    )}
                    {isExpanded
                      ? <ChevronDown className="w-4 h-4 text-gray-400" />
                      : <ChevronRight className="w-4 h-4 text-gray-400" />}
                  </div>
                </button>

                {isExpanded && p.status === 'aderida' && (
                  <div className="border-t border-gray-100 px-4 py-3 bg-gray-50/50 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                      {p.fiscal_contrato && (
                        <div>
                          <p className="text-xs text-gray-400">Fiscal do Contrato</p>
                          <p className="text-gray-800">{p.fiscal_contrato}</p>
                        </div>
                      )}
                      {p.dotacao_orcamentaria && (
                        <div>
                          <p className="text-xs text-gray-400">Dotacao Orcamentaria</p>
                          <p className="text-gray-800">{p.dotacao_orcamentaria}</p>
                        </div>
                      )}
                    </div>
                    {itensAderidos.length > 0 && (
                      <div className="border border-gray-200 rounded-lg overflow-hidden">
                        <table className="w-full text-xs">
                          <thead className="bg-gray-100 border-b border-gray-200">
                            <tr>
                              <th className="text-left px-3 py-1.5 font-semibold text-gray-600">Item</th>
                              <th className="text-right px-3 py-1.5 font-semibold text-gray-600 w-24">Quantidade</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-100 bg-white">
                            {itensAderidos.map(pi => {
                              const item = dfd.itens.find(i => i.id === pi.dfd_item_id)
                              return (
                                <tr key={pi.id}>
                                  <td className="px-3 py-1.5 text-gray-700">
                                    {item ? `${String(item.numero_item).padStart(2, '0')} - ${item.especificacao.substring(0, 60)}${item.especificacao.length > 60 ? '...' : ''}` : pi.dfd_item_id}
                                  </td>
                                  <td className="px-3 py-1.5 text-right font-medium text-gray-900">
                                    {Number(pi.quantidade).toLocaleString('pt-BR')} {item?.unidade_medida}
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>

        {jaConsolidado && dfd.consolidado_em && (
          <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
            <Check className="w-4 h-4 shrink-0" />
            DFD consolidado em {new Date(dfd.consolidado_em).toLocaleDateString('pt-BR')}. O processo licitatorio pode prosseguir.
          </div>
        )}

      </CardContent>

      {podeConsolidar && (
        <CardFooter className="border-t border-gray-100 bg-gray-50/50 px-6 py-4 rounded-b-xl flex justify-end">
          <Button
            onClick={handleConsolidar}
            disabled={consolidando}
            className="bg-green-700 hover:bg-green-800 text-white gap-2 h-9 text-sm"
          >
            {consolidando
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Consolidando...</>
              : <><Layers className="w-4 h-4" /> Consolidar demandas</>}
          </Button>
        </CardFooter>
      )}
    </Card>
  )
}