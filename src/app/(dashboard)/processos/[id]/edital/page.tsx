import { obterEdital } from '@/lib/actions/edital'
import { obterPapelUsuario } from '@/lib/actions/usuario'
import { notFound } from 'next/navigation'
import EditorEdital from './editor-edital'
import BotoesExportacao from '@/components/documentos/botoes-exportacao'
import { Info } from 'lucide-react'

export default async function EditalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const [edital, papel] = await Promise.all([obterEdital(id), obterPapelUsuario()])
  if (!edital) return notFound()

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Edital da Licitacao</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Instrumento convocatorio com condicoes do certame conforme Arts. 82 a 92 da Lei 14.133/21.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <BotoesExportacao tipo="edital" processoId={id} nomeDocumento="Edital" />
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-blue-700 bg-blue-50 border border-blue-100 px-2.5 py-1.5 rounded-lg">
            <Info className="w-3.5 h-3.5" />
            Arts. 82-92
          </div>
        </div>
      </div>
      <EditorEdital edital={edital} processoId={id} papelUsuario={papel ?? 'requisitante'} />
    </div>
  )
}
