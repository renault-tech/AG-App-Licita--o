'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowLeft, Check, Clock, AlertCircle, Loader2, Play, X } from 'lucide-react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { encerrarPrazo, iniciarProcessoDoAviso } from '@/lib/actions/avisos'
import type { AvisoDetalhe } from '@/lib/actions/avisos'
import { LABELS_MODALIDADE, LABELS_CATEGORIA, DADOS_WIZARD_INICIAL, type CategoriaObjeto } from '@/app/(dashboard)/processos/novo/types'
import type { ModalidadeLicitacao } from '@/types/database'

const STORAGE_KEY = 'licitaia_wizard_draft'

interface Props {
  aviso: AvisoDetalhe
}

function diasRestantes(prazo: string): number {
  const diff = new Date(prazo).getTime() - Date.now()
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)))
}

export default function PainelAcompanhamento({ aviso }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [encerrando, setEncerrando] = useState(false)
  const [iniciando, setIniciando] = useState(false)
  const [confirmarSemAdesao, setConfirmarSemAdesao] = useState(false)

  const aderidas = aviso.destinatarias.filter(d => d.status === 'aderiu')
  const pendentes = aviso.destinatarias.filter(d => d.status === 'pendente')
  const dias = diasRestantes(aviso.prazo_adesao)
  const prazoVencido = dias === 0 || new Date(aviso.prazo_adesao) < new Date()
  const podeIniciar = aviso.status === 'encerrado' || (aviso.status === 'aberto' && prazoVencido)

  function handleEncerrar() {
    setEncerrando(true)
    startTransition(async () => {
      const res = await encerrarPrazo(aviso.id)
      setEncerrando(false)
      if (!res.success) { toast.error(res.error ?? 'Erro ao encerrar prazo.'); return }
      toast.success('Prazo encerrado.')
      router.refresh()
    })
  }

  function handleIniciar() {
    if (aviso.adesoes.length === 0 && !confirmarSemAdesao) {
      setConfirmarSemAdesao(true)
      return
    }
    setIniciando(true)
    startTransition(async () => {
      const res = await iniciarProcessoDoAviso(aviso.id)
      setIniciando(false)
      if (!res.success || !res.processoId) {
        toast.error(res.error ?? 'Erro ao iniciar processo.')
        return
      }
      const dadosWizard = JSON.parse(res.processoId)
      try {
        const draft = { ...DADOS_WIZARD_INICIAL, ...dadosWizard }
        localStorage.setItem(STORAGE_KEY, JSON.stringify(draft))
      } catch {}
      toast.success('Redirecionando para o wizard...')
      router.push('/processos/novo')
    })
  }

  const todasSecretarias = [
    { id: aviso.secretaria_origem_id, nome: aviso.secretaria_origem.nome },
    ...aviso.adesoes.map(a => ({ id: a.secretaria_id, nome: a.secretaria.nome })),
  ]

  type ItemRow = {
    descricao: string
    unidade: string
    qtds: Record<string, number>
    total: number
  }

  const tabelaItens: ItemRow[] = []

  for (const item of aviso.itens) {
    const row: ItemRow = { descricao: item.descricao, unidade: item.unidade, qtds: {}, total: 0 }
    row.qtds[aviso.secretaria_origem_id] = item.quantidade_origem
    row.total += item.quantidade_origem

    for (const adesao of aviso.adesoes) {
      const ai = adesao.itens.find(i => i.aviso_item_id === item.id)
      if (ai) {
        row.qtds[adesao.secretaria_id] = (row.qtds[adesao.secretaria_id] ?? 0) + ai.quantidade
        row.total += ai.quantidade
      }
    }
    tabelaItens.push(row)
  }

  for (const adesao of aviso.adesoes) {
    for (const ai of adesao.itens.filter(i => i.aviso_item_id === null)) {
      const existing = tabelaItens.find(r => r.descricao === ai.descricao && r.unidade === ai.unidade)
      if (existing) {
        existing.qtds[adesao.secretaria_id] = (existing.qtds[adesao.secretaria_id] ?? 0) + ai.quantidade
        existing.total += ai.quantidade
      } else {
        const row: ItemRow = { descricao: ai.descricao, unidade: ai.unidade, qtds: {}, total: 0 }
        row.qtds[adesao.secretaria_id] = ai.quantidade
        row.total += ai.quantidade
        tabelaItens.push(row)
      }
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3">
        <Link href="/dashboard" className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 mt-0.5">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex-1">
          <h1 className="text-lg font-bold text-gray-900">Aviso de Compra Conjunta</h1>
          <p className="text-sm text-gray-500">
            {LABELS_MODALIDADE[aviso.modalidade as ModalidadeLicitacao]} &bull;{' '}
            {LABELS_CATEGORIA[aviso.categoria_objeto as CategoriaObjeto]} &bull;{' '}
            {aviso.secretaria_origem.nome}
          </p>
        </div>
        <span className={`px-2.5 py-1 rounded-full text-xs font-semibold border ${
          aviso.status === 'aberto' ? 'bg-blue-50 text-blue-700 border-blue-200'
          : aviso.status === 'encerrado' ? 'bg-amber-50 text-amber-700 border-amber-200'
          : 'bg-green-50 text-green-700 border-green-200'
        }`}>
          {aviso.status === 'aberto' ? 'Aberto' : aviso.status === 'encerrado' ? 'Encerrado' : 'Processo iniciado'}
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3">
        <Card className="border-gray-200">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-green-600">{aderidas.length}</div>
            <div className="text-xs text-green-600 mt-0.5">Aderiram</div>
          </CardContent>
        </Card>
        <Card className="border-gray-200">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-amber-600">{pendentes.length}</div>
            <div className="text-xs text-amber-600 mt-0.5">Pendentes</div>
          </CardContent>
        </Card>
        <Card className="border-gray-200">
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-gray-700">{prazoVencido ? '0' : dias}</div>
            <div className="text-xs text-gray-500 mt-0.5">{prazoVencido ? 'Prazo vencido' : `dia${dias !== 1 ? 's' : ''} restantes`}</div>
          </CardContent>
        </Card>
      </div>

      <Card className="border-gray-200">
        <CardContent className="p-5 space-y-3">
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Status das secretarias</p>
          {aviso.destinatarias.map(d => (
            <div key={d.id} className={`flex items-center justify-between px-3 py-2.5 rounded-lg ${
              d.status === 'aderiu' ? 'bg-green-50' : 'bg-amber-50'
            }`}>
              <span className="text-sm text-gray-800">{d.secretaria.nome}</span>
              {d.status === 'aderiu'
                ? <span className="flex items-center gap-1 text-xs font-semibold text-green-700"><Check className="w-3.5 h-3.5" /> Aderiu</span>
                : <span className="flex items-center gap-1 text-xs font-semibold text-amber-700"><Clock className="w-3.5 h-3.5" /> Aguardando</span>}
            </div>
          ))}
        </CardContent>
      </Card>

      {tabelaItens.length > 0 && (
        <Card className="border-gray-200">
          <CardContent className="p-5 space-y-3 overflow-x-auto">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Itens consolidados</p>
            <table className="w-full text-sm min-w-max">
              <thead className="bg-gray-50">
                <tr>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-gray-600">Item</th>
                  <th className="text-left px-3 py-2 text-xs font-semibold text-gray-600 w-20">Unid.</th>
                  {todasSecretarias.map(s => (
                    <th key={s.id} className="text-center px-3 py-2 text-xs font-semibold text-gray-600 w-24 truncate max-w-24">
                      {s.nome.split(' ').slice(-1)[0]}
                    </th>
                  ))}
                  <th className="text-center px-3 py-2 text-xs font-semibold text-blue-700 w-20">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {tabelaItens.map((row, i) => (
                  <tr key={i} className="bg-white">
                    <td className="px-3 py-2.5 text-gray-800">{row.descricao}</td>
                    <td className="px-3 py-2.5 text-gray-500">{row.unidade}</td>
                    {todasSecretarias.map(s => (
                      <td key={s.id} className="px-3 py-2.5 text-center text-gray-700">
                        {row.qtds[s.id] ?? <span className="text-gray-200">---</span>}
                      </td>
                    ))}
                    <td className="px-3 py-2.5 text-center font-semibold text-blue-700">{row.total}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}

      {confirmarSemAdesao && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <Card className="w-full max-w-sm border-gray-200 shadow-xl">
            <CardContent className="p-6 space-y-4">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-gray-900">Nenhuma secretaria aderiu</p>
                  <p className="text-sm text-gray-600 mt-1">
                    Nenhuma secretaria respondeu ao aviso. Deseja prosseguir com o processo somente com os itens da sua secretaria?
                  </p>
                </div>
              </div>
              <div className="flex gap-2 justify-end">
                <Button variant="outline" size="sm" onClick={() => setConfirmarSemAdesao(false)}>
                  <X className="w-3.5 h-3.5 mr-1.5" /> Cancelar
                </Button>
                <Button size="sm" onClick={handleIniciar} className="bg-blue-700 hover:bg-blue-800 text-white">
                  <Play className="w-3.5 h-3.5 mr-1.5" /> Prosseguir assim mesmo
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {aviso.status !== 'processo_iniciado' && (
        <div className="flex items-center justify-between">
          {aviso.status === 'aberto' && !prazoVencido && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleEncerrar}
              disabled={encerrando}
              className="gap-1.5 text-amber-700 border-amber-300 hover:bg-amber-50"
            >
              {encerrando ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
              Encerrar prazo agora
            </Button>
          )}
          {podeIniciar && (
            <Button
              onClick={handleIniciar}
              disabled={iniciando}
              className="ml-auto bg-green-700 hover:bg-green-800 text-white gap-2"
            >
              {iniciando
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Iniciando...</>
                : <><Play className="w-4 h-4" /> Iniciar Processo</>}
            </Button>
          )}
        </div>
      )}

      {aviso.status === 'processo_iniciado' && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-lg text-sm text-green-800">
          <Check className="w-4 h-4 shrink-0" />
          Processo licitatorio iniciado. Os dados deste aviso foram carregados no wizard.
        </div>
      )}
    </div>
  )
}
