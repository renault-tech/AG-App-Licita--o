'use client'

import { useRouter, useSearchParams } from 'next/navigation'

const PERIODOS = [
  { valor: 'dia', label: 'Hoje' },
  { valor: 'semana', label: 'Semana' },
  { valor: 'mes', label: 'Mes' },
  { valor: '90d', label: '90 dias' },
]

export default function FiltrosObservabilidade() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const periodoAtual = searchParams.get('periodo') ?? 'semana'

  function navegar(periodo: string) {
    const params = new URLSearchParams(searchParams.toString())
    params.set('periodo', periodo)
    router.push(`/admin/observabilidade?${params.toString()}`)
  }

  return (
    <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1">
      {PERIODOS.map(p => (
        <button
          key={p.valor}
          onClick={() => navegar(p.valor)}
          className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
            periodoAtual === p.valor
              ? 'bg-white text-gray-900 shadow-sm'
              : 'text-gray-500 hover:text-gray-700'
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  )
}
