import { obterETP } from '@/lib/actions/etp'
import { notFound } from 'next/navigation'
import EditorETP from './editor-etp'

export default async function ETPPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  
  const etp = await obterETP(id)
  if (!etp) return notFound()

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Estudo Técnico Preliminar (ETP)</h1>
        <p className="text-gray-500 mt-1">Documento constitutivo da fase preparatória conforme Art. 18 da Lei 14.133/21.</p>
      </div>

      <EditorETP etp={etp} processoId={id} />
    </div>
  )
}
