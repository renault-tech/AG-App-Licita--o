import { obterETP } from '@/lib/actions/etp'
import { obterPapelUsuario } from '@/lib/actions/usuario'
import { notFound } from 'next/navigation'
import EditorETP from './editor-etp'
import BotoesExportacao from '@/components/documentos/botoes-exportacao'
import BotaoAssinatura from '@/components/assinatura/botao-assinatura'
import BotaoAvancarEtapa from '@/components/documentos/botao-avancar-etapa'
import { StepPageHeader } from '@/components/licita/step-page-header'
import { getPermissoesOrg, resolverPodeEditar } from '@/lib/cached-permissions'
import { obterProvedorAssinatura } from '@/lib/actions/assinaturas'

export default async function ETPPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const [etp, papel, permissoesOrg, provedor] = await Promise.all([
    obterETP(id),
    obterPapelUsuario(),
    getPermissoesOrg(),
    obterProvedorAssinatura(),
  ])
  if (!etp) return notFound()

  const podeAssinar = ['setor_licitacao', 'requisitante', 'admin_organizacao', 'admin_plataforma'].includes(papel ?? '')
  const podeEditar = resolverPodeEditar(permissoesOrg, papel, 'etp')

  return (
    <div className="space-y-4">
      <StepPageHeader
        title="Estudo Técnico Preliminar (ETP)"
        subtitle="Constitui a fase preparatória e sustenta a decisão de contratar conforme Art. 18 da Lei 14.133/21."
        artigo="Art. 18"
        actions={
          <>
            {podeAssinar && (
              <BotaoAssinatura
                tabelaOrigem="etp"
                documentoId={(etp as any).id}
                processoId={id}
                statusAtual={(etp as any).status ?? 'rascunho'}
                provedor={provedor}
              />
            )}
            <BotoesExportacao tipo="etp" processoId={id} nomeDocumento="ETP" />
            <BotaoAvancarEtapa processoId={id} proximaEtapaSlug="tr" />
          </>
        }
      />
      <EditorETP etp={etp} processoId={id} papelUsuario={papel ?? 'requisitante'} podeEditar={podeEditar} />
    </div>
  )
}
