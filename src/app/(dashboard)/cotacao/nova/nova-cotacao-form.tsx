'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Loader2, Plus, Trash2, Search, Check } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { gerarCotacao } from '@/lib/actions/cotacao-pncp'
import { RelatorioCotacaoTabela } from '@/components/cotacao/relatorio-tabela'
import type {
  IndiceAtualizacao,
  TipoFontePreco,
  TipoCatalogoItem,
  ItemEntrada,
  RelatorioCotacao,
} from '@/lib/cotacao/types'

interface ItemForm {
  titulo: string
  descricao: string
  codigoCatalogo: string
  tipoCatalogo: TipoCatalogoItem
  unidade: string
  quantidade: number
}

const ITEM_VAZIO: ItemForm = {
  titulo: '', descricao: '', codigoCatalogo: '', tipoCatalogo: 'material', unidade: 'un', quantidade: 1,
}

const FONTES: { tipo: TipoFontePreco; label: string }[] = [
  { tipo: 'compras_governamentais', label: 'Compras Governamentais' },
  { tipo: 'preco_publico', label: 'Preco Publico (PNCP)' },
]

export function NovaCotacaoForm({ processoId }: { processoId?: string }) {
  const router = useRouter()
  const [titulo, setTitulo] = useState('')
  const [indice, setIndice] = useState<IndiceAtualizacao>('ipca')
  const [estado, setEstado] = useState('')
  const [fontes, setFontes] = useState<TipoFontePreco[]>(['compras_governamentais'])
  const [itens, setItens] = useState<ItemForm[]>([{ ...ITEM_VAZIO }])
  const [gerando, setGerando] = useState(false)
  const [relatorio, setRelatorio] = useState<RelatorioCotacao | null>(null)
  const [cotacaoId, setCotacaoId] = useState<string | null>(null)

  function toggleFonte(tipo: TipoFontePreco) {
    setFontes((prev) => (prev.includes(tipo) ? prev.filter((f) => f !== tipo) : [...prev, tipo]))
  }

  function addItem() {
    setItens((prev) => [...prev, { ...ITEM_VAZIO }])
  }
  function removeItem(i: number) {
    setItens((prev) => prev.filter((_, idx) => idx !== i))
  }
  function setItem(i: number, campo: keyof ItemForm, valor: string | number) {
    setItens((prev) => prev.map((it, idx) => (idx === i ? { ...it, [campo]: valor } : it)))
  }

  async function handleGerar() {
    if (!titulo.trim()) { toast.error('Informe um titulo para a cotacao.'); return }
    if (fontes.length === 0) { toast.error('Selecione ao menos uma fonte de precos.'); return }
    const itensValidos = itens.filter((it) => it.codigoCatalogo.trim() && it.titulo.trim())
    if (itensValidos.length === 0) {
      toast.error('Informe ao menos um item com codigo de catalogo (CATMAT/CATSER) e titulo.')
      return
    }

    setGerando(true)
    const entrada: ItemEntrada[] = itensValidos.map((it, idx) => ({
      numero: idx + 1,
      titulo: it.titulo,
      descricao: it.descricao || it.titulo,
      codigoCatalogo: it.codigoCatalogo.trim(),
      tipoCatalogo: it.tipoCatalogo,
      unidade: it.unidade || 'un',
      quantidade: Number(it.quantidade) || 1,
    }))

    const res = await gerarCotacao({
      titulo: titulo.trim(),
      indice,
      fontes,
      estado: estado.trim() || undefined,
      processoId: processoId ?? null,
      itens: entrada,
    })
    setGerando(false)

    if (!res.success || !res.data) {
      toast.error(res.error ?? 'Erro ao gerar cotacao.')
      return
    }
    setRelatorio(res.data.relatorio)
    setCotacaoId(res.data.cotacaoId)
    const pendentes = res.data.relatorio.itens.filter((i) => i.status === 'pendente_insuficiente').length
    if (pendentes > 0) {
      toast.warning(`Cotacao gerada. ${pendentes} item(ns) com menos de 3 precos. Verifique.`)
    } else {
      toast.success('Cotacao gerada com sucesso.')
    }
  }

  if (relatorio && cotacaoId) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-semibold text-gray-700">Resultado da pesquisa de precos</h2>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => setRelatorio(null)}>Editar</Button>
            <Button size="sm" onClick={() => router.push(`/cotacao/${cotacaoId}`)}>Abrir cotacao</Button>
          </div>
        </div>
        <RelatorioCotacaoTabela relatorio={relatorio} />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <Card className="border-gray-200 shadow-sm">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-semibold text-gray-700">Parametros da Pesquisa</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-sm">Titulo da cotacao</Label>
              <Input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex: Aquisicao de material odontologico" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">Indice de atualizacao (Art. 23, II)</Label>
              <Select value={indice} onValueChange={(v) => setIndice(v as IndiceAtualizacao)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="ipca">IPCA (padrao)</SelectItem>
                  <SelectItem value="igpm">IGP-M</SelectItem>
                  <SelectItem value="inpc">INPC</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div className="space-y-1.5 md:col-span-2">
              <Label className="text-sm">Fontes de precos</Label>
              <div className="flex flex-wrap gap-2">
                {FONTES.map((f) => {
                  const ativo = fontes.includes(f.tipo)
                  return (
                    <button
                      key={f.tipo}
                      type="button"
                      onClick={() => toggleFonte(f.tipo)}
                      className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-full border transition-colors ${
                        ativo ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-300'
                      }`}
                    >
                      {ativo && <Check className="w-3 h-3" />}
                      {f.label}
                    </button>
                  )
                })}
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm">UF (opcional)</Label>
              <Input value={estado} onChange={(e) => setEstado(e.target.value.toUpperCase().slice(0, 2))} placeholder="Ex: SP" maxLength={2} />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-gray-200 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-sm font-semibold text-gray-700">Itens a cotar</CardTitle>
          <Button variant="outline" size="sm" onClick={addItem} className="gap-1.5 text-xs h-8">
            <Plus className="w-3.5 h-3.5" /> Adicionar item
          </Button>
        </CardHeader>
        <CardContent className="pt-0 space-y-3">
          {itens.map((it, i) => (
            <div key={i} className="p-4 border border-gray-200 rounded-xl bg-gray-50/30 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500 uppercase">Item {i + 1}</span>
                {itens.length > 1 && (
                  <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-400 hover:text-red-600" onClick={() => removeItem(i)}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="space-y-1.5 md:col-span-2">
                  <Label className="text-xs">Titulo do item</Label>
                  <Input value={it.titulo} onChange={(e) => setItem(i, 'titulo', e.target.value)} className="h-8 text-sm" placeholder="Descricao curta do item" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Tipo de catalogo</Label>
                  <Select value={it.tipoCatalogo} onValueChange={(v) => setItem(i, 'tipoCatalogo', v ?? 'material')}>
                    <SelectTrigger className="h-8 text-sm"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="material">Material (CATMAT)</SelectItem>
                      <SelectItem value="servico">Servico (CATSER)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Codigo CATMAT/CATSER</Label>
                  <Input value={it.codigoCatalogo} onChange={(e) => setItem(i, 'codigoCatalogo', e.target.value.replace(/\D/g, ''))} className="h-8 text-sm font-mono" placeholder="Ex: 150912" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Unidade</Label>
                  <Input value={it.unidade} onChange={(e) => setItem(i, 'unidade', e.target.value)} className="h-8 text-sm" placeholder="un" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Quantidade</Label>
                  <Input type="number" min="1" value={it.quantidade || ''} onChange={(e) => setItem(i, 'quantidade', parseFloat(e.target.value) || 0)} className="h-8 text-sm font-mono" />
                </div>
              </div>
            </div>
          ))}
          <p className="text-xs text-gray-400">
            A consulta usa o codigo de catalogo (CATMAT para materiais, CATSER para servicos) para buscar precos reais no Compras.gov.br.
          </p>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={handleGerar} disabled={gerando} className="bg-blue-700 hover:bg-blue-800 text-white gap-2 h-10">
          {gerando ? <><Loader2 className="w-4 h-4 animate-spin" /> Consultando PNCP...</> : <><Search className="w-4 h-4" /> Gerar cotacao</>}
        </Button>
      </div>
    </div>
  )
}
