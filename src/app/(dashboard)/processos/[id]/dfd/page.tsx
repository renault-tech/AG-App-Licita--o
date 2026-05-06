import { obterDFD } from '@/lib/actions/dfd'
import { notFound } from 'next/navigation'
import EditorDFD from './editor-dfd'
import { Info } from 'lucide-react'

export default async function DFDPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const dfd = await obterDFD(id)

  if (!dfd) return notFound()

  return (
    <div className="space-y-4">
      {/* Cabecalho da etapa */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Documento de Formalizacao da Demanda</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Formalize a necessidade de contratacao conforme Art. 6&ordm;, X da Lei 14.133/21.
          </p>
        </div>
        <div className="shrink-0 hidden sm:flex items-center gap-1.5 text-xs text-blue-700 bg-blue-50 border border-blue-100 px-2.5 py-1.5 rounded-lg">
          <Info className="w-3.5 h-3.5" />
          Art. 6&ordm;, X
        </div>
      </div>

      <EditorDFD dfd={dfd} processoId={id} />
    </div>
  )
}
