'use client'

import { Info } from 'lucide-react'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import type { DadosWizard, CategoriaObjeto } from './types'
import type { ModalidadeLicitacao } from '@/types/database'

interface Secretaria { id: string; nome: string; sigla: string | null }

const MODALIDADES: { value: ModalidadeLicitacao; label: string; artigo: string; quando: string; icone: string }[] = [
  { value: 'pregao_eletronico', label: 'Pregao Eletronico', artigo: 'Art. 28', quando: 'Bens e servicos comuns, disputa por menor preco via sistema eletronico', icone: '🖥️' },
  { value: 'concorrencia', label: 'Concorrencia', artigo: 'Art. 29', quando: 'Obras, servicos especiais e contratos de grande vulto', icone: '🏛️' },
  { value: 'dispensa', label: 'Dispensa', artigo: 'Art. 75', quando: 'Hipoteses legais que dispensam licitacao (valor, emergencia, exclusividade)', icone: '⚡' },
  { value: 'inexigibilidade', label: 'Inexigibilidade', artigo: 'Art. 74', quando: 'Fornecedor exclusivo ou notoria especializacao', icone: '🔒' },
  { value: 'pregao_presencial', label: 'Pregao Presencial', artigo: 'Art. 28', quando: 'Idem ao eletronico, com sessao presencial', icone: '🏢' },
  { value: 'concurso', label: 'Concurso', artigo: 'Art. 30', quando: 'Trabalho tecnico, cientifico ou artistico', icone: '🎨' },
  { value: 'leilao', label: 'Leilao', artigo: 'Art. 31', quando: 'Alienacao de bens publicos inservíveis ou apreendidos', icone: '🔨' },
  { value: 'dialogo_competitivo', label: 'Dialogo Competitivo', artigo: 'Art. 32', quando: 'Contratacoes inovadoras ou de alta complexidade tecnica', icone: '💡' },
]

const CATEGORIAS: { value: CategoriaObjeto; label: string }[] = [
  { value: 'informatica', label: 'Equipamentos de Informatica' },
  { value: 'mobiliario', label: 'Mobiliario e Decoracao' },
  { value: 'material_consumo', label: 'Material de Consumo' },
  { value: 'veiculos', label: 'Veiculos e Transporte' },
  { value: 'obras', label: 'Obras e Reformas' },
  { value: 'servicos_continuados', label: 'Servicos Continuados' },
  { value: 'servicos_eventuais', label: 'Servicos Eventuais' },
  { value: 'saude_medicamentos', label: 'Saude e Medicamentos' },
  { value: 'alimentacao', label: 'Alimentacao e Generos' },
  { value: 'outros', label: 'Outros' },
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
  secretarias: Secretaria[]
  expandirModalidades: boolean
  setExpandirModalidades: (v: boolean) => void
}

export default function EtapaIdentificacao({ dados, onChange, secretarias, expandirModalidades, setExpandirModalidades }: Props) {
  const modalidadesVisiveis = expandirModalidades ? MODALIDADES : MODALIDADES.slice(0, 4)
  const modalidadeSelecionada = MODALIDADES.find(m => m.value === dados.modalidade)

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <div className="flex items-center gap-1.5">
          <Label className="text-sm font-medium">Secretaria Requisitante <span className="text-red-500">*</span></Label>
          <Tooltip texto="Qual secretaria ou setor esta solicitando esta contratacao? Sera usada no cabecalho de todos os documentos." />
        </div>
        <Select value={dados.secretaria_id} onValueChange={v => onChange('secretaria_id', v)}>
          <SelectTrigger><SelectValue placeholder="Selecione a secretaria..." /></SelectTrigger>
          <SelectContent>
            {secretarias.map(s => (
              <SelectItem key={s.id} value={s.id}>
                {s.nome}{s.sigla ? ` (${s.sigla})` : ''}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-1.5">
          <Label className="text-sm font-medium">Categoria do Objeto <span className="text-red-500">*</span></Label>
          <Tooltip texto="Qual o tipo geral do que sera contratado? Isso ajuda o sistema a pre-preencher especificacoes e normas aplicaveis." />
        </div>
        <Select value={dados.categoria_objeto} onValueChange={v => onChange('categoria_objeto', v as CategoriaObjeto)}>
          <SelectTrigger><SelectValue placeholder="Selecione a categoria..." /></SelectTrigger>
          <SelectContent>
            {CATEGORIAS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        <div className="flex items-center gap-1.5">
          <Label className="text-sm font-medium">Modalidade de Licitacao <span className="text-red-500">*</span></Label>
          <Tooltip texto="A modalidade define o rito legal do processo. Em caso de duvida, Pregao Eletronico e a mais comum para compras e servicos rotineiros." />
        </div>
        <div className="grid grid-cols-2 gap-2">
          {modalidadesVisiveis.map(m => (
            <button
              key={m.value}
              type="button"
              onClick={() => onChange('modalidade', m.value)}
              className={`text-left p-3 rounded-xl border-2 transition-all ${
                dados.modalidade === m.value
                  ? 'border-blue-500 bg-blue-50'
                  : 'border-gray-200 bg-white hover:border-blue-200 hover:bg-gray-50'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-base">{m.icone}</span>
                <span className="text-xs font-semibold text-gray-900">{m.label}</span>
              </div>
              <p className="text-xs text-blue-600 font-medium">{m.artigo}</p>
              <p className="text-xs text-gray-400 mt-0.5 leading-tight">{m.quando}</p>
            </button>
          ))}
        </div>
        {!expandirModalidades && (
          <button type="button" onClick={() => setExpandirModalidades(true)} className="text-xs text-blue-600 hover:underline">
            + Ver outras modalidades
          </button>
        )}
        {modalidadeSelecionada && (
          <div className="flex items-start gap-2 p-2.5 bg-blue-50 border border-blue-100 rounded-lg">
            <Info className="w-3.5 h-3.5 text-blue-600 mt-0.5 shrink-0" />
            <p className="text-xs text-blue-700">{modalidadeSelecionada.quando} ({modalidadeSelecionada.artigo} da Lei 14.133/21)</p>
          </div>
        )}
      </div>
    </div>
  )
}
