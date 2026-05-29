import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { obterOficio } from '@/lib/actions/oficio'
import { obterPapelUsuario } from '@/lib/actions/usuario'
import { StepPageHeader } from '@/components/licita/step-page-header'
import BotoesExportacao from '@/components/documentos/botoes-exportacao'
import BotaoAssinatura from '@/components/assinatura/botao-assinatura'
import BotaoAvancarEtapa from '@/components/documentos/botao-avancar-etapa'
import EditorOficio from './editor-oficio'
import { obterProvedorAssinatura } from '@/lib/actions/assinaturas'

export default async function OficioPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [papel, oficio, provedor] = await Promise.all([
    obterPapelUsuario(),
    obterOficio(id),
    obterProvedorAssinatura(),
  ])

  if (!oficio) return notFound()

  const { data: processo } = await (supabase as any)
    .from('processos_licitatorios')
    .select('modalidade')
    .eq('id', id)
    .maybeSingle()

  const modalidade = (processo as { modalidade: string } | null)?.modalidade ?? 'dispensa'
  const readonly = papel === 'procurador' || papel === 'gestor_publico'
  const podeAssinar = ['setor_licitacao', 'admin_organizacao', 'admin_plataforma'].includes(papel ?? '')

  return (
    <div className="space-y-4">
      <StepPageHeader
        title="Ofício de Abertura"
        subtitle="Comunica formalmente à Procuradoria a abertura do processo para emissão do Parecer Jurídico."
        actions={
          <>
            {podeAssinar && (
              <BotaoAssinatura
                tabelaOrigem="oficios"
                documentoId={(oficio as any).id}
                processoId={id}
                statusAtual={(oficio as any).status ?? 'rascunho'}
                provedor={provedor}
              />
            )}
            <BotoesExportacao tipo="oficio" processoId={id} nomeDocumento="OFICIO" />
            <BotaoAvancarEtapa processoId={id} proximaEtapaSlug="revisao" />
          </>
        }
      />
      <EditorOficio
        oficio={oficio}
        processoId={id}
        modalidade={modalidade}
        podeEditar={!readonly}
      />
    </div>
  )
}
