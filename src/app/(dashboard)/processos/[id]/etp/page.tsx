import { obterETP } from '@/lib/actions/etp'
import { notFound } from 'next/navigation'
import EditorETP from './editor-etp'
import { Info } from 'lucide-react'

export default async function ETPPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const etp = await obterETP(id)
  if (!etp) return notFound()

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Estudo Tecnico Preliminar (ETP)</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Constitui a fase preparatoria e sustenta a decisao de contratar conforme Art. 18 da Lei 14.133/21.
          </p>
        </div>
        <div className="shrink-0 hidden sm:flex items-center gap-1.5 text-xs text-blue-700 bg-blue-50 border border-blue-100 px-2.5 py-1.5 rounded-lg">
          <Info className="w-3.5 h-3.5" />
          Art. 18
        </div>
      </div>
      <EditorETP etp={etp} processoId={id} />
    </div>
  )
}
