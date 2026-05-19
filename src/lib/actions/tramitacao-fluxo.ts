'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { PapelUsuario } from '@/types/database'

interface ResultadoFluxo {
  success: boolean
  error?: string
}

// Mapa: de qual papel pode avançar para qual proximo papel
const PROXIMO_PAPEL: Partial<Record<PapelUsuario, PapelUsuario>> = {
  requisitante:    'setor_compras',
  setor_compras:   'setor_licitacao',
  setor_licitacao: 'procurador',
  procurador:      'gestor_publico',
  gestor_publico:  'publicacao',
}

// Mapa: de qual papel pode devolver e para quais papeis anteriores
const DEVOLUCOES_PERMITIDAS: Partial<Record<PapelUsuario, PapelUsuario[]>> = {
  setor_compras:   ['requisitante'],
  setor_licitacao: ['requisitante', 'setor_compras'],
  procurador:      ['setor_licitacao'],
  gestor_publico:  ['setor_licitacao'],
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
  return usuario as { id: string; papel: PapelUsuario; organizacao_id: string; nome_completo: string } | null
}

async function registrarHistorico(
  supabase: Awaited<ReturnType<typeof createClient>>,
  processoId: string,
  organizacaoId: string,
  usuarioId: string,
  nomeUsuario: string,
  dePapel: PapelUsuario,
  paraPapel: PapelUsuario,
  tipo: 'avanco' | 'devolucao',
  motivo: string | null,
  pendencias: string[] | null
) {
  await (supabase as any).from('tramitacao_historico').insert({
    processo_id: processoId,
    organizacao_id: organizacaoId,
    usuario_id: usuarioId,
    nome_usuario: nomeUsuario,
    de_papel: dePapel,
    para_papel: paraPapel,
    tipo,
    motivo,
    pendencias,
  })
}

/**
 * Avanca o processo para a proxima fase no fluxo canonico.
 * O papel do usuario logado determina qual e a proxima fase.
 */
export async function avancarFase(
  processoId: string,
  pendencias: string[] = []
): Promise<ResultadoFluxo> {
  const supabase = await createClient()
  const usuario = await obterUsuarioComPapel()
  if (!usuario) return { success: false, error: 'Nao autenticado.' }

  const proximoPapel = PROXIMO_PAPEL[usuario.papel]
  if (!proximoPapel) {
    return { success: false, error: 'Este papel nao pode avancar o processo.' }
  }

  const { data: processo } = await (supabase as any)
    .from('processos_licitatorios')
    .select('id, fase_atual, organizacao_id, numero_processo, objeto')
    .eq('id', processoId)
    .maybeSingle()

  if (!processo) return { success: false, error: 'Processo nao encontrado.' }
  if (processo.organizacao_id !== usuario.organizacao_id) {
    return { success: false, error: 'Sem permissao para este processo.' }
  }

  const { error } = await (supabase as any)
    .from('processos_licitatorios')
    .update({ fase_atual: proximoPapel, updated_at: new Date().toISOString() })
    .eq('id', processoId)

  if (error) return { success: false, error: error.message }

  await registrarHistorico(
    supabase,
    processoId,
    usuario.organizacao_id,
    usuario.id,
    usuario.nome_completo,
    usuario.papel,
    proximoPapel,
    'avanco',
    null,
    pendencias.length > 0 ? pendencias : null
  )

  // Notifica usuarios do proximo papel
  const { data: destinatarios } = await supabase
    .from('usuarios')
    .select('id')
    .eq('organizacao_id', usuario.organizacao_id)
    .eq('papel', proximoPapel)
    .eq('ativo', true)

  const identificador = processo.objeto ?? processo.numero_processo ?? 'processo'

  if (destinatarios && destinatarios.length > 0) {
    const notificacoes = destinatarios.map((u: { id: string }) => ({
      usuario_id: u.id,
      organizacao_id: usuario.organizacao_id,
      processo_id: processoId,
      titulo: 'Processo encaminhado para seu setor',
      mensagem: `${usuario.nome_completo} encaminhou "${identificador}" para seu setor.`,
      lida: false,
      link: `/processos/${processoId}`,
    }))
    await (supabase as any).from('notificacoes').insert(notificacoes)
  }

  revalidatePath(`/processos/${processoId}`)
  return { success: true }
}

