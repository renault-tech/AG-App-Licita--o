import { obterCotacao } from '@/lib/actions/cotacao'
import CotacaoForm from './cotacao-form'
import { notFound } from 'next/navigation'
import { StepPageHeader } from '@/components/licita/step-page-header'

export default async function CotacaoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const data = await obterCotacao(id)
  if (!data) return notFound()

  return (
    <div className="space-y-4">
      <StepPageHeader
        title="Pesquisa de Preços (Cotação)"
        subtitle="Defina a fonte e insira as propostas para cálculo do valor estimado da contratação."
        artigo="Art. 23"
      />
      <CotacaoForm cotacao={data.cotacao} fornecedores={data.fornecedores} processoId={id} />
    </div>
  )
}
