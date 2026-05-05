import { obterEdital } from '@/lib/actions/edital'
import { notFound } from 'next/navigation'
import EditorEdital from './editor-edital'

export default async function EditalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  
  const edital = await obterEdital(id)
  if (!edital) return notFound()

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Edital de Licitação</h1>
        <p className="text-gray-500 mt-1">Gerado com base na modalidade: {edital.processos_licitatorios?.modalidade}</p>
      </div>

      <EditorEdital edital={edital} processoId={id} />
    </div>
  )
}
