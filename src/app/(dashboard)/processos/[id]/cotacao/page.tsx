import { obterCotacao } from '@/lib/actions/cotacao'
import CotacaoForm from './cotacao-form'
import { notFound } from 'next/navigation'

export default async function CotacaoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  
  const data = await obterCotacao(id)
  if (!data) return notFound()

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Pesquisa de Preços (Cotação)</h1>
        <p className="text-gray-500 mt-1">Conforme Art. 23 da Lei 14.133/21. Defina a fonte e insira as propostas para o cálculo do valor estimado.</p>
      </div>

      <CotacaoForm cotacao={data.cotacao} fornecedores={data.fornecedores} processoId={id} />
    </div>
  )
}
