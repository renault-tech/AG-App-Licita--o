'use client'

import { AlertTriangle } from 'lucide-react'

interface Anomalia {
  chave: string
  ips_detectados: string[]
  chamadas: number
  atualizado_em: string
}

interface Props {
  anomalias: Anomalia[]
}

export default function PainelAnomalias({ anomalias }: Props) {
  if (anomalias.length === 0) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-4">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Anomalias de Acesso</p>
        <p className="text-sm text-gray-400">Nenhuma anomalia detectada no periodo.</p>
      </div>
    )
  }

  return (
    <div className="bg-white border border-amber-200 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <AlertTriangle className="w-4 h-4 text-amber-500" />
        <p className="text-xs font-semibold text-amber-700 uppercase tracking-wide">
          {anomalias.length} anomalia{anomalias.length > 1 ? 's' : ''} detectada{anomalias.length > 1 ? 's' : ''}
        </p>
      </div>
      <div className="space-y-2">
        {anomalias.map((a, i) => (
          <div key={i} className="flex items-start justify-between text-xs border-t border-gray-100 pt-2">
            <div>
              <p className="text-gray-700 font-medium">Usuario/Org: {a.chave}</p>
              <p className="text-gray-500">{a.chamadas} chamadas de {a.ips_detectados.length} IPs distintos</p>
            </div>
            <p className="text-gray-400 shrink-0 ml-4">
              {new Date(a.atualizado_em).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
