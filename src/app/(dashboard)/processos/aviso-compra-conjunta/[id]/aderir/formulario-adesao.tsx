'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Check, Plus, Trash2, Loader2, ArrowLeft } from 'lucide-react'
import Link from 'next/link'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { registrarAdesao } from '@/lib/actions/avisos'
import type { AvisoDetalhe, ItemAdesaoInput } from '@/lib/actions/avisos'
import { LABELS_MODALIDADE, LABELS_CATEGORIA, type CategoriaObjeto } from '@/app/(dashboard)/processos/novo/types'
import type { ModalidadeLicitacao } from '@/types/database'

interface Props {
  aviso: AvisoDetalhe
  secretariaId: string
  jaAderiu: boolean
}

export default function FormularioAdesao({ aviso, secretariaId, jaAderiu }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()

  const [fiscal, setFiscal] = useState('')
  const [dotacao, setDotacao] = useState('')
  const [quantidades, setQuantidades] = useState<Record<string, number>>(
    Object.fromEntries(aviso.itens.map(i => [i.id, 0]))
  )
  const [itensAdicionais, setItensAdicionais] = useState<Array<{
    _id: string
    descricao: string
    unidade: string
    quantidade: number
  }>>([])
  const [enviando, setEnviando] = useState(false)

  function addItemAdicional() {
    setItensAdicionais(prev => [...prev, { _id: crypto.randomUUID(), descricao: '', unidade: 'unidade', quantidade: 1 }])
  }

  function removeItemAdicional(id: string) {
    setItensAdicionais(prev => prev.filter(i => i._id !== id))
  }

  function updateItemAdicional(id: string, campo: 'descricao' | 'unidade' | 'quantidade', valor: string | number) {
    setItensAdicionais(prev => prev.map(i => i._id === id ? { ...i, [campo]: valor } : i))
  }

  function handleEnviar() {
    if (!fiscal.trim()) { toast.error('Informe o Fiscal do Contrato.'); return }
    if (!dotacao.trim()) { toast.error('Informe a Dotacao Orcamentaria.'); return }

    const itensEscolhidos = aviso.itens.filter(i => (quantidades[i.id] ?? 0) > 0)
    if (itensEscolhidos.length === 0 && itensAdicionais.length === 0) {
      toast.error('Selecione ao menos um item ou adicione itens da sua secretaria.')
      return
    }

    for (const item of itensAdicionais) {
      if (item.descricao.trim().length < 2) { toast.error('Preencha a descricao de todos os itens adicionais.'); return }
      if (!item.unidade.trim()) { toast.error('Preencha a unidade de todos os itens adicionais.'); return }
      if (item.quantidade <= 0) { toast.error('Quantidade deve ser maior que zero.'); return }
    }

    const itensPayload: ItemAdesaoInput[] = [
      ...itensEscolhidos.map(item => ({
        aviso_item_id: item.id,
        descricao: item.descricao,
        unidade: item.unidade,
        quantidade: quantidades[item.id],
        categoria_objeto: aviso.categoria_objeto,
      })),
      ...itensAdicionais.map(item => ({
        aviso_item_id: null,
        descricao: item.descricao,
        unidade: item.unidade,
        quantidade: item.quantidade,
        categoria_objeto: aviso.categoria_objeto,
      })),
    ]

    setEnviando(true)
    startTransition(async () => {
      const res = await registrarAdesao({
        aviso_id: aviso.id,
        secretaria_id: secretariaId,
        fiscal_nome: fiscal,
        dotacao_orcamentaria: dotacao,
        itens: itensPayload,
      })
      setEnviando(false)
      if (!res.success) { toast.error(res.error ?? 'Erro ao registrar adesao.'); return }
      toast.success('Adesao confirmada com sucesso!')
      router.refresh()
    })
  }

  if (jaAderiu) {
    return (
      <Card className="border-gray-200 shadow-sm">
        <CardContent className="p-8 text-center space-y-3">
          <div className="w-12 h-12 rounded-full bg-green-100 flex items-center justify-center mx-auto">
            <Check className="w-6 h-6 text-green-600" />
          </div>
          <h2 className="text-base font-semibold text-gray-900">Sua secretaria ja aderiu</h2>
          <p className="text-sm text-gray-500">A adesao foi registrada com sucesso.</p>
          <Button variant="outline" size="sm" className="mt-2" onClick={() => router.push('/dashboard')}>
            Ir para o painel
          </Button>
        </CardContent>
      </Card>
    )
  }

  if (aviso.status !== 'aberto') {
    return (
      <Card className="border-gray-200 shadow-sm">
        <CardContent className="p-8 text-center space-y-3">
          <h2 className="text-base font-semibold text-gray-900">Prazo encerrado</h2>
          <p className="text-sm text-gray-500">O prazo para adesao a este aviso foi encerrado.</p>
          <Button variant="outline" size="sm" className="mt-2" onClick={() => router.push('/dashboard')}>
            Ir para o painel
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/dashboard" className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-lg font-bold text-gray-900">Adesao ao Aviso de Compra Conjunta</h1>
          <p className="text-sm text-gray-500">
            {aviso.secretaria_origem.nome} &bull;{' '}
            {LABELS_MODALIDADE[aviso.modalidade as ModalidadeLicitacao]} &bull;{' '}
            {LABELS_CATEGORIA[aviso.categoria_objeto as CategoriaObjeto]}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-100 rounded-lg text-sm text-blue-800">
        Prazo para adesao: <strong>{new Date(aviso.prazo_adesao).toLocaleDateString('pt-BR')}</strong>
      </div>

      <Card className="border-gray-200 shadow-sm">
        <CardContent className="p-6 space-y-6">

          <div className="space-y-2">
            <Label className="text-sm font-medium">Itens disponiveis para adesao</Label>
            <p className="text-xs text-gray-400">Informe a quantidade desejada. Deixe 0 para itens sem interesse.</p>
            <div className="border border-gray-200 rounded-lg overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-600">Item</th>
                    <th className="text-left px-3 py-2 text-xs font-semibold text-gray-600 w-24">Unidade</th>
                    <th className="text-center px-3 py-2 text-xs font-semibold text-gray-600 w-32">Qtd que desejo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {aviso.itens.map(item => (
                    <tr key={item.id} className={(quantidades[item.id] ?? 0) > 0 ? 'bg-blue-50/30' : 'bg-white'}>
                      <td className="px-3 py-2.5 text-gray-800">{item.descricao}</td>
                      <td className="px-3 py-2.5 text-gray-500">{item.unidade}</td>
                      <td className="px-3 py-2.5 text-center">
                        <Input
                          type="number"
                          min={0}
                          value={quantidades[item.id] ?? 0}
                          onChange={e => setQuantidades(prev => ({ ...prev, [item.id]: Number(e.target.value) }))}
                          className="h-8 text-sm w-24 mx-auto text-center"
                        />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-medium">Itens adicionais da minha secretaria</Label>
              <p className="text-xs text-gray-400">Somente itens de: {LABELS_CATEGORIA[aviso.categoria_objeto as CategoriaObjeto]}</p>
            </div>
            {itensAdicionais.map(item => (
              <div key={item._id} className="flex items-center gap-2">
                <Input
                  placeholder="Descricao do item"
                  value={item.descricao}
                  onChange={e => updateItemAdicional(item._id, 'descricao', e.target.value)}
                  className="flex-1 h-9 text-sm"
                />
                <Input
                  placeholder="Unidade"
                  value={item.unidade}
                  onChange={e => updateItemAdicional(item._id, 'unidade', e.target.value)}
                  className="w-24 h-9 text-sm"
                />
                <Input
                  type="number"
                  min={1}
                  value={item.quantidade}
                  onChange={e => updateItemAdicional(item._id, 'quantidade', Number(e.target.value))}
                  className="w-20 h-9 text-sm"
                />
                <button type="button" onClick={() => removeItemAdicional(item._id)} className="p-1 text-gray-300 hover:text-red-500">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
            <button
              type="button"
              onClick={addItemAdicional}
              className="flex items-center gap-1.5 text-xs text-blue-600 hover:text-blue-800 font-medium"
            >
              <Plus className="w-3.5 h-3.5" />
              Adicionar item adicional
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Fiscal do Contrato <span className="text-red-500">*</span></Label>
              <Input
                value={fiscal}
                onChange={e => setFiscal(e.target.value)}
                placeholder="Nome do fiscal desta secretaria"
                className="h-9 text-sm"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Dotacao Orcamentaria <span className="text-red-500">*</span></Label>
              <Input
                value={dotacao}
                onChange={e => setDotacao(e.target.value)}
                placeholder="Ex: 02.001.33903000.2025"
                className="h-9 text-sm"
              />
            </div>
          </div>

        </CardContent>

        <CardFooter className="flex items-center justify-between border-t border-gray-100 bg-gray-50/50 px-6 py-4 rounded-b-xl">
          <Button variant="outline" size="sm" onClick={() => router.push('/dashboard')}>Cancelar</Button>
          <Button
            onClick={handleEnviar}
            disabled={enviando}
            className="bg-blue-700 hover:bg-blue-800 text-white gap-2"
          >
            {enviando
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Enviando...</>
              : <><Check className="w-4 h-4" /> Confirmar Adesao</>}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
