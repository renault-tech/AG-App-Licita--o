import { notFound } from 'next/navigation'
import { Info } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'

import { obterDFD, obterParticipacoesComItens, verificarPrazoAdesao } from '@/lib/actions/dfd'
import { obterPapelUsuario } from '@/lib/actions/usuario'
import { getPermissoesOrg, resolverPodeEditar } from '@/lib/cached-permissions'
import BotoesExportacao from '@/components/documentos/botoes-exportacao'
import EditorDFD from './editor-dfd'
import PainelAdesao from './painel-adesao'
import PainelConsolidacao from './painel-consolidacao'

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

  // Carrega DFD (cria se nao existir)
  const [dfdInicial, papel, permissoesOrg] = await Promise.all([
    obterDFD(processoId),
    obterPapelUsuario(),
    getPermissoesOrg(),
  ])

  if (!dfdInicial) return notFound()

  // Verifica e atualiza prazo encerrado automaticamente
  await verificarPrazoAdesao(dfdInicial.id)

  // Recarrega apos possivel mudanca de status do prazo
  const dfdRecarregado = await obterDFD(processoId)
  if (!dfdRecarregado) return notFound()

  // Alias nao-nulo para uso no restante da funcao
  const dfd = dfdRecarregado

  const papelUsuario = papel ?? 'requisitante'
  const statusAdesao = dfd.status_adesao
  const podeEditar = resolverPodeEditar(permissoesOrg, papel, 'dfd')

  // Determina a view correta baseado no contexto do usuario:
  // 1. Se o DFD esta em consolidacao (prazo encerrado ou consolidado) e usuario e da secretaria iniciadora:
  //    mostra PainelConsolidacao
  // 2. Se usuario pertence a uma secretaria convidada e o DFD esta aguardando adesao:
  //    mostra PainelAdesao
  // 3. Caso default: EditorDFD (criador/iniciador)

  let participacaoDoUsuario = null
  let ehIniciador = true

  if (dfd.tipo === 'compartilhado') {
    // Busca todas participacoes com itens para consolidacao
    const partComItens = await obterParticipacoesComItens(dfd.id)

    // Verifica se usuario e da secretaria iniciadora ou participante
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
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-lg font-bold text-gray-900">Documento de Formalizacao da Demanda</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Consolidacao das demandas de todas as secretarias participantes.
              </p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <BotoesExportacao tipo="dfd" processoId={processoId} nomeDocumento="DFD" />
              <div className="hidden sm:flex items-center gap-1.5 text-xs text-blue-700 bg-blue-50 border border-blue-100 px-2.5 py-1.5 rounded-lg">
                <Info className="w-3.5 h-3.5" />
                Art. 6&ordm;, X
              </div>
            </div>
          </div>

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
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-lg font-bold text-gray-900">Adesao ao Processo Compartilhado</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                Manifeste o interesse da sua secretaria neste processo. Art. 6&ordm;, X da Lei 14.133/21.
              </p>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-blue-700 bg-blue-50 border border-blue-100 px-2.5 py-1.5 rounded-lg">
              <Info className="w-3.5 h-3.5" />
              Art. 6&ordm;, X
            </div>
          </div>

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
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Documento de Formalizacao da Demanda</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Formalize a necessidade de contratacao conforme Art. 6&ordm;, X da Lei 14.133/21.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <BotoesExportacao tipo="dfd" processoId={processoId} nomeDocumento="DFD" />
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-blue-700 bg-blue-50 border border-blue-100 px-2.5 py-1.5 rounded-lg">
            <Info className="w-3.5 h-3.5" />
            Art. 6&ordm;, X
          </div>
        </div>
      </div>

      <EditorDFD
        dfd={dfd}
        processoId={processoId}
        papelUsuario={papelUsuario}
        podeEditar={podeEditar}
      />
    </div>
  )
}