import { obterParecer } from '@/lib/actions/parecer'
import { notFound } from 'next/navigation'
import EditorParecer from './editor-parecer'

export default async function ParecerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  
  const parecer = await obterParecer(id)
  if (!parecer) return notFound()

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Parecer Juridico</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Analise de regularidade do processo pela Procuradoria conforme Art. 53 da Lei 14.133/21.
          </p>
        </div>
        <div className="shrink-0 hidden sm:flex items-center gap-1.5 text-xs text-blue-700 bg-blue-50 border border-blue-100 px-2.5 py-1.5 rounded-lg">
          <span className="font-medium">Art. 53</span>
        </div>
      </div>
      <EditorParecer parecer={parecer} processoId={id} />
    </div>
  )
}
