import { obterMapaRiscos } from '@/lib/actions/riscos'
import { obterPapelUsuario } from '@/lib/actions/usuario'
import { notFound } from 'next/navigation'
import EditorRiscos from './editor-riscos'
import BotoesExportacao from '@/components/documentos/botoes-exportacao'
import { StepPageHeader } from '@/components/licita/step-page-header'
import { getPermissoesOrg, resolverPodeEditar } from '@/lib/cached-permissions'

export default async function MapaRiscosPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const [mapa, papel, permissoesOrg] = await Promise.all([obterMapaRiscos(id), obterPapelUsuario(), getPermissoesOrg()])
  if (!mapa) return notFound()

  const podeEditar = resolverPodeEditar(permissoesOrg, papel, 'riscos')

  return (
    <div className="space-y-4">
      <StepPageHeader
        title="Mapa de Riscos"
        subtitle="Identificação e tratamento de riscos do processo licitatório conforme Art. 22 da Lei 14.133/21."
        artigo="Art. 22"
        actions={<BotoesExportacao tipo="riscos" processoId={id} nomeDocumento="Mapa-de-Riscos" />}
      />
      <EditorRiscos mapa={mapa} processoId={id} papelUsuario={papel ?? 'requisitante'} podeEditar={podeEditar} />
    </div>
  )
}
