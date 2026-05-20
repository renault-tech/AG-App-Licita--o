'use client'

import { useState } from 'react'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

interface PontoEconomia {
  label: string
  consumidos: number
  economizados: number
}

interface Props {
  dados: PontoEconomia[]
}

export default function GraficoEconomia({ dados }: Props) {
  const [expandido, setExpandido] = useState(false)

  const Chart = ({ altura }: { altura: number }) => (
    <ResponsiveContainer width="100%" height={altura}>
      <AreaChart data={dados} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
        <XAxis dataKey="label" tick={{ fontSize: 11 }} />
        <YAxis tick={{ fontSize: 11 }} />
        <Tooltip
          formatter={(value: unknown) => [typeof value === 'number' ? value.toLocaleString('pt-BR') : String(value), '']}
        />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Area type="monotone" dataKey="consumidos" name="Tokens consumidos" stroke="#ef4444" fill="#fee2e2" strokeWidth={2} />
        <Area type="monotone" dataKey="economizados" name="Tokens economizados" stroke="#22c55e" fill="#dcfce7" strokeWidth={2} />
      </AreaChart>
    </ResponsiveContainer>
  )

  return (
    <>
      <div
        className="bg-white border border-gray-200 rounded-xl p-4 cursor-pointer hover:border-gray-300 transition-colors"
        onClick={() => setExpandido(true)}
        title="Clique para expandir"
      >
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Economia por Clausulas Aprendidas</p>
        <Chart altura={180} />
        <p className="text-[10px] text-gray-400 mt-2 text-right">Clique para expandir</p>
      </div>

      {expandido && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setExpandido(false)}>
          <div
            className="bg-white rounded-2xl p-6 w-[90vw] max-w-4xl shadow-2xl"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <p className="text-sm font-semibold text-gray-800">Economia por Clausulas Aprendidas</p>
              <button onClick={() => setExpandido(false)} className="text-gray-400 hover:text-gray-600 text-sm">Fechar</button>
            </div>
            <Chart altura={400} />
          </div>
        </div>
      )}
    </>
  )
}
