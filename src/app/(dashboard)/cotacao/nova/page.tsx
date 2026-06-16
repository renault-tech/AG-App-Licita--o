import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { NovaCotacaoForm } from './nova-cotacao-form'

export default async function NovaCotacaoPage({
  searchParams,
}: {
  searchParams: Promise<{ processo_id?: string }>
}) {
  const { processo_id } = await searchParams

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/cotacao" className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-lg font-bold text-gray-900">Nova Cotacao de Precos</h1>
          <p className="text-sm text-gray-500">
            Pesquisa de precos em tempo real no PNCP, conforme Art. 23 da Lei 14.133/2021.
          </p>
        </div>
      </div>
      <NovaCotacaoForm processoId={processo_id} />
    </div>
  )
}
