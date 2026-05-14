import { obterETP } from '@/lib/actions/etp'
import { obterPapelUsuario } from '@/lib/actions/usuario'
import { notFound } from 'next/navigation'
import EditorETP from './editor-etp'
import BotoesExportacao from '@/components/documentos/botoes-exportacao'
import { StepPageHeader } from '@/components/licita/step-page-header'
import { getPermissoesOrg, resolverPodeEditar } from '@/lib/cached-permissions'

export default async function ETPPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const [etp, papel, permissoesOrg] = await Promise.all([obterETP(id), obterPapelUsuario(), getPermissoesOrg()])
  if (!etp) return notFound()

  const podeEditar = resolverPodeEditar(permissoesOrg, papel, 'etp')

  return (
    <div className="space-y-4">
      <StepPageHeader
        title="Estudo Técnico Preliminar (ETP)"
        subtitle="Constitui a fase preparatória e sustenta a decisão de contratar conforme Art. 18 da Lei 14.133/21."
        artigo="Art. 18"
        actions={<BotoesExportacao tipo="etp" processoId={id} nomeDocumento="ETP" />}
      />
      <EditorETP etp={etp} processoId={id} papelUsuario={papel ?? 'requisitante'} podeEditar={podeEditar} />
    </div>
  )
}
