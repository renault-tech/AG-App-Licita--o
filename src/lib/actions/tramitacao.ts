'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// Tabelas de documento que participam do ciclo de tramitacao
type TabelaDocumento = 'dfd' | 'etp' | 'termo_referencia' | 'mapa_riscos' | 'edital'

interface ResultadoTramitacao {
  success: boolean
  error?: string
}

async function obterUsuarioComPapel() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('id, papel, organizacao_id, nome_completo')
    .eq('id', user.id)
    .maybeSingle()

  return usuario as { id: string; papel: string; organizacao_id: string; nome_completo: string } | null
}

async function gravarVersao(
  supabase: Awaited<ReturnType<typeof createClient>>,
  tabelaOrigem: string,
  documentoId: string,
  organizacaoId: string,
  usuarioId: string,
  conteudoSnap: Record<string, unknown>,
  motivo: string
) {
  await (supabase as any).from('versoes_documento').insert({
    tabela_origem: tabelaOrigem,
    documento_id: documentoId,
    organizacao_id: organizacaoId,
    usuario_id: usuarioId,
    conteudo_snap: conteudoSnap,
    motivo,
  })
}

export async function enviarParaRevisao(
  tabela: TabelaDocumento,
  documentoId: string,
  processoId: string
): Promise<ResultadoTramitacao> {
  const supabase = await createClient()
  const usuario = await obterUsuarioComPapel()
  if (!usuario) return { success: false, error: 'Não autenticado.' }

  // Busca estado atual do documento
  const { data: doc } = await (supabase as any)
    .from(tabela)
    .select('*')
    .eq('id', documentoId)
    .maybeSingle()

  if (!doc) return { success: false, error: 'Documento nao encontrado.' }
  if (doc.status !== 'rascunho' && doc.status !== 'devolvido') {
    return { success: false, error: 'Apenas documentos em rascunho ou devolvidos podem ser enviados para revisão.' }
  }

  const { error } = await (supabase as any)
    .from(tabela)
    .update({ status: 'em_revisao', updated_at: new Date().toISOString() })
    .eq('id', documentoId)

  if (error) return { success: false, error: error.message }

  await gravarVersao(supabase, tabela, documentoId, usuario.organizacao_id, usuario.id, doc, 'Enviado para revisão')

  // Notifica analistas da organizacao
  const { data: analistas } = await supabase
    .from('usuarios')
    .select('id')
    .eq('organizacao_id', usuario.organizacao_id)
    .eq('papel', 'setor_licitacao')
    .eq('ativo', true)

  if (analistas && analistas.length > 0) {
    const nomeTabela: Record<TabelaDocumento, string> = {
      dfd:             'DFD',
      etp:             'ETP',
      termo_referencia:'TR',
      mapa_riscos:     'Mapa de Riscos',
      edital:          'Edital',
    }
    const notificacoes = analistas.map((a: { id: string }) => ({
      usuario_id: a.id,
      organizacao_id: usuario.organizacao_id,
      processo_id: processoId,
      titulo: `Documento aguarda revisão: ${nomeTabela[tabela]}`,
      mensagem: `${usuario.nome_completo} enviou o ${nomeTabela[tabela]} para revisão do setor de licitações.`,
      lida: false,
      link: `/processos/${processoId}/revisao`,
    }))
    await (supabase as any).from('notificacoes').insert(notificacoes)
  }

  revalidatePath(`/processos/${processoId}`)
  return { success: true }
}

export async function aprovarDocumento(
  tabela: TabelaDocumento,
  documentoId: string,
  processoId: string
): Promise<ResultadoTramitacao> {
  const supabase = await createClient()
  const usuario = await obterUsuarioComPapel()
  if (!usuario) return { success: false, error: 'Não autenticado.' }

  if (usuario.papel !== 'setor_licitacao' && usuario.papel !== 'admin_organizacao') {
    return { success: false, error: 'Sem permissão para aprovar documentos.' }
  }

  const { data: doc } = await (supabase as any)
    .from(tabela)
    .select('*')
    .eq('id', documentoId)
    .maybeSingle()

  if (!doc) return { success: false, error: 'Documento nao encontrado.' }
  if (doc.status !== 'em_revisao') {
    return { success: false, error: 'Apenas documentos em revisão podem ser aprovados.' }
  }

  const { error } = await (supabase as any)
    .from(tabela)
    .update({ status: 'assinado', updated_at: new Date().toISOString() })
    .eq('id', documentoId)

  if (error) return { success: false, error: error.message }

  await gravarVersao(supabase, tabela, documentoId, usuario.organizacao_id, usuario.id, doc, `Aprovado por ${usuario.nome_completo}`)

  revalidatePath(`/processos/${processoId}`)
  return { success: true }
}

export async function devolverDocumento(
  tabela: TabelaDocumento,
  documentoId: string,
  processoId: string,
  apontamento: string
): Promise<ResultadoTramitacao> {
  const supabase = await createClient()
  const usuario = await obterUsuarioComPapel()
  if (!usuario) return { success: false, error: 'Não autenticado.' }

  if (usuario.papel !== 'setor_licitacao' && usuario.papel !== 'admin_organizacao') {
    return { success: false, error: 'Sem permissão para devolver documentos.' }
  }

  const { data: doc } = await (supabase as any)
    .from(tabela)
    .select('*')
    .eq('id', documentoId)
    .maybeSingle()

  if (!doc) return { success: false, error: 'Documento nao encontrado.' }
  if (doc.status !== 'em_revisao') {
    return { success: false, error: 'Apenas documentos em revisão podem ser devolvidos.' }
  }

  const { error } = await (supabase as any)
    .from(tabela)
    .update({ status: 'devolvido', updated_at: new Date().toISOString() })
    .eq('id', documentoId)

  if (error) return { success: false, error: error.message }

  await gravarVersao(
    supabase,
    tabela,
    documentoId,
    usuario.organizacao_id,
    usuario.id,
    doc,
    `Devolvido por ${usuario.nome_completo}: ${apontamento}`
  )

  // Notifica o criador do documento
  if (doc.criado_por) {
    const nomeTabela: Record<TabelaDocumento, string> = {
      dfd:             'DFD',
      etp:             'ETP',
      termo_referencia:'TR',
      mapa_riscos:     'Mapa de Riscos',
      edital:          'Edital',
    }
    await (supabase as any).from('notificacoes').insert({
      usuario_id: doc.criado_por,
      organizacao_id: usuario.organizacao_id,
      processo_id: processoId,
      titulo: `${nomeTabela[tabela]} devolvido para correção`,
      mensagem: `${usuario.nome_completo} devolveu o documento com o seguinte apontamento: ${apontamento}`,
      lida: false,
      link: `/processos/${processoId}/${tabela === 'termo_referencia' ? 'tr' : tabela === 'mapa_riscos' ? 'riscos' : tabela}`,
    })
  }

  revalidatePath(`/processos/${processoId}`)
  return { success: true }
}
