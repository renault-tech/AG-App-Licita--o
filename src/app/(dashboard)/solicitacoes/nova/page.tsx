'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowLeft, Plus, Trash2, Loader2, Send, Save } from 'lucide-react'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ItemCatmatSearch } from '@/components/forms/item-catmat-search'
import { listarSecretarias } from '@/lib/actions/secretarias'
import { salvarSolicitacao, enviarSolicitacao } from '@/lib/actions/solicitacoes'
import type { ItemCatmat } from '@/lib/catmat/catmat-client'
import type { ItemSolicitacaoInput } from '@/lib/actions/solicitacoes'

type Secretaria = { id: string; nome: string; sigla: string | null }

type ItemLocal = ItemSolicitacaoInput & {
  _id: string
  catmat_descricao: string
  catmat_codigo?: string
  catmat_pdm_codigo?: string
  catmat_unidade?: string
}

const PRIORIDADES = [
  { value: 'baixa', label: 'Baixa' },
  { value: 'media', label: 'Média' },
  { value: 'alta', label: 'Alta' },
  { value: 'urgente', label: 'Urgente' },
] as const

export default function NovaSolicitacaoPage() {
  const router = useRouter()
  const [, startTransition] = useTransition()

  const [secretarias, setSecretarias] = useState<Secretaria[]>([])
  const [secretariaId, setSecretariaId] = useState('')
  const [objeto, setObjeto] = useState('')
  const [justificativa, setJustificativa] = useState('')
  const [prioridade, setPrioridade] = useState<'baixa' | 'media' | 'alta' | 'urgente'>('media')
  const [dataNecessidade, setDataNecessidade] = useState('')
  const [itens, setItens] = useState<ItemLocal[]>([novoItem(1)])
  const [salvando, setSalvando] = useState(false)
  const [enviando, setEnviando] = useState(false)
  const [solicitacaoId, setSolicitacaoId] = useState<string | undefined>()

  useEffect(() => {
    listarSecretarias().then(setSecretarias)
  }, [])

  function novoItem(numero: number): ItemLocal {
    return {
      _id: crypto.randomUUID(),
      numero_item: numero,
      catmat_descricao: '',
      quantidade: 1,
      unidade_medida: 'un',
    }
  }

  function addItem() {
    setItens(prev => [...prev, novoItem(prev.length + 1)])
  }

  function removeItem(id: string) {
    setItens(prev => {
      const filtered = prev.filter(i => i._id !== id)
      return filtered.map((it, idx) => ({ ...it, numero_item: idx + 1 }))
    })
  }

  function updateItem(id: string, campo: Partial<ItemLocal>) {
    setItens(prev => prev.map(i => i._id === id ? { ...i, ...campo } : i))
  }

  function handleSelectCatmat(id: string, item: ItemCatmat) {
    updateItem(id, {
      catmat_descricao: item.descricao,
      catmat_codigo: item.codigo,
      catmat_unidade: item.unidade,
      catmat_pdm_codigo: item.tipo === 'material' ? item.pdmCodigo : undefined,
      unidade_medida: item.unidade,
    })
  }

  function validar(): string | null {
    if (!objeto.trim()) return 'Descreva o objeto da solicitação.'
    if (itens.length === 0) return 'Adicione ao menos um item.'
    for (const it of itens) {
      if (!it.catmat_descricao?.trim()) return `Preencha a descrição do item ${it.numero_item}.`
      if (it.quantidade <= 0) return `Quantidade inválida no item ${it.numero_item}.`
    }
    return null
  }

  function montarPayload() {
    return {
      secretaria_id: secretariaId || undefined,
      objeto,
      justificativa: justificativa || undefined,
      prioridade,
      data_necessidade: dataNecessidade || undefined,
      itens: itens.map(it => ({
        numero_item: it.numero_item,
        catmat_codigo: it.catmat_codigo,
        catmat_pdm_codigo: it.catmat_pdm_codigo,
        catmat_descricao: it.catmat_descricao || '',
        catmat_unidade: it.catmat_unidade,
        especificacao_complementar: it.especificacao_complementar,
        quantidade: it.quantidade,
        unidade_medida: it.unidade_medida,
      })),
    }
  }

  function handleSalvar() {
    setSalvando(true)
    startTransition(async () => {
      const res = await salvarSolicitacao(montarPayload(), solicitacaoId)
      setSalvando(false)
      if (!res.success) { toast.error(res.error ?? 'Erro ao salvar.'); return }
      setSolicitacaoId(res.id)
      toast.success('Rascunho salvo.')
    })
  }

  function handleEnviar() {
    const erro = validar()
    if (erro) { toast.error(erro); return }

    setEnviando(true)
    startTransition(async () => {
      // Salva antes de enviar
      const salvo = await salvarSolicitacao(montarPayload(), solicitacaoId)
      if (!salvo.success || !salvo.id) {
        setEnviando(false)
        toast.error(salvo.error ?? 'Erro ao salvar.')
        return
      }

      const res = await enviarSolicitacao(salvo.id)
      setEnviando(false)
      if (!res.success) { toast.error(res.error ?? 'Erro ao enviar.'); return }
      toast.success('Solicitação enviada ao setor de compras.')
      router.push('/solicitacoes')
    })
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard"
          className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-lg font-bold text-gray-900">Nova Solicitação de Compra</h1>
          <p className="text-sm text-gray-500">
            Descreva o que precisa ser adquirido. O setor de compras analisará e iniciará o processo licitatório.
          </p>
        </div>
      </div>

      <Card className="border-gray-200 shadow-sm">
        <CardContent className="p-6 space-y-6">

          {/* Secretaria */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Sua Secretaria</Label>
            <Select value={secretariaId} onValueChange={v => setSecretariaId(v ?? '')}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione a secretaria..." />
              </SelectTrigger>
              <SelectContent>
                {secretarias.map(s => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.nome}{s.sigla ? ` (${s.sigla})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Objeto */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">
              Objeto da Solicitação <span className="text-red-500">*</span>
            </Label>
            <Input
              value={objeto}
              onChange={e => setObjeto(e.target.value)}
              placeholder="Ex: Aquisição de computadores para o setor administrativo"
            />
          </div>

          {/* Justificativa */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Justificativa da Necessidade</Label>
            <textarea
              value={justificativa}
              onChange={e => setJustificativa(e.target.value)}
              placeholder="Descreva por que esta aquisição é necessária..."
              rows={3}
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none"
            />
          </div>

          {/* Prioridade e Data */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Prioridade <span className="text-red-500">*</span></Label>
              <Select value={prioridade} onValueChange={v => setPrioridade(v as typeof prioridade)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {PRIORIDADES.map(p => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium">Data de Necessidade</Label>
              <Input
                type="date"
                value={dataNecessidade}
                min={new Date().toISOString().split('T')[0]}
                onChange={e => setDataNecessidade(e.target.value)}
              />
            </div>
          </div>

          {/* Itens */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">
              Itens Solicitados <span className="text-red-500">*</span>
            </Label>
            <p className="text-xs text-gray-500">
              Busque no catálogo CATMAT/CATSER federal para uniformizar a descrição dos itens.
            </p>

            <div className="space-y-4">
              {itens.map((item) => (
                <div key={item._id} className="border border-gray-200 rounded-lg p-4 space-y-3 bg-gray-50">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold text-gray-500 uppercase tracking-wider">
                      Item {item.numero_item}
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeItem(item._id)}
                      disabled={itens.length === 1}
                      className="h-7 w-7 text-gray-400 hover:text-red-500"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>

                  {/* Busca CATMAT */}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-gray-600">Descrição do Item (CATMAT/CATSER)</Label>
                    <ItemCatmatSearch
                      value={item.catmat_descricao}
                      onChange={val => updateItem(item._id, { catmat_descricao: val })}
                      onSelectItem={catmat => handleSelectCatmat(item._id, catmat)}
                      placeholder="Buscar no catálogo federal..."
                    />
                    {item.catmat_codigo && (
                      <p className="text-xs text-blue-600">
                        Codigo CATMAT: <span className="font-mono">{item.catmat_codigo}</span>
                        {item.catmat_unidade && ` | Unidade padrao: ${item.catmat_unidade}`}
                      </p>
                    )}
                  </div>

                  {/* Especificacao complementar */}
                  <div className="space-y-1.5">
                    <Label className="text-xs text-gray-600">Especificação Complementar</Label>
                    <Input
                      value={item.especificacao_complementar ?? ''}
                      onChange={e => updateItem(item._id, { especificacao_complementar: e.target.value })}
                      placeholder="Ex: Tela 15,6 polegadas, processador Intel Core i5..."
                      className="text-sm"
                    />
                  </div>

                  {/* Quantidade e Unidade */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs text-gray-600">Quantidade <span className="text-red-500">*</span></Label>
                      <Input
                        type="number"
                        min={1}
                        value={item.quantidade}
                        onChange={e => updateItem(item._id, { quantidade: Number(e.target.value) })}
                        className="text-sm"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs text-gray-600">Unidade <span className="text-red-500">*</span></Label>
                      <Input
                        value={item.unidade_medida}
                        onChange={e => updateItem(item._id, { unidade_medida: e.target.value })}
                        placeholder="un, caixa, litro..."
                        className="text-sm"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <Button type="button" variant="outline" size="sm" onClick={addItem} className="gap-1.5">
              <Plus className="w-3.5 h-3.5" />
              Adicionar item
            </Button>
          </div>

        </CardContent>
      </Card>

      <div className="flex justify-between gap-3">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/dashboard')}
        >
          Cancelar
        </Button>
        <div className="flex gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={handleSalvar}
            disabled={salvando || enviando}
            className="gap-2"
          >
            {salvando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Salvar rascunho
          </Button>
          <Button
            onClick={handleEnviar}
            disabled={enviando || salvando}
            className="gap-2 bg-[#1A365D] hover:bg-[#1A365D]/90 text-white"
          >
            {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
            Enviar ao Setor de Compras
          </Button>
        </div>
      </div>
    </div>
  )
}
