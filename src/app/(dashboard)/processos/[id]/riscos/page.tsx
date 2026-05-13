import { obterMapaRiscos } from '@/lib/actions/riscos'
import { obterPapelUsuario } from '@/lib/actions/usuario'
import { notFound } from 'next/navigation'
import EditorRiscos from './editor-riscos'
import BotoesExportacao from '@/components/documentos/botoes-exportacao'
import { Info } from 'lucide-react'
import { getPermissoesOrg, resolverPodeEditar } from '@/lib/cached-permissions'

export default async function MapaRiscosPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const [mapa, papel, permissoesOrg] = await Promise.all([obterMapaRiscos(id), obterPapelUsuario(), getPermissoesOrg()])
  if (!mapa) return notFound()

  const podeEditar = resolverPodeEditar(permissoesOrg, papel, 'riscos')

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Mapa de Riscos</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Identificacao e tratamento de riscos do processo licitatorio conforme Art. 22 da Lei 14.133/21.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <BotoesExportacao tipo="riscos" processoId={id} nomeDocumento="Mapa-de-Riscos" />
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-blue-700 bg-blue-50 border border-blue-100 px-2.5 py-1.5 rounded-lg">
            <Info className="w-3.5 h-3.5" />
            Art. 22
          </div>
        </div>
      </div>
      <EditorRiscos mapa={mapa} processoId={id} papelUsuario={papel ?? 'requisitante'} podeEditar={podeEditar} />
    </div>
  )
}
