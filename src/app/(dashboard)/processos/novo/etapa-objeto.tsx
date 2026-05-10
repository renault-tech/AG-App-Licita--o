'use client'

import { Plus, Trash2 } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { DadosWizard, ItemWizard } from './types'

const UNIDADES = ['unidade', 'par', 'kit', 'caixa', 'pacote', 'resma', 'litro', 'kg', 'metro', 'metro quadrado', 'servico', 'hora', 'mes']
const PRAZOS = [15, 30, 45, 60, 90, 120, 180, 365]

function Tooltip({ texto }: { texto: string }) {
  return (
    <div className="group relative inline-block">
      <button type="button" className="w-4 h-4 rounded-full bg-gray-100 text-gray-400 hover:bg-blue-50 hover:text-blue-600 flex items-center justify-center text-xs font-bold transition-colors">?</button>
      <div className="absolute left-5 top-0 z-10 hidden group-hover:block w-64 bg-gray-900 text-white text-xs rounded-lg p-2.5 shadow-lg">{texto}</div>
    </div>
  )
}

interface Props {
  dados: DadosWizard
  onChange: (campo: keyof DadosWizard, valor: unknown) => void
}

export default function EtapaObjeto({ dados, onChange }: Props) {
  function atualizarItem(id: string, campo: keyof ItemWizard, valor: string | number) {
    const novos = dados.itens.map(it => it.id === id ? { ...it, [campo]: valor } : it)
    onChange('itens', novos)
  }

  function adicionarItem() {
    onChange('itens', [...dados.itens, { id: crypto.randomUUID(), descricao: '', unidade: 'unidade', quantidade: 1 }])
  }

  function removerItem(id: string) {
    onChange('itens', dados.itens.filter(it => it.id !== id))
  }

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-1.5">
          <Label className="text-sm font-medium">O que sera contratado? <span className="text-red-500">*</span></Label>
          <Tooltip texto='Descreva o objeto de forma clara e objetiva. Ex: "Aquisicao de computadores desktop para as escolas municipais". O sistema complementa os detalhes.' />
        </div>
        <Textarea
          value={dados.objeto}
          onChange={e => onChange('objeto', e.target.value)}
          placeholder='Ex: Aquisicao de equipamentos de informatica para a rede municipal de ensino'
          rows={2}
          className="text-sm resize-none"
        />
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            <Label className="text-sm font-medium">Itens do objeto</Label>
            <Tooltip texto="Liste os itens especificos. Ex: 20 computadores, 5 impressoras. Isso alimenta a descricao formal dos documentos." />
          </div>
          <button type="button" onClick={adicionarItem} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 font-medium">
            <Plus className="w-3.5 h-3.5" /> Adicionar item
          </button>
        </div>
        {dados.itens.length === 0 && (
          <p className="text-xs text-gray-400 italic">Nenhum item adicionado. Clique em "Adicionar item" para detalhar o objeto.</p>
        )}
        {dados.itens.map(item => (
          <div key={item.id} className="flex items-center gap-2 bg-gray-50 rounded-lg p-2">
            <Input
              value={item.descricao}
              onChange={e => atualizarItem(item.id, 'descricao', e.target.value)}
              placeholder="Descricao do item"
              className="flex-1 text-sm h-8"
            />
            <Input
              type="number"
              min={1}
              value={item.quantidade}
              onChange={e => atualizarItem(item.id, 'quantidade', Number(e.target.value))}
              className="w-16 text-sm h-8 text-center"
            />
            <Select value={item.unidade} onValueChange={v => atualizarItem(item.id, 'unidade', v)}>
              <SelectTrigger className="w-28 h-8 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                {UNIDADES.map(u => <SelectItem key={u} value={u}>{u}</SelectItem>)}
              </SelectContent>
            </Select>
            <button type="button" onClick={() => removerItem(item.id)} className="text-gray-300 hover:text-red-500 transition-colors">
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-1.5">
          <Label className="text-sm font-medium">Por que esta contratacao e necessaria? <span className="text-red-500">*</span></Label>
          <Tooltip texto="Responda as 3 perguntas abaixo de forma objetiva. O sistema monta a justificativa formal completa para o DFD e ETP." />
        </div>
        <div className="border border-gray-200 rounded-xl divide-y divide-gray-100 overflow-hidden">
          {[
            { campo: 'problema_atual' as const, label: 'Qual e o problema ou situacao atual?', placeholder: 'Ex: Os computadores atuais tem mais de 8 anos e nao suportam os sistemas educacionais modernos' },
            { campo: 'impacto_sem_contratar' as const, label: 'O que acontece se nao contratar?', placeholder: 'Ex: Interrupcao das atividades pedagogicas que dependem de tecnologia, prejudicando o aprendizado' },
            { campo: 'solucao_proposta' as const, label: 'Qual a solucao proposta?', placeholder: 'Ex: Substituicao dos equipamentos por modelos modernos com capacidade para os softwares educacionais exigidos pelo MEC' },
          ].map(({ campo, label, placeholder }) => (
            <div key={campo} className="p-3 space-y-1.5">
              <Label className="text-xs font-medium text-gray-600">{label}</Label>
              <Textarea
                value={dados[campo]}
                onChange={e => onChange(campo, e.target.value)}
                placeholder={placeholder}
                rows={2}
                className="text-sm resize-none border-0 p-0 focus-visible:ring-0 bg-transparent"
              />
            </div>
          ))}
        </div>
        <p className="text-xs text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100">
          Com base nestas respostas, o sistema gera a justificativa completa com linguagem institucional formal.
        </p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-1.5">
          <Label className="text-sm font-medium">Prazo esperado para entrega/execucao <span className="text-red-500">*</span></Label>
          <Tooltip texto="Em quantos dias apos a assinatura do contrato o objeto deve ser entregue ou o servico concluido?" />
        </div>
        <div className="flex flex-wrap gap-2">
          {PRAZOS.map(p => (
            <button
              key={p}
              type="button"
              onClick={() => onChange('prazo_dias', p)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${
                dados.prazo_dias === p
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'
              }`}
            >
              {p} dias
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