/**
 * Devolve o processo para uma fase anterior.
 * O motivo e obrigatorio. O para_papel deve estar na lista de devolucoes permitidas
 * para o papel do usuario logado.
 */
export async function devolverFase(
  processoId: string,
  paraPapel: PapelUsuario,
  motivo: string
): Promise<ResultadoFluxo> {
  if (!motivo || motivo.trim().length < 10) {
    return { success: false, error: 'O motivo da devolucao deve ter pelo menos 10 caracteres.' }
  }

  const supabase = await createClient()
  const usuario = await obterUsuarioComPapel()
  if (!usuario) return { success: false, error: 'Nao autenticado.' }

  const devolucoesPermitidas = DEVOLUCOES_PERMITIDAS[usuario.papel]
  if (!devolucoesPermitidas || !devolucoesPermitidas.includes(paraPapel)) {
    return { success: false, error: `O papel ${usuario.papel} nao pode devolver para ${paraPapel}.` }
  }

  const { data: processo } = await (supabase as any)
    .from('processos_licitatorios')
    .select('id, fase_atual, organizacao_id, numero_processo, objeto')
    .eq('id', processoId)
    .maybeSingle()

  if (!processo) return { success: false, error: 'Processo nao encontrado.' }
  if (processo.organizacao_id !== usuario.organizacao_id) {
    return { success: false, error: 'Sem permissao para este processo.' }
  }

  const { error } = await (supabase as any)
    .from('processos_licitatorios')
    .update({ fase_atual: paraPapel, updated_at: new Date().toISOString() })
    .eq('id', processoId)

  if (error) return { success: false, error: error.message }

  await registrarHistorico(
    supabase,
    processoId,
    usuario.organizacao_id,
    usuario.id,
    usuario.nome_completo,
    usuario.papel,
    paraPapel,
    'devolucao',
    motivo,
    null
  )

  // Notifica usuarios do papel destino
  const { data: destinatarios } = await supabase
    .from('usuarios')
    .select('id')
    .eq('organizacao_id', usuario.organizacao_id)
    .eq('papel', paraPapel)
    .eq('ativo', true)

  const identificador = processo.objeto ?? processo.numero_processo ?? 'processo'

  if (destinatarios && destinatarios.length > 0) {
    const notificacoes = destinatarios.map((u: { id: string }) => ({
      usuario_id: u.id,
      organizacao_id: usuario.organizacao_id,
      processo_id: processoId,
      titulo: 'Processo devolvido para correcao',
      mensagem: `${usuario.nome_completo} devolveu "${identificador}". Motivo: ${motivo}`,
      lida: false,
      link: `/processos/${processoId}`,
    }))
    await (supabase as any).from('notificacoes').insert(notificacoes)
  }

  revalidatePath(`/processos/${processoId}`)
  return { success: true }
}

/**
 * Retorna o historico completo de tramitacao de um processo.
 * Usado para alimentar a linha do tempo.
 */
export async function buscarHistoricoTramitacao(processoId: string) {
  const supabase = await createClient()
  const { data, error } = await (supabase as any)
    .from('tramitacao_historico')
    .select('*')
    .eq('processo_id', processoId)
    .order('created_at', { ascending: true })

  if (error) return { data: null, error: error.message }
  return { data, error: null }
}

/**
 * Retorna todos os processos atualmente em determinada fase,
 * para exibicao no painel "processos neste setor" (clique no setor da timeline).
 */
export async function buscarProcessosPorFase(
  fase: PapelUsuario,
  organizacaoId: string
) {
  const supabase = await createClient()
  const { data, error } = await (supabase as any)
    .from('processos_licitatorios')
    .select('id, numero_processo, objeto, modalidade, updated_at, fase_atual')
    .eq('organizacao_id', organizacaoId)
    .eq('fase_atual', fase)
    .order('updated_at', { ascending: false })

  if (error) return { data: null, error: error.message }
  return { data, error: null }
}
