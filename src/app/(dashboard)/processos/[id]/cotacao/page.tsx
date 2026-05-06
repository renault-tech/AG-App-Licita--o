import { obterCotacao } from '@/lib/actions/cotacao'
import CotacaoForm from './cotacao-form'
import { notFound } from 'next/navigation'
import { Info } from 'lucide-react'

export default async function CotacaoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const data = await obterCotacao(id)
  if (!data) return notFound()

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Pesquisa de Precos (Cotacao)</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Defina a fonte e insira as propostas para calculo do valor estimado da contratacao.
          </p>
        </div>
        <div className="shrink-0 hidden sm:flex items-center gap-1.5 text-xs text-blue-700 bg-blue-50 border border-blue-100 px-2.5 py-1.5 rounded-lg">
          <Info className="w-3.5 h-3.5" />
          Art. 23
        </div>
      </div>

      <CotacaoForm cotacao={data.cotacao} fornecedores={data.fornecedores} processoId={id} />
    </div>
  )
}
