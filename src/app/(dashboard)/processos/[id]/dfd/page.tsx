import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { StepPageHeader } from '@/components/licita/step-page-header'
import { obterDFD, obterParticipacoesComItens, verificarPrazoAdesao } from '@/lib/actions/dfd'
import { obterPapelUsuario } from '@/lib/actions/usuario'
import { getPermissoesOrg, resolverPodeEditar } from '@/lib/cached-permissions'
import BotoesExportacao from '@/components/documentos/botoes-exportacao'
import BotaoAssinatura from '@/components/assinatura/botao-assinatura'
import EditorDFD from './editor-dfd'
import PainelAdesao from './painel-adesao'
import PainelConsolidacao from './painel-consolidacao'
import { obterProvedorAssinatura } from '@/lib/actions/assinaturas'

export default async function DFDPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: processoId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return notFound()

  // Obtem usuario e secretaria vinculada
  const { data: usuarioRaw } = await (supabase as any)
    .from('usuarios')
    .select('id, organizacao_id, nome_completo')
    .eq('id', user.id)
    .maybeSingle()

  if (!usuarioRaw) return notFound()

  // Carrega DFD (cria se nao existir) e flag de cotacao pendente do processo
  const [dfdInicial, papel, permissoesOrg, processoRaw, provedor] = await Promise.all([
    obterDFD(processoId),
    obterPapelUsuario(),
    getPermissoesOrg(),
    (supabase as any)
      .from('processos_licitatorios')
      .select('cotacao_pendente')
      .eq('id', processoId)
      .maybeSingle(),
    obterProvedorAssinatura(),
  ])

  const cotacaoPendente = (processoRaw.data as any)?.cotacao_pendente ?? false

  if (!dfdInicial) return notFound()

  // Verifica e atualiza prazo encerrado automaticamente
  await verificarPrazoAdesao(dfdInicial.id)

  // Recarrega apos possivel mudanca de status do prazo
  const dfdRecarregado = await obterDFD(processoId)
  if (!dfdRecarregado) return notFound()

  const dfd = dfdRecarregado
  const papelUsuario = papel ?? 'requisitante'
  const statusAdesao = dfd.status_adesao
  const podeEditar = resolverPodeEditar(permissoesOrg, papel, 'dfd')
  const podeAssinar = ['requisitante', 'setor_licitacao', 'admin_organizacao', 'admin_plataforma'].includes(papelUsuario)

  let participacaoDoUsuario = null
  let ehIniciador = true

  if (dfd.tipo === 'compartilhado') {
    const partComItens = await obterParticipacoesComItens(dfd.id)

    const { data: secUsuarioRaw } = await (supabase as any)
      .from('secretarias')
      .select('id')
      .eq('organizacao_id', (usuarioRaw as any).organizacao_id)
      .eq('ativo', true)
      .limit(1)
      .maybeSingle()

    const secIdUsuario = (secUsuarioRaw as any)?.id as string | undefined

    if (secIdUsuario) {
      const partIniciadora = partComItens.find(p => p.tipo === 'iniciadora')
      ehIniciador = partIniciadora?.secretaria_id === secIdUsuario

      if (!ehIniciador) {
        participacaoDoUsuario = partComItens.find(
          p => p.secretaria_id === secIdUsuario && p.tipo === 'participante'
        ) ?? null
      }
    }

    // Painel de consolidacao: iniciador vendo DFD com prazo encerrado ou ja consolidado
    if (ehIniciador && ['prazo_encerrado', 'consolidado'].includes(statusAdesao)) {
      return (
        <div className="space-y-4">
          <StepPageHeader
            title="Documento de Formalização da Demanda"
            subtitle="Consolidação das demandas de todas as secretarias participantes."
            artigo="Art. 6º, X"
            actions={<BotoesExportacao tipo="dfd" processoId={processoId} nomeDocumento="DFD" />}
          />
          <PainelConsolidacao
            dfd={{
              id: dfd.id,
              objeto: dfd.objeto,
              justificativa_necessidade: dfd.justificativa_necessidade,
              secretaria_nome: dfd.secretaria_nome,
              prazo_adesao: dfd.prazo_adesao,
              status_adesao: dfd.status_adesao,
              consolidado_em: dfd.consolidado_em,
              itens: dfd.itens,
              participacoes: partComItens,
            }}
            processoId={processoId}
          />
        </div>
      )
    }

    // Painel de adesao: secretaria participante respondendo ao convite
    if (!ehIniciador && participacaoDoUsuario && statusAdesao === 'aguardando_adesao') {
      return (
        <div className="space-y-4">
          <StepPageHeader
            title="Adesão ao Processo Compartilhado"
            subtitle="Manifeste o interesse da sua secretaria neste processo."
            artigo="Art. 6º, X"
          />
          <PainelAdesao
            dfd={{
              id: dfd.id,
              objeto: dfd.objeto,
              justificativa_necessidade: dfd.justificativa_necessidade,
              secretaria_nome: dfd.secretaria_nome,
              secretaria_email: dfd.secretaria_email,
              secretaria_telefone: dfd.secretaria_telefone,
              secretario_responsavel: dfd.secretario_responsavel,
              prazo_adesao: dfd.prazo_adesao,
              itens: dfd.itens,
            }}
            participacao={participacaoDoUsuario}
          />
        </div>
      )
    }
  }

  // Default: editor completo (iniciador em rascunho ou aguardando adesao)
  return (
    <div className="space-y-4">
      <StepPageHeader
        title="Documento de Formalização da Demanda"
        subtitle="Formalize a necessidade de contratação conforme Art. 6º, X da Lei 14.133/21."
        artigo="Art. 6º, X"
        actions={
          <>
            {podeAssinar && (
              <BotaoAssinatura
                tabelaOrigem="dfd"
                documentoId={dfd.id}
                processoId={processoId}
                statusAtual={(dfd as any).status ?? 'rascunho'}
                provedor={provedor}
              />
            )}
            <BotoesExportacao tipo="dfd" processoId={processoId} nomeDocumento="DFD" />
          </>
        }
      />
      <EditorDFD
        dfd={dfd}
        processoId={processoId}
        papelUsuario={papelUsuario}
        podeEditar={podeEditar}
        cotacaoPendente={cotacaoPendente}
      />
    </div>
  )
}
