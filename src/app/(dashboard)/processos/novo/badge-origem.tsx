'use client'

import { useState } from 'react'
import { ExternalLink } from 'lucide-react'
import type { OrigemClausula, ProcessoReferencia } from './types'

interface Props {
  origem: OrigemClausula
  processosReferencia?: ProcessoReferencia[]
}

const CONFIG: Record<OrigemClausula, { label: string; dot: string; classes: string }> = {
  aprendida: {
    label: 'Baseado em processos anteriores',
    dot: 'bg-green-500',
    classes: 'bg-green-50 text-green-700 border-green-200 hover:bg-green-100',
  },
  template: {
    label: 'Template padrao',
    dot: 'bg-amber-400',
    classes: 'bg-amber-50 text-amber-700 border-amber-200',
  },
  ia: {
    label: 'Gerado por IA',
    dot: 'bg-gray-400',
    classes: 'bg-gray-50 text-gray-500 border-gray-200',
  },
  vazio: {
    label: 'Sem conteudo',
    dot: 'bg-red-400',
    classes: 'bg-red-50 text-red-500 border-red-200',
  },
}

const MODALIDADE_LABEL: Record<string, string> = {
  pregao_eletronico: 'Pregao Eletronico',
  pregao_presencial: 'Pregao Presencial',
  concorrencia: 'Concorrencia',
  dispensa: 'Dispensa',
  inexigibilidade: 'Inexigibilidade',
  concurso: 'Concurso',
  leilao: 'Leilao',
  dialogo_competitivo: 'Dialogo Competitivo',
}

export default function BadgeOrigem({ origem, processosReferencia = [] }: Props) {
  const [aberto, setAberto] = useState(false)
  const { label, dot, classes } = CONFIG[origem]
  const temRefs = origem === 'aprendida' && processosReferencia.length > 0
  const count = processosReferencia.length

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => temRefs && setAberto(a => !a)}
        className={`inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full border font-medium transition-colors ${classes} ${temRefs ? 'cursor-pointer' : 'cursor-default'}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
        {temRefs ? `${label} (${count})` : label}
      </button>

      {aberto && temRefs && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setAberto(false)} />
          <div className="absolute left-0 top-7 z-20 w-80 bg-white border border-gray-200 rounded-xl shadow-lg p-3 space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
              Processos de referencia
            </p>
            {processosReferencia.map(p => (
              <a
                key={p.id}
                href={`/processos/${p.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-start gap-2 p-2 rounded-lg hover:bg-gray-50 transition-colors group"
              >
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-blue-600 group-hover:underline">
                    #{p.numero_processo ?? p.id.slice(0, 8)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {MODALIDADE_LABEL[p.modalidade] ?? p.modalidade}
                  </p>
                  <p className="text-xs text-gray-700 truncate">{p.objeto}</p>
                </div>
                <ExternalLink className="w-3 h-3 text-gray-300 group-hover:text-blue-500 shrink-0 mt-0.5" />
              </a>
            ))}
          </div>
        </>
      )}
    </div>
  )
}
