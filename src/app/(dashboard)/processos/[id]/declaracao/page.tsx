import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { obterDeclaracao } from '@/lib/actions/declaracao'
import { obterPapelUsuario } from '@/lib/actions/usuario'
import { StepPageHeader } from '@/components/licita/step-page-header'
import BotoesExportacao from '@/components/documentos/botoes-exportacao'
import BotaoAssinatura from '@/components/assinatura/botao-assinatura'
import EditorDeclaracao from './editor-declaracao'
import { obterProvedorAssinatura } from '@/lib/actions/assinaturas'

export default async function DeclaracaoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [papel, declaracao, provedor] = await Promise.all([
    obterPapelUsuario(),
    obterDeclaracao(id),
    obterProvedorAssinatura(),
  ])

  if (!declaracao) return notFound()

  const readonly = papel === 'procurador' || papel === 'gestor_publico'
  const podeAssinar = ['requisitante', 'setor_licitacao', 'admin_organizacao', 'admin_plataforma'].includes(papel ?? '')

  return (
    <div className="space-y-4">
      <StepPageHeader
        title="Declaração do Setor Requisitante"
        subtitle="Documento que formaliza a necessidade da contratação pelo setor requisitante."
        actions={
          <>
            {podeAssinar && (
              <BotaoAssinatura
                tabelaOrigem="declaracoes"
                documentoId={(declaracao as any).id}
                processoId={id}
                statusAtual={(declaracao as any).status ?? 'rascunho'}
                provedor={provedor}
              />
            )}
            <BotoesExportacao tipo="declaracao" processoId={id} nomeDocumento="DECLARACAO" />
          </>
        }
      />
      <EditorDeclaracao
        declaracao={declaracao}
        processoId={id}
        podeEditar={!readonly}
      />
    </div>
  )
}
