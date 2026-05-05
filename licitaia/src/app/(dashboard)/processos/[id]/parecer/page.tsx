import { obterParecer } from '@/lib/actions/parecer'
import { notFound } from 'next/navigation'
import EditorParecer from './editor-parecer'

export default async function ParecerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  
  const parecer = await obterParecer(id)
  if (!parecer) return notFound()

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Procuradoria - Parecer Jurídico</h1>
        <p className="text-gray-500 mt-1">Análise de regularidade do processo conforme o Art. 53 da Lei 14.133/21.</p>
      </div>

      <EditorParecer parecer={parecer} processoId={id} />
    </div>
  )
}
