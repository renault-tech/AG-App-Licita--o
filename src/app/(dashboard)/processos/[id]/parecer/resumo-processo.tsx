'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, AlertTriangle } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import type { ResumoProcesso } from '@/lib/actions/procuradoria'

const MODALIDADE_LABEL: Record<string, string> = {
  pregao_eletronico: 'Pregao Eletronico',
  pregao_presencial: 'Pregao Presencial',
  concorrencia:      'Concorrencia',
  concurso:          'Concurso',
  leilao:            'Leilao',
  dialogo_competitivo: 'Dialogo Competitivo',
  dispensa:          'Dispensa',
  inexigibilidade:   'Inexigibilidade',
}

function CampoResumo({ label, valor }: { label: string; valor: string | null }) {
  const [expandido, setExpandido] = useState(false)
  if (!valor) return null
  const longo = valor.length > 200
  return (
    <div>
      <dt className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">{label}</dt>
      <dd className="text-sm text-gray-800 mt-0.5">
        {longo && !expandido ? valor.slice(0, 200) + '...' : valor}
        {longo && (
          <button
            onClick={() => setExpandido(!expandido)}
            className="ml-1 text-[11px] text-blue-600 hover:underline"
          >
            {expandido ? 'ver menos' : 'ver mais'}
          </button>
        )}
      </dd>
    </div>
  )
}

export default function ResumoProcesso({ resumo }: { resumo: ResumoProcesso }) {
  const [aberto, setAberto] = useState(true)

  return (
    <Card className="border-gray-200 shadow-sm">
      <button
        onClick={() => setAberto(!aberto)}
        className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-gray-50/50 transition-colors rounded-t-xl"
      >
        <div>
          <span className="text-sm font-semibold text-gray-800">Resumo do Processo</span>
          <span className="ml-2 text-[11px] text-gray-400">dados para analise</span>
        </div>
        {aberto ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>

      {aberto && (
        <CardContent className="px-5 pb-5 pt-0 border-t border-gray-100">
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 mt-4">
            <CampoResumo label="Objeto"       valor={resumo.objeto} />
            <div>
              <dt className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Modalidade</dt>
              <dd className="text-sm text-gray-800 mt-0.5">{MODALIDADE_LABEL[resumo.modalidade] ?? resumo.modalidade}</dd>
            </div>
            {resumo.valor_estimado && (
              <div>
                <dt className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Valor estimado</dt>
                <dd className="text-sm text-gray-800 mt-0.5">
                  {resumo.valor_estimado.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                </dd>
              </div>
            )}
            {resumo.secretaria_nome && (
              <div>
                <dt className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide">Secretaria</dt>
                <dd className="text-sm text-gray-800 mt-0.5">{resumo.secretaria_nome}</dd>
              </div>
            )}
            <CampoResumo label="Justificativa da contratacao" valor={resumo.justificativa} />
            <CampoResumo label="Principais requisitos tecnicos" valor={resumo.requisitos_tecnicos} />
            <CampoResumo label="Resultados pretendidos" valor={resumo.resultados_pretendidos} />
          </dl>

          {resumo.riscos_criticos.length > 0 && (
            <div className="mt-5 p-4 bg-red-50 border border-red-100 rounded-lg">
              <div className="flex items-center gap-1.5 mb-2">
                <AlertTriangle className="w-3.5 h-3.5 text-red-600" />
                <span className="text-xs font-semibold text-red-700">Riscos de alta criticidade identificados</span>
              </div>
              <ul className="space-y-1">
                {resumo.riscos_criticos.map((r, i) => (
                  <li key={i} className="text-xs text-red-800">
                    {r.descricao}
                    <span className="text-red-500 ml-1">(prob: {r.probabilidade}, impacto: {r.impacto})</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      )}
    </Card>
  )
}
