import { obterTR } from '@/lib/actions/tr'
import { obterPapelUsuario } from '@/lib/actions/usuario'
import { notFound } from 'next/navigation'
import EditorTR from './editor-tr'
import BotoesExportacao from '@/components/documentos/botoes-exportacao'
import BotaoAssinatura from '@/components/assinatura/botao-assinatura'
import BotaoAvancarEtapa from '@/components/documentos/botao-avancar-etapa'
import { StepPageHeader } from '@/components/licita/step-page-header'
import { getPermissoesOrg, resolverPodeEditar } from '@/lib/cached-permissions'
import { obterProvedorAssinatura } from '@/lib/actions/assinaturas'

export default async function TRPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const [tr, papel, permissoesOrg, provedor] = await Promise.all([
    obterTR(id),
    obterPapelUsuario(),
    getPermissoesOrg(),
    obterProvedorAssinatura(),
  ])
  if (!tr) return notFound()

  const podeAssinar = ['setor_licitacao', 'admin_organizacao', 'admin_plataforma'].includes(papel ?? '')
  const podeEditar = resolverPodeEditar(permissoesOrg, papel, 'tr')

  return (
    <div className="space-y-4">
      <StepPageHeader
        title="Termo de Referência (TR)"
        subtitle="Documento que define o objeto da contratação e suas condições conforme Art. 6º, XXIII da Lei 14.133/21."
        artigo="Art. 6º, XXIII"
        actions={
          <>
            {podeAssinar && (
              <BotaoAssinatura
                tabelaOrigem="termo_referencia"
                documentoId={(tr as any).id}
                processoId={id}
                statusAtual={(tr as any).status ?? 'rascunho'}
                provedor={provedor}
              />
            )}
            <BotoesExportacao tipo="tr" processoId={id} nomeDocumento="TR" />
            <BotaoAvancarEtapa processoId={id} proximaEtapaSlug="riscos" />
          </>
        }
      />
      <EditorTR tr={tr} processoId={id} papelUsuario={papel ?? 'requisitante'} podeEditar={podeEditar} />
    </div>
  )
}
