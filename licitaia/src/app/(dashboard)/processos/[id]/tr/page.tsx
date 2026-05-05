import { obterTR } from '@/lib/actions/tr'
import { notFound } from 'next/navigation'
import EditorTR from './editor-tr'

export default async function TRPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  
  const tr = await obterTR(id)
  if (!tr) return notFound()

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Termo de Referência (TR)</h1>
        <p className="text-gray-500 mt-1">Conforme Art. 6º, XXIII da Lei 14.133/21.</p>
      </div>

      <EditorTR tr={tr} processoId={id} />
    </div>
  )
}
