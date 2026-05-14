'use client'

import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import type { DadosWizard } from './types'

const FORMAS_PAGAMENTO = [
  { value: '30_dias_medicao', label: '30 dias após ateste', desc: 'Pagamento em até 30 dias após a nota fiscal ser atestada pelo fiscal' },
  { value: 'parcelas_mensais', label: 'Parcelas mensais', desc: 'Para serviços continuados; pagamento mensal proporcional à execução' },
  { value: 'entrega_unica', label: 'Entrega única', desc: 'Pagamento integral após recebimento definitivo do objeto' },
]

const GARANTIAS = [
  { value: 'dispensada', label: 'Dispensada', desc: 'Para contratos de baixo risco ou valor reduzido' },
  { value: '5%', label: '5% do valor', desc: 'Garantia padrão para a maioria dos contratos (art. 96)' },
  { value: '10%', label: '10% do valor', desc: 'Para obras, servicos de grande vulto ou contratos de risco elevado' },
]

const PRAZOS_VIGENCIA = [
  { value: 12, label: '12 meses' },
  { value: 24, label: '24 meses' },
  { value: 36, label: '36 meses' },
  { value: 48, label: '48 meses' },
  { value: 60, label: '60 meses' },
]

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

export default function EtapaCondicoes({ dados, onChange }: Props) {
  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-1.5">
          <Label className="text-sm font-medium">Valor estimado (R$)</Label>
          <Tooltip texto="Valor estimado da contratação com base em pesquisa de preços. Pode ser preenchido agora ou após a cotação. Usado para definir a garantia e o rito do processo." />
        </div>
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-400">R$</span>
          <Input
            type="number"
            min={0}
            step={0.01}
            value={dados.valor_estimado ?? ''}
            onChange={e => onChange('valor_estimado', e.target.value ? Number(e.target.value) : null)}
            placeholder="0,00"
            className="pl-9 text-sm"
          />
        </div>
        <p className="text-xs text-gray-400">Opcional nesta fase. Pode ser definido após a cotação.</p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-1.5">
          <Label className="text-sm font-medium">Forma de pagamento <span className="text-red-500">*</span></Label>
          <Tooltip texto="Como o fornecedor será pago? Isso define a cláusula de pagamento no Termo de Referência." />
        </div>
        <div className="space-y-2">
          {FORMAS_PAGAMENTO.map(f => (
            <label key={f.value} className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${dados.forma_pagamento === f.value ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-200'}`}>
              <input type="radio" name="forma_pagamento" value={f.value} checked={dados.forma_pagamento === f.value} onChange={() => onChange('forma_pagamento', f.value)} className="mt-0.5 text-blue-600" />
              <div>
                <p className="text-sm font-medium text-gray-900">{f.label}</p>
                <p className="text-xs text-gray-500">{f.desc}</p>
              </div>
            </label>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-1.5">
          <Label className="text-sm font-medium">Garantia contratual <span className="text-red-500">*</span></Label>
          <Tooltip texto="Percentual do valor do contrato que o fornecedor deve depositar como garantia de execução (art. 96 da Lei 14.133/21)." />
        </div>
        <div className="grid grid-cols-3 gap-2">
          {GARANTIAS.map(g => (
            <button
              key={g.value}
              type="button"
              onClick={() => onChange('garantia', g.value)}
              className={`p-3 rounded-xl border-2 text-left transition-all ${dados.garantia === g.value ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-200'}`}
            >
              <p className="text-sm font-semibold text-gray-900">{g.label}</p>
              <p className="text-xs text-gray-500 mt-0.5 leading-tight">{g.desc}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-1.5">
          <Label className="text-sm font-medium">Prazo de vigência do contrato <span className="text-red-500">*</span></Label>
          <Tooltip texto="Por quanto tempo o contrato ficará em vigor após a assinatura. Para serviços continuados, normalmente 12 meses renováveis." />
        </div>
        <div className="flex flex-wrap gap-2">
          {PRAZOS_VIGENCIA.map(p => (
            <button
              key={p.value}
              type="button"
              onClick={() => onChange('prazo_vigencia_meses', p.value)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition-all ${dados.prazo_vigencia_meses === p.value ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300'}`}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-1.5">
          <Label className="text-sm font-medium">Sanções administrativas</Label>
          <Tooltip texto="Penalidades aplicáveis em caso de descumprimento. Um texto padrão já está pré-preenchido conforme a Lei 14.133/21. Edite apenas se necessário." />
        </div>
        <Textarea
          value={dados.sancoes}
          onChange={e => onChange('sancoes', e.target.value)}
          rows={4}
          className="text-sm"
        />
        <p className="text-xs text-gray-400">Pré-preenchido com o padrão da Lei 14.133/21. Edite apenas se houver especificidade.</p>
      </div>
    </div>
  )
}
