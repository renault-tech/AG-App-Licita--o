'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Save, Plus, Trash2, AlertTriangle, Calculator } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

import { salvarCotacaoFornecedores } from '@/lib/actions/cotacao'
import { FonteCotacao } from '@/types/database'

export default function CotacaoForm({ cotacao, fornecedores, processoId }: { cotacao: any; fornecedores: any[]; processoId: string }) {
  const [fonte, setFonte] = useState<FonteCotacao>(cotacao.fonte || 'pncp')
  const [justificativa, setJustificativa] = useState(cotacao.justificativa_fonte || '')
  
  const [listaFornecedores, setListaFornecedores] = useState(
    fornecedores.length > 0 ? fornecedores : [
      { nome_fornecedor: '', cnpj_fornecedor: '', valor_proposto: 0, justificativa_escolha: '' }
    ]
  )

  const [salvando, setSalvando] = useState(false)
  const [estatisticas, setEstatisticas] = useState({
    valor_estimado: cotacao.valor_estimado || 0,
    tem_outlier: cotacao.tem_outlier || false
  })

  function addFornecedor() {
    setListaFornecedores([...listaFornecedores, { nome_fornecedor: '', cnpj_fornecedor: '', valor_proposto: 0, justificativa_escolha: '' }])
  }

  function removeFornecedor(index: number) {
    const nova = [...listaFornecedores]
    nova.splice(index, 1)
    setListaFornecedores(nova)
  }

  function atualizaFornecedor(index: number, campo: string, valor: any) {
    const nova = [...listaFornecedores]
    nova[index] = { ...nova[index], [campo]: valor }
    setListaFornecedores(nova)
  }

  async function handleSalvar() {
    if (fonte === 'pesquisa_direta' && listaFornecedores.length < 3) {
      toast.warning('A pesquisa direta exige no mínimo 3 fornecedores, salvo exceção justificada.')
    }

    setSalvando(true)
    const res = await salvarCotacaoFornecedores(cotacao.id, fonte, justificativa, listaFornecedores)
    
    if (res.success) {
      toast.success('Cotação salva e estatísticas atualizadas!')
      setEstatisticas({ valor_estimado: res.valor_estimado, tem_outlier: res.tem_outlier })
    } else {
      toast.error('Erro ao salvar cotação.')
    }
    setSalvando(false)
  }

  return (
    <div className="space-y-6">
      
      {/* Resumo e Alertas */}
      {estatisticas.tem_outlier && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg flex items-start gap-3 animate-in fade-in">
          <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold text-sm">Alerta de Preço Discrepante (Outlier)</p>
            <p className="text-sm">Um ou mais valores possuem variação superior a 30% em relação à mediana. Recomenda-se desconsiderar os extremos ou anexar justificativa rigorosa no processo.</p>
          </div>
        </div>
      )}

      <Card className="shadow-sm border-gray-200">
        <CardHeader>
          <CardTitle className="text-lg">Parâmetros da Pesquisa</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Fonte Primária de Preços</Label>
              <Select value={fonte} onValueChange={(v: any) => setFonte(v)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pncp">Portal Nacional de Contratações Públicas (PNCP)</SelectItem>
                  <SelectItem value="banco_municipal">Banco de Preços Municipal / Regional</SelectItem>
                  <SelectItem value="pesquisa_direta">Pesquisa Direta com Fornecedores</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {estatisticas.valor_estimado > 0 && (
              <div className="bg-blue-50 rounded-md p-4 flex items-center justify-between border border-blue-100">
                <div className="flex items-center gap-2 text-blue-800">
                  <Calculator className="w-5 h-5" />
                  <span className="font-medium">Valor Estimado (Mediana)</span>
                </div>
                <span className="text-xl font-bold text-blue-900">
                  R$ {estatisticas.valor_estimado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                </span>
              </div>
            )}
          </div>

          {fonte === 'pesquisa_direta' && (
            <div className="space-y-2 animate-in fade-in">
              <Label>Justificativa para Pesquisa Direta</Label>
              <Textarea 
                placeholder="Ex: Não foram encontrados itens correspondentes no PNCP nos últimos 6 meses..."
                value={justificativa}
                onChange={(e) => setJustificativa(e.target.value)}
              />
            </div>
          )}
        </CardContent>
      </Card>

      <Card className="shadow-sm border-gray-200">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-lg">Propostas Obtidas</CardTitle>
            <CardDescription>Insira os valores globais encontrados para o objeto.</CardDescription>
          </div>
          <Button variant="outline" size="sm" onClick={addFornecedor} className="gap-2">
            <Plus className="w-4 h-4" /> Adicionar Proposta
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {listaFornecedores.map((f, index) => (
            <div key={index} className="grid grid-cols-12 gap-4 p-4 border rounded-lg bg-gray-50/30 relative">
              <Button 
                variant="ghost" 
                size="icon" 
                className="absolute top-2 right-2 text-red-500 hover:text-red-700 hover:bg-red-50"
                onClick={() => removeFornecedor(index)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
              
              <div className="col-span-12 md:col-span-4 space-y-2">
                <Label>Fornecedor / Origem</Label>
                <Input 
                  placeholder="Nome da empresa ou portal"
                  value={f.nome_fornecedor}
                  onChange={(e) => atualizaFornecedor(index, 'nome_fornecedor', e.target.value)}
                />
              </div>
              <div className="col-span-12 md:col-span-3 space-y-2">
                <Label>CNPJ (Se aplicável)</Label>
                <Input 
                  placeholder="00.000.000/0000-00"
                  value={f.cnpj_fornecedor}
                  onChange={(e) => atualizaFornecedor(index, 'cnpj_fornecedor', e.target.value)}
                />
              </div>
              <div className="col-span-12 md:col-span-3 space-y-2">
                <Label>Valor Proposto (R$)</Label>
                <Input 
                  type="number"
                  step="0.01"
                  min="0"
                  value={f.valor_proposto}
                  onChange={(e) => atualizaFornecedor(index, 'valor_proposto', parseFloat(e.target.value) || 0)}
                />
              </div>
            </div>
          ))}
          {listaFornecedores.length === 0 && (
            <div className="text-center py-6 text-gray-500">Nenhuma proposta adicionada.</div>
          )}
        </CardContent>
        <CardFooter className="bg-gray-50/50 p-4 border-t flex justify-end">
          <Button onClick={handleSalvar} disabled={salvando} className="bg-blue-700 hover:bg-blue-800 text-white">
            {salvando ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Processando...</> : <><Save className="w-4 h-4 mr-2" /> Salvar Cotação e Calcular</>}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
