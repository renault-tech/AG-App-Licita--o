import Link from 'next/link'
import { ArrowLeft, FileText } from 'lucide-react'
import { notFound } from 'next/navigation'
import { obterCotacaoCompleta } from '@/lib/actions/cotacao-pncp'
import { RelatorioCotacaoTabela } from '@/components/cotacao/relatorio-tabela'
import { AdicionarPrecoWeb } from '@/components/cotacao/adicionar-preco-web'
import { AnexarProcesso } from './anexar-processo'

export default async function CotacaoDetalhePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const res = await obterCotacaoCompleta(id)
  if (!res.success || !res.data) return notFound()

  const { cabecalho, relatorio } = res.data
  const vinculada = !!cabecalho.processo_id

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/cotacao" className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100">
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div>
            <h1 className="text-lg font-bold text-gray-900">{cabecalho.titulo ?? 'Cotacao de Precos'}</h1>
            <p className="text-sm text-gray-500">Relatorio de Pesquisa de Precos · Art. 23, Lei 14.133/2021</p>
          </div>
        </div>
        {vinculada ? (
          <Link
            href={`/processos/${cabecalho.processo_id}/cotacao`}
            className="inline-flex items-center gap-1.5 text-sm text-emerald-600 hover:underline"
          >
            <FileText className="w-4 h-4" /> Ver no processo
          </Link>
        ) : (
          <AnexarProcesso cotacaoId={id} />
        )}
      </div>

      <RelatorioCotacaoTabela
        relatorio={relatorio}
        codigoValidacao={cabecalho.codigo_validacao}
        geradoEm={cabecalho.gerado_em}
        acaoItem={(itemId) => <AdicionarPrecoWeb itemId={itemId} />}
      />
    </div>
  )
}
