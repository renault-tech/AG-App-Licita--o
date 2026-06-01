import { obterCotacao } from '@/lib/actions/cotacao'
import { obterPapelUsuario } from '@/lib/actions/usuario'
import CotacaoForm from './cotacao-form'
import { notFound } from 'next/navigation'
import { StepPageHeader } from '@/components/licita/step-page-header'
import BotoesExportacao from '@/components/documentos/botoes-exportacao'
import BotaoAvancarEtapa from '@/components/documentos/botao-avancar-etapa'

export default async function CotacaoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const [data, papel] = await Promise.all([obterCotacao(id), obterPapelUsuario()])
  if (!data) return notFound()

  return (
    <div className="space-y-4">
      <StepPageHeader
        title="Pesquisa de Preços (Cotação)"
        subtitle="Defina a fonte e insira as propostas para cálculo do valor estimado da contratação."
        artigo="Art. 23"
        actions={
          <>
            <BotoesExportacao tipo="cotacao" processoId={id} nomeDocumento="Cotacao" />
            <BotaoAvancarEtapa processoId={id} proximaEtapaSlug="etp" modoAdmin={papel === 'admin_organizacao' || papel === 'admin_plataforma'} />
          </>
        }
      />
      <CotacaoForm cotacao={data.cotacao} fornecedores={data.fornecedores} processoId={id} />
    </div>
  )
}
