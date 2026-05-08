'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Check, X, Package, Building2, Mail, Phone, User, Clock } from 'lucide-react'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { useRouter } from 'next/navigation'
import { responderAdesaoDFD } from '@/lib/actions/dfd'
import type { DFDItemRow, DFDParticipacaoRow } from '@/types/database'

type DFDPublico = {
  id: string
  objeto: string
  justificativa_necessidade: string | null
  secretaria_nome: string
  secretaria_email: string | null
  secretaria_telefone: string | null
  secretario_responsavel: string | null
  prazo_adesao: string | null
  itens: DFDItemRow[]
}

type QuantidadeItem = {
  dfd_item_id: string
  participar: boolean
  quantidade: string
  observacoes: string
}

interface Props {
  dfd: DFDPublico
  participacao: DFDParticipacaoRow
}

export default function PainelAdesao({ dfd, participacao }: Props) {
  const router = useRouter()
  const jaRespondeu = participacao.status !== 'pendente'

  const [fiscal, setFiscal] = useState(participacao.fiscal_contrato ?? '')
  const [dotacao, setDotacao] = useState(participacao.dotacao_orcamentaria ?? '')
  const [quantidades, setQuantidades] = useState<QuantidadeItem[]>(
    dfd.itens.map(i => ({
      dfd_item_id: i.id,
      participar: false,
      quantidade: '',
      observacoes: '',
    }))
  )
  const [enviando, setEnviando] = useState(false)

  function toggleItem(idx: number) {
    setQuantidades(prev => prev.map((q, i) => i === idx ? { ...q, participar: !q.participar } : q))
  }

  function updateQtd(idx: number, campo: 'quantidade' | 'observacoes', valor: string) {
    setQuantidades(prev => prev.map((q, i) => i === idx ? { ...q, [campo]: valor } : q))
  }

  async function handleResponder(status: 'aderida' | 'recusada') {
    if (status === 'aderida') {
      const itensParticipantes = quantidades.filter(q => q.participar)
      if (!itensParticipantes.length) {
        toast.warning('Selecione ao menos um item para aderir ao processo.')
        return
      }
      const semQtd = itensParticipantes.filter(q => !q.quantidade || Number(q.quantidade) <= 0)
      if (semQtd.length) {
        toast.warning('Preencha a quantidade para todos os itens selecionados.')
        return
      }
      if (!fiscal.trim()) {
        toast.warning('Informe o Fiscal do Contrato da sua secretaria.')
        return
      }
      if (!dotacao.trim()) {
        toast.warning('Informe a Dotacao Orcamentaria da sua secretaria.')
        return
      }
    }

    setEnviando(true)
    const res = await responderAdesaoDFD(participacao.id, {
      status,
      fiscal_contrato: fiscal || undefined,
      dotacao_orcamentaria: dotacao || undefined,
      itens: status === 'aderida'
        ? quantidades
            .filter(q => q.participar && Number(q.quantidade) > 0)
            .map(q => ({
              dfd_item_id: q.dfd_item_id,
              quantidade: Number(q.quantidade),
              observacoes: q.observacoes || undefined,
            }))
        : undefined,
    })

    if (!res.success) {
      toast.error(res.error ?? 'Erro ao enviar resposta.')
      setEnviando(false)
      return
    }

    toast.success(status === 'aderida' ? 'Adesao confirmada com sucesso.' : 'Participacao recusada.')
    router.refresh()
  }

  // Ja respondeu: exibe resumo
  if (jaRespondeu) {
    return (
      <Card className="border-gray-200 shadow-sm">
        <CardContent className="p-6 space-y-4">
          <div className={`flex items-center gap-3 p-4 rounded-xl border ${
            participacao.status === 'aderida'
              ? 'bg-green-50 border-green-200 text-green-800'
              : 'bg-red-50 border-red-200 text-red-700'
          }`}>
            {participacao.status === 'aderida'
              ? <Check className="w-5 h-5 shrink-0" />
              : <X className="w-5 h-5 shrink-0" />}
            <div>
              <p className="font-medium text-sm">
                {participacao.status === 'aderida' ? 'Sua secretaria confirmou participacao neste processo.' : 'Sua secretaria recusou participacao neste processo.'}
              </p>
              {participacao.respondido_em && (
                <p className="text-xs mt-0.5 opacity-70">
                  Respondido em {new Date(participacao.respondido_em).toLocaleDateString('pt-BR')}
                </p>
              )}
            </div>
          </div>

          {participacao.status === 'aderida' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              {participacao.fiscal_contrato && (
                <div>
                  <p className="text-xs text-gray-400">Fiscal do Contrato</p>
                  <p className="font-medium text-gray-800">{participacao.fiscal_contrato}</p>
                </div>
              )}
              {participacao.dotacao_orcamentaria && (
                <div>
                  <p className="text-xs text-gray-400">Dotacao Orcamentaria</p>
                  <p className="font-medium text-gray-800">{participacao.dotacao_orcamentaria}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="border-gray-200 shadow-sm">
      <CardContent className="p-6 space-y-6">

        {/* Dados da secretaria requisitante (somente leitura) */}
        <div className="border border-blue-100 bg-blue-50/40 rounded-xl p-4 space-y-3">
          <p className="text-xs font-semibold text-blue-800 uppercase tracking-wide">
            Processo iniciado por
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
            <div className="flex items-center gap-2">
              <Building2 className="w-3.5 h-3.5 text-blue-400 shrink-0" />
              <span className="text-gray-700">{dfd.secretaria_nome}</span>
            </div>
            {dfd.secretaria_email && (
              <div className="flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span className="text-gray-600">{dfd.secretaria_email}</span>
              </div>
            )}
            {dfd.secretaria_telefone && (
              <div className="flex items-center gap-2">
                <Phone className="w-3.5 h-3.5 text-blue-400 shrink-0" />
                <span className="text-gray-600">{dfd.secretaria_telefone}</span>
              </div>
            )}
          </div>
        </div>

        {/* Prazo */}
        {dfd.prazo_adesao && (
          <div className="flex items-center gap-2 text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            <Clock className="w-4 h-4 shrink-0" />
            Prazo para resposta: <strong>{new Date(dfd.prazo_adesao).toLocaleDateString('pt-BR')}</strong>
          </div>
        )}

        {/* Objeto */}
        <div className="space-y-1">
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Objeto</p>
          <p className="text-sm text-gray-800 leading-relaxed">{dfd.objeto}</p>
        </div>

        {/* Justificativa */}
        {dfd.justificativa_necessidade && (
          <div className="space-y-1">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Justificativa da necessidade</p>
            <p className="text-sm text-gray-700 leading-relaxed">{dfd.justificativa_necessidade}</p>
          </div>
        )}

        {/* Itens: cada secretaria escolhe quais quer e informa quantidade */}
        <div className="space-y-3">
          <div className="flex items-center gap-1.5">
            <Package className="w-3.5 h-3.5 text-gray-400" />
            <Label className="text-sm font-medium text-gray-700">
              Itens disponíveis, selecione os de interesse e informe as quantidades
            </Label>
          </div>

          <div className="border border-gray-200 rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="w-10 px-3 py-2" />
                  <th className="text-left px-3 py-2 text-xs font-semibold text-gray-600 w-10">Item</th>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-gray-600">Especificacao</th>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-gray-600 w-28">Qtd solicitada</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {dfd.itens.map((item, idx) => {
                  const q = quantidades[idx]
                  return (
                    <tr key={item.id} className={q?.participar ? 'bg-blue-50/30' : 'bg-white'}>
                      <td className="px-3 py-3 text-center">
                        <button
                          type="button"
                          onClick={() => toggleItem(idx)}
                          className={`w-5 h-5 rounded border flex items-center justify-center mx-auto transition-colors ${
                            q?.participar
                              ? 'border-blue-500 bg-blue-500'
                              : 'border-gray-300 hover:border-blue-400'
                          }`}
                        >
                          {q?.participar && <Check className="w-3 h-3 text-white" />}
                        </button>
                      </td>
                      <td className="px-3 py-3 text-gray-500 text-center font-mono text-xs">
                        {String(item.numero_item).padStart(2, '0')}
                      </td>
                      <td className="px-3 py-3">
                        <p className="text-gray-800 text-sm">{item.especificacao}</p>
                        <p className="text-xs text-gray-400 mt-0.5">Unidade: {item.unidade_medida}</p>
                      </td>
                      <td className="px-3 py-3">
                        {q?.participar && (
                          <Input
                            type="number"
                            min="1"
                            value={q.quantidade}
                            onChange={e => updateQtd(idx, 'quantidade', e.target.value)}
                            placeholder="0"
                            className="h-8 text-sm w-24"
                          />
                        )}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Fiscal e Dotacao da secretaria participante */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">
              Fiscal do Contrato <span className="text-red-500">*</span>
            </Label>
            <Input
              value={fiscal}
              onChange={e => setFiscal(e.target.value)}
              placeholder="Nome do fiscal desta secretaria"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">
              Dotacao Orcamentaria <span className="text-red-500">*</span>
            </Label>
            <Input
              value={dotacao}
              onChange={e => setDotacao(e.target.value)}
              placeholder="Centro de custo desta secretaria"
            />
          </div>
        </div>

        {/* Secretario responsavel (informativo) */}
        {participacao.secretario_responsavel && (
          <div className="flex items-center gap-2 p-3 bg-gray-50 border border-gray-100 rounded-lg text-sm text-gray-600">
            <User className="w-4 h-4 shrink-0 text-gray-400" />
            <span>
              <strong>Secretario(a) da pasta:</strong> {participacao.secretario_responsavel}
            </span>
          </div>
        )}

      </CardContent>

      <CardFooter className="flex items-center justify-end gap-2 border-t border-gray-100 bg-gray-50/50 px-6 py-4 rounded-b-xl">
        <Button
          variant="outline"
          onClick={() => handleResponder('recusada')}
          disabled={enviando}
          className="gap-1.5 h-9 text-sm text-red-600 border-red-200 hover:bg-red-50"
        >
          {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <X className="w-4 h-4" />}
          Recusar participacao
        </Button>
        <Button
          onClick={() => handleResponder('aderida')}
          disabled={enviando}
          className="bg-blue-700 hover:bg-blue-800 text-white gap-1.5 h-9 text-sm"
        >
          {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
          Confirmar adesao
        </Button>
      </CardFooter>
    </Card>
  )
}