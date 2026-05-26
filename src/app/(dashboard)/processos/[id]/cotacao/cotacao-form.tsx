'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Save, Plus, Trash2, AlertTriangle, Calculator, ChevronRight, ChevronLeft, TrendingUp, BarChart2 } from 'lucide-react'
import { EmptyState } from '@/components/licita/empty-state'
import { AlertDialog } from '@/components/ui/alert-dialog'

import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

import { salvarCotacaoFornecedores } from '@/lib/actions/cotacao'
import { FonteCotacao } from '@/types/database'
import Link from 'next/link'

interface Fornecedor {
  nome_fornecedor: string
  cnpj_fornecedor: string
  valor_proposto: number
  justificativa_escolha: string
}

export default function CotacaoForm({ cotacao, fornecedores, processoId }: {
  cotacao: any
  fornecedores: any[]
  processoId: string
}) {
  const [fonte, setFonte] = useState<FonteCotacao>(cotacao.fonte || 'pncp')
  const [justificativa, setJustificativa] = useState(cotacao.justificativa_fonte || '')

  const [listaFornecedores, setListaFornecedores] = useState<Fornecedor[]>(
    fornecedores.length > 0
      ? fornecedores
      : [{ nome_fornecedor: '', cnpj_fornecedor: '', valor_proposto: 0, justificativa_escolha: '' }]
  )

  const [salvando, setSalvando] = useState(false)
  const [estatisticas, setEstatisticas] = useState({
    valor_estimado: cotacao.valor_estimado || 0,
    tem_outlier:    cotacao.tem_outlier    || false,
  })
  const [confirmarRemocao, setConfirmarRemocao] = useState<number | null>(null)

  function addFornecedor() {
    setListaFornecedores(prev => [
      ...prev,
      { nome_fornecedor: '', cnpj_fornecedor: '', valor_proposto: 0, justificativa_escolha: '' },
    ])
  }

  function removeFornecedor(index: number) {
    setListaFornecedores(prev => prev.filter((_, i) => i !== index))
  }

  function atualizaFornecedor(index: number, campo: keyof Fornecedor, valor: string | number) {
    setListaFornecedores(prev => {
      const nova = [...prev]
      nova[index] = { ...nova[index], [campo]: valor }
      return nova
    })
  }

  async function handleSalvar() {
    if (fonte === 'pesquisa_direta' && listaFornecedores.length < 3) {
      toast.warning('A pesquisa direta exige no minimo 3 fornecedores (Art. 23, Lei 14.133/21).')
    }
    setSalvando(true)
    const res = await salvarCotacaoFornecedores(cotacao.id, fonte, justificativa, listaFornecedores)
    if (res.success) {
      toast.success('Cotacao salva e valor estimado calculado.')
      setEstatisticas({ valor_estimado: res.valor_estimado, tem_outlier: res.tem_outlier })
    } else {
      toast.error('Erro ao salvar cotacao.')
    }
    setSalvando(false)
  }

  const valoresValidos = listaFornecedores.filter(f => f.valor_proposto > 0).map(f => f.valor_proposto)

  return (
    <>
    <div className="space-y-4">

      {/* Alerta de outlier */}
      {estatisticas.tem_outlier && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-amber-800">Preco discrepante detectado</p>
            <p className="text-amber-700 text-xs mt-0.5">
              Um ou mais valores variam mais de 30% em relacao a mediana. Considere desconsiderar os extremos ou incluir justificativa fundamentada.
            </p>
          </div>
        </div>
      )}

      {/* Card de parametros */}
      <Card className="border-gray-200 shadow-sm">
        <CardHeader className="pb-4">
          <CardTitle className="text-sm font-semibold text-gray-700">Parametros da Pesquisa</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4 pt-0">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
            <div className="space-y-2">
              <Label className="text-sm">Fonte Primaria de Precos</Label>
              <Select value={fonte} onValueChange={(v) => setFonte(v as FonteCotacao)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pncp">Portal Nacional de Contratacoes Publicas (PNCP)</SelectItem>
                  <SelectItem value="banco_municipal">Banco de Precos Municipal / Regional</SelectItem>
                  <SelectItem value="pesquisa_direta">Pesquisa Direta com Fornecedores</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-400">
                {fonte === 'pesquisa_direta'
                  ? 'Exige minimo de 3 fornecedores e justificativa formal.'
                  : 'Fonte oficial dispensa justificativa adicional.'}
              </p>
            </div>

            {/* Valor estimado calculado */}
            {estatisticas.valor_estimado > 0 && (
              <div className={`flex items-center justify-between p-4 rounded-xl border ${
                estatisticas.tem_outlier ? 'bg-amber-50 border-amber-200' : 'bg-blue-50 border-blue-100'
              }`}>
                <div className="flex items-center gap-2">
                  <Calculator className={`w-5 h-5 ${estatisticas.tem_outlier ? 'text-amber-600' : 'text-blue-600'}`} />
                  <div>
                    <p className="text-xs text-gray-500">Valor Estimado (Mediana)</p>
                    <p className={`text-xl font-bold ${estatisticas.tem_outlier ? 'text-amber-800' : 'text-blue-900'}`}>
                      R$ {estatisticas.valor_estimado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                    </p>
                  </div>
                </div>
                <TrendingUp className={`w-4 h-4 ${estatisticas.tem_outlier ? 'text-amber-400' : 'text-blue-400'}`} />
              </div>
            )}
          </div>

          {fonte === 'pesquisa_direta' && (
            <div className="space-y-2">
              <Label className="text-sm">Justificativa para Pesquisa Direta</Label>
              <Textarea
                placeholder="Ex: Nao foram encontrados itens correspondentes no PNCP nos ultimos 6 meses..."
                rows={3}
                value={justificativa}
                onChange={(e) => setJustificativa(e.target.value)}
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Card de propostas */}
      <Card className="border-gray-200 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <div>
            <CardTitle className="text-sm font-semibold text-gray-700">Propostas Obtidas</CardTitle>
            <CardDescription className="text-xs mt-0.5">
              {fonte === 'pesquisa_direta'
                ? `${listaFornecedores.length}/3 fornecedores (minimo exigido)`
                : 'Insira os valores encontrados nas fontes oficiais'}
            </CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={addFornecedor} className="gap-1.5 text-xs h-8">
            <Plus className="w-3.5 h-3.5" />
            Adicionar
          </Button>
        </CardHeader>

        <CardContent className="pt-0 space-y-3">
          {listaFornecedores.length === 0 && (
            <EmptyState
              icon={BarChart2}
              titulo="Nenhuma proposta adicionada"
              descricao="Adicione os fornecedores consultados para calcular o valor estimado."
            />
          )}

          {listaFornecedores.map((f, index) => (
            <div key={index} className="p-4 border border-gray-200 rounded-xl bg-gray-50/30 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                  Proposta {index + 1}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
                  onClick={() => {
                    const f = listaFornecedores[index]
                    if (f.nome_fornecedor || f.valor_proposto) {
                      setConfirmarRemocao(index)
                    } else {
                      removeFornecedor(index)
                    }
                  }}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Fornecedor / Origem</Label>
                  <Input
                    placeholder="Nome da empresa ou portal"
                    value={f.nome_fornecedor}
                    onChange={(e) => atualizaFornecedor(index, 'nome_fornecedor', e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">CNPJ (se aplicavel)</Label>
                  <Input
                    placeholder="00.000.000/0000-00"
                    value={f.cnpj_fornecedor}
                    onChange={(e) => atualizaFornecedor(index, 'cnpj_fornecedor', e.target.value)}
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Valor Proposto (R$)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    min="0"
                    value={f.valor_proposto || ''}
                    onChange={(e) => atualizaFornecedor(index, 'valor_proposto', parseFloat(e.target.value) || 0)}
                    className="h-8 text-sm font-mono"
                  />
                </div>
              </div>
            </div>
          ))}

          {/* Resumo rapido dos valores */}
          {valoresValidos.length > 1 && (
            <div className="flex items-center gap-4 p-3 bg-gray-50 border border-gray-200 rounded-lg text-xs text-gray-600">
              <span>Min: <strong>R$ {Math.min(...valoresValidos).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></span>
              <span>Max: <strong>R$ {Math.max(...valoresValidos).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</strong></span>
              <span className="text-gray-400">{valoresValidos.length} propostas</span>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex items-center justify-between bg-gray-50/50 border-t border-gray-100 px-5 py-4 rounded-b-xl gap-3">
          <Link href={`/processos/${processoId}/dfd`}>
            <Button variant="outline" className="gap-1.5 h-9 text-sm">
              <ChevronLeft className="w-4 h-4" />
              DFD
            </Button>
          </Link>
          <div className="flex items-center gap-2">
            <Button onClick={handleSalvar} disabled={salvando} className="bg-blue-700 hover:bg-blue-800 text-white gap-2 h-9 text-sm">
              {salvando
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Calculando...</>
                : <><Save className="w-4 h-4" /> Salvar e Calcular</>}
            </Button>
            <Link href={`/processos/${processoId}/etp`}>
              <Button variant="outline" className="gap-1.5 h-9 text-sm">
                Proxima
                <ChevronRight className="w-4 h-4" />
              </Button>
            </Link>
          </div>
        </CardFooter>
      </Card>
    </div>
    <AlertDialog
      open={confirmarRemocao !== null}
      onOpenChange={open => { if (!open) setConfirmarRemocao(null) }}
      titulo="Remover proposta"
      descricao="Esta proposta tem dados preenchidos. Deseja realmente remove-la?"
      labelConfirmar="Remover"
      onConfirmar={() => { if (confirmarRemocao !== null) removeFornecedor(confirmarRemocao) }}
    />
    </>
  )
}
