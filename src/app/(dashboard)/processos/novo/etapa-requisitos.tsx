'use client'

import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import type { DadosWizard, CategoriaObjeto } from './types'

const NORMAS_POR_CATEGORIA: Record<CategoriaObjeto, string[]> = {
  informatica: ['ABNT NBR 16407 (requisitos de sustentabilidade para TI)', 'ABNT NBR ISO 9001 (gestao de qualidade)', 'Portaria INMETRO no 170/2012 (eficiencia energetica)'],
  mobiliario: ['ABNT NBR 13961 (moveis para escritorio)', 'ABNT NBR 13962 (cadeiras de escritorio)', 'ABNT NBR 11900 (moveis escolares)'],
  material_consumo: ['ABNT NBR 15448 (embalagens e acondicionamento)', 'Resolucao ANVISA aplicavel'],
  veiculos: ['Resolucao CONTRAN no 432/2013', 'ABNT NBR 15570 (especificacoes de veiculos)'],
  obras: ['ABNT NBR 6118 (estruturas de concreto)', 'NBR 5626 (instalacoes hidraulicas)', 'NBR 5410 (instalacoes eletricas)'],
  servicos_continuados: ['IN SEGES/ME no 5/2017 (terceirizacao)', 'CLT e legislacao trabalhista aplicavel'],
  servicos_eventuais: ['Legislacao especifica do tipo de servico'],
  saude_medicamentos: ['RDC ANVISA aplicavel', 'Farmacopeia Brasileira', 'Resolucao CFM/CFF aplicavel'],
  alimentacao: ['RDC ANVISA no 216/2004 (boas praticas em servicos de alimentacao)', 'Resolucao CFN aplicavel'],
  outros: [],
}

const SUSTENTABILIDADE_OPCOES = [
  'Preferencia por produtos com certificacao ambiental (ABNT, INMETRO)',
  'Vedacao de materiais com substancias nocivas ao meio ambiente',
  'Exigencia de logistica reversa para descarte de equipamentos',
  'Preferencia por fornecedores com selo de eficiencia energetica',
  'Uso de embalagens reutilizaveis ou biodegradaveis',
  'Reducao de consumo de papel e plastico na execucao',
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

export default function EtapaRequisitos({ dados, onChange }: Props) {
  const normasSugeridas = NORMAS_POR_CATEGORIA[dados.categoria_objeto] ?? []

  function toggleNorma(norma: string) {
    const atual = dados.normas_aplicaveis
    onChange('normas_aplicaveis', atual.includes(norma) ? atual.filter(n => n !== norma) : [...atual, norma])
  }

  function toggleSustentabilidade(item: string) {
    const atual = dados.criterios_sustentabilidade
    onChange('criterios_sustentabilidade', atual.includes(item) ? atual.filter(n => n !== item) : [...atual, item])
  }

  return (
    <div className="space-y-6">
      {normasSugeridas.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-1.5">
            <Label className="text-sm font-medium">Normas e padroes aplicaveis</Label>
            <Tooltip texto="Normas pre-selecionadas para a categoria escolhida. Desmarque se nao se aplicar ao seu caso especifico." />
          </div>
          <div className="space-y-1.5">
            {normasSugeridas.map(norma => (
              <label key={norma} className="flex items-start gap-2.5 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={dados.normas_aplicaveis.includes(norma)}
                  onChange={() => toggleNorma(norma)}
                  className="mt-0.5 rounded border-gray-300 text-blue-600"
                />
                <span className="text-sm text-gray-700 group-hover:text-gray-900">{norma}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center gap-1.5">
          <Label className="text-sm font-medium">Especificacoes minimas exigidas <span className="text-red-500">*</span></Label>
          <Tooltip texto='Liste as caracteristicas tecnicas minimas que o produto ou servico deve ter. Ex: "Processador Intel Core i5, 8GB RAM, SSD 256GB". Seja objetivo; o sistema complementa o texto.' />
        </div>
        <Textarea
          value={dados.especificacoes_minimas}
          onChange={e => onChange('especificacoes_minimas', e.target.value)}
          placeholder='Ex: Computador desktop com processador minimo Intel Core i5 de 10a geracao, 8GB de memoria RAM DDR4, SSD de 256GB, monitor de 21", teclado e mouse USB'
          rows={4}
          className="text-sm"
        />
        <p className="text-xs text-gray-400">Quanto mais detalhado, melhor o Termo de Referencia gerado.</p>
      </div>

      <div className="space-y-2">
        <div className="flex items-center gap-1.5">
          <Label className="text-sm font-medium">Criterios de sustentabilidade</Label>
          <Tooltip texto="Selecione os criterios ambientais aplicaveis. Sao exigidos pela Lei 14.133/21 (art. 11, IV) quando houver alternativas sustentaveis disponiveis no mercado." />
        </div>
        <div className="space-y-1.5">
          {SUSTENTABILIDADE_OPCOES.map(item => (
            <label key={item} className="flex items-start gap-2.5 cursor-pointer group">
              <input
                type="checkbox"
                checked={dados.criterios_sustentabilidade.includes(item)}
                onChange={() => toggleSustentabilidade(item)}
                className="mt-0.5 rounded border-gray-300 text-blue-600"
              />
              <span className="text-sm text-gray-700 group-hover:text-gray-900">{item}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  )
}
