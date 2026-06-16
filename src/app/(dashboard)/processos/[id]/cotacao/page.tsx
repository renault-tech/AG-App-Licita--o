import Link from 'next/link'
import { Calculator, Search } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { obterPapelUsuario } from '@/lib/actions/usuario'
import { obterCotacaoCompleta } from '@/lib/actions/cotacao-pncp'
import { RelatorioCotacaoTabela } from '@/components/cotacao/relatorio-tabela'
import { StepPageHeader } from '@/components/licita/step-page-header'
import BotoesExportacao from '@/components/documentos/botoes-exportacao'
import BotaoAvancarEtapa from '@/components/documentos/botao-avancar-etapa'

export default async function CotacaoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [{ data: cotacao }, papel] = await Promise.all([
    (supabase as any).from('cotacoes').select('id').eq('processo_id', id).maybeSingle(),
    obterPapelUsuario(),
  ])

  const modoAdmin = papel === 'admin_organizacao' || papel === 'admin_plataforma'
  const detalhe = cotacao ? await obterCotacaoCompleta((cotacao as any).id) : null

  return (
    <div className="space-y-4">
      <StepPageHeader
        title="Pesquisa de Preços (Cotação)"
        subtitle="Pesquisa de preços em tempo real no PNCP, conforme Art. 23 da Lei 14.133/2021."
        artigo="Art. 23"
        actions={
          <>
            <BotoesExportacao tipo="cotacao" processoId={id} nomeDocumento="Cotacao" />
            <BotaoAvancarEtapa processoId={id} proximaEtapaSlug="etp" modoAdmin={modoAdmin} />
          </>
        }
      />

      {detalhe?.success && detalhe.data ? (
        <RelatorioCotacaoTabela
          relatorio={detalhe.data.relatorio}
          codigoValidacao={detalhe.data.cabecalho.codigo_validacao}
          geradoEm={detalhe.data.cabecalho.gerado_em}
        />
      ) : (
        <div className="rounded-xl border border-dashed border-gray-300 px-6 py-14 text-center">
          <Calculator className="w-8 h-8 mx-auto text-gray-300" />
          <p className="text-sm text-gray-600 mt-3 font-medium">Nenhuma cotação vinculada a este processo.</p>
          <p className="text-xs text-gray-400 mt-1 max-w-md mx-auto">
            Gere a pesquisa de preços consultando o PNCP em tempo real. A cotação será vinculada automaticamente a este processo.
          </p>
          <Link
            href={`/cotacao/nova?processo_id=${id}`}
            className="inline-flex items-center gap-2 mt-4 px-4 py-2.5 text-sm font-semibold rounded-[var(--r-md)] bg-blue-700 text-white hover:bg-blue-800"
          >
            <Search className="w-4 h-4" /> Gerar cotação no PNCP
          </Link>
        </div>
      )}
    </div>
  )
}
