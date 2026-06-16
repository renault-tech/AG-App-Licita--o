import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import { listarFontesWeb } from '@/lib/actions/cotacao-pncp'
import { FontesWebCliente } from './fontes-web-cliente'

export default async function FontesWebPage() {
  const res = await listarFontesWeb()
  const fontes = res.data ?? []

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/cotacao" className="p-1.5 rounded-lg text-gray-400 hover:bg-gray-100">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-lg font-bold text-gray-900">Fontes Web Confiaveis</h1>
          <p className="text-sm text-gray-500">
            Sites permitidos para pesquisa de precos em midia especializada, Art. 23, inciso III da Lei 14.133/2021.
          </p>
        </div>
      </div>
      <FontesWebCliente inicial={fontes} />
    </div>
  )
}
