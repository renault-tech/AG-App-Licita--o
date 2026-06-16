import Link from 'next/link'
import { Plus, Calculator, FileText, Globe } from 'lucide-react'
import { listarCotacoes } from '@/lib/actions/cotacao-pncp'

function brl(v: number): string {
  return (v ?? 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

export default async function CotacaoListaPage() {
  const res = await listarCotacoes()
  const cotacoes = res.data ?? []

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Cotacao de Precos</h1>
          <p className="text-sm text-gray-500">
            Pesquisa de precos no PNCP. Gere cotacoes independentes ou anexe a um processo.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href="/cotacao/fontes"
            className="inline-flex items-center gap-2 px-3 py-2.5 text-sm font-medium rounded-[var(--r-md)] border border-gray-300 text-gray-600 hover:bg-gray-50"
          >
            <Globe className="w-4 h-4" /> Fontes web
          </Link>
          <Link
            href="/cotacao/nova"
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-[var(--r-md)] bg-blue-700 text-white hover:bg-blue-800"
          >
            <Plus className="w-4 h-4" /> Nova cotacao
          </Link>
        </div>
      </div>

      {cotacoes.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-300 px-6 py-16 text-center">
          <Calculator className="w-8 h-8 mx-auto text-gray-300" />
          <p className="text-sm text-gray-500 mt-3">Nenhuma cotacao gerada ainda.</p>
          <Link href="/cotacao/nova" className="text-sm text-blue-600 hover:underline mt-1 inline-block">
            Gerar a primeira cotacao
          </Link>
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 divide-y divide-gray-100">
          {cotacoes.map((c) => (
            <Link
              key={c.id}
              href={`/cotacao/${c.id}`}
              className="flex items-center justify-between gap-4 px-5 py-3.5 hover:bg-gray-50 transition-colors"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{c.titulo ?? 'Cotacao sem titulo'}</p>
                <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-2">
                  {c.processo_id ? (
                    <span className="inline-flex items-center gap-1 text-emerald-600">
                      <FileText className="w-3 h-3" /> Vinculada a processo
                    </span>
                  ) : (
                    <span>Independente</span>
                  )}
                  {c.codigo_validacao && <span className="font-mono">· {c.codigo_validacao}</span>}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="text-sm font-semibold text-gray-900">{brl(Number(c.valor_total_geral))}</p>
                <p className="text-xs text-gray-400">
                  {c.gerado_em ? new Date(c.gerado_em).toLocaleDateString('pt-BR') : ''}
                </p>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
