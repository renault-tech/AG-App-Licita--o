import { obterMapaRiscos } from '@/lib/actions/riscos'
import { notFound } from 'next/navigation'
import EditorRiscos from './editor-riscos'

export default async function MapaRiscosPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  
  const mapa = await obterMapaRiscos(id)
  if (!mapa) return notFound()

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Mapa de Riscos</h1>
        <p className="text-gray-500 mt-1">Gerenciamento de riscos do processo licitatório (Art. 22 da Lei 14.133/21).</p>
      </div>

      <EditorRiscos mapa={mapa} processoId={id} />
    </div>
  )
}
