import { obterEdital } from '@/lib/actions/edital'
import { obterPapelUsuario } from '@/lib/actions/usuario'
import { notFound } from 'next/navigation'
import EditorEdital from './editor-edital'
import BotoesExportacao from '@/components/documentos/botoes-exportacao'
import BotaoAssinatura from '@/components/assinatura/botao-assinatura'
import { StepPageHeader } from '@/components/licita/step-page-header'
import { getPermissoesOrg, resolverPodeEditar } from '@/lib/cached-permissions'

export default async function EditalPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const [edital, papel, permissoesOrg] = await Promise.all([obterEdital(id), obterPapelUsuario(), getPermissoesOrg()])
  if (!edital) return notFound()

  const podeAssinar = ['setor_licitacao', 'admin_organizacao', 'admin_plataforma'].includes(papel ?? '')
  const podeEditar = resolverPodeEditar(permissoesOrg, papel, 'edital')

  return (
    <div className="space-y-4">
      <StepPageHeader
        title="Edital da Licitação"
        subtitle="Instrumento convocatório com condições do certame conforme Arts. 82 a 92 da Lei 14.133/21."
        artigo="Arts. 82-92"
        actions={
          <>
            {podeAssinar && (
              <BotaoAssinatura
                tabelaOrigem="edital"
                documentoId={(edital as any).id}
                processoId={id}
                statusAtual={(edital as any).status ?? 'rascunho'}
              />
            )}
            <BotoesExportacao tipo="edital" processoId={id} nomeDocumento="Edital" />
          </>
        }
      />
      <EditorEdital edital={edital} processoId={id} papelUsuario={papel ?? 'requisitante'} podeEditar={podeEditar} />
    </div>
  )
}
