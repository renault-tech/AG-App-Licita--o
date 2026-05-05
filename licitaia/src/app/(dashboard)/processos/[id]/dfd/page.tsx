import { obterDFD } from '@/lib/actions/dfd'
import { notFound } from 'next/navigation'
import EditorDFD from './editor-dfd'

export default async function DFDPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const dfd = await obterDFD(id)

  if (!dfd) {
    return notFound()
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Documento de Formalização da Demanda (DFD)</h1>
        <p className="text-gray-500 mt-1">Revise e aprimore as seções do documento (Art. 6º, X da Lei 14.133/21).</p>
      </div>

      <EditorDFD dfd={dfd} processoId={id} />
    </div>
  )
}
