'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export type StatusAutorizacao = 'pendente' | 'autorizado' | 'devolvido'

export interface AutorizacaoRow {
  id: string
  processo_id: string
  status: StatusAutorizacao
  observacao: string | null
  autorizado_em: string | null
  autorizado_por: string | null
}

interface ResultadoAutorizacao {
  success: boolean
  error?: string
}

async function obterUsuarioAutoridade() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('id, papel, organizacao_id, nome_completo')
    .eq('id', user.id)
    .maybeSingle()

  const u = usuario as { id: string; papel: string; organizacao_id: string; nome_completo: string } | null
  if (!u) return null
  if (u.papel !== 'gestor_publico' && u.papel !== 'admin_organizacao' && u.papel !== 'admin_plataforma') return null
  return u
}

export async function obterAutorizacao(processoId: string): Promise<AutorizacaoRow | null> {
  const supabase = await createClient()

  const { data } = await (supabase as any)
    .from('autorizacoes')
    .select('id, processo_id, status, observacao, autorizado_em, autorizado_por')
    .eq('processo_id', processoId)
    .maybeSingle()

  return data as AutorizacaoRow | null
}

export async function autorizarProcesso(
  processoId: string,
  observacao: string
): Promise<ResultadoAutorizacao> {
  const supabase = await createClient()
  const usuario = await obterUsuarioAutoridade()
  if (!usuario) return { success: false, error: 'Sem permissao para autorizar processos.' }

  // Valida que ha parecer favoravel
  const { data: parecer } = await (supabase as any)
    .from('pareceres')
    .select('status')
    .eq('processo_id', processoId)
    .maybeSingle()

  if (!parecer || (parecer.status !== 'aprovado' && parecer.status !== 'aprovado_com_ressalvas')) {
    return { success: false, error: 'O processo precisa de parecer juridico favoravel antes da autorizacao.' }
  }

  // Upsert da autorizacao
  const agora = new Date().toISOString()
  const { error } = await (supabase as any)
    .from('autorizacoes')
    .upsert({
      processo_id:    processoId,
      organizacao_id: usuario.organizacao_id,
      autorizado_por: usuario.id,
      status:         'autorizado',
      observacao:     observacao || null,
      autorizado_em:  agora,
      updated_at:     agora,
    }, { onConflict: 'processo_id' })

  if (error) return { success: false, error: error.message }

  // Atualiza status do processo para 'publicado' (pronto para publicacao)
  await (supabase as any)
    .from('processos_licitatorios')
    .update({ status: 'publicado', updated_at: agora })
    .eq('id', processoId)

  // Notifica setor de licitacoes
  const { data: analistas } = await supabase
    .from('usuarios')
    .select('id')
    .eq('organizacao_id', usuario.organizacao_id)
    .eq('papel', 'setor_licitacao')
    .eq('ativo', true)

  if (analistas && analistas.length > 0) {
    const notifs = analistas.map((a: { id: string }) => ({
      usuario_id:    a.id,
      organizacao_id: usuario.organizacao_id,
      processo_id:   processoId,
      titulo:        'Processo autorizado pela autoridade competente',
      mensagem:      `${usuario.nome_completo} autorizou o processo. Ele esta apto para publicacao.`,
      lida:          false,
      link:          `/processos/${processoId}/autorizacao`,
    }))
    await (supabase as any).from('notificacoes').insert(notifs)
  }

  revalidatePath(`/processos/${processoId}`)
  return { success: true }
}

export async function devolverParaCorrecao(
  processoId: string,
  observacao: string
): Promise<ResultadoAutorizacao> {
  const supabase = await createClient()
  const usuario = await obterUsuarioAutoridade()
  if (!usuario) return { success: false, error: 'Sem permissao para devolver processos.' }

  if (!observacao.trim()) return { success: false, error: 'Informe o motivo da devolucao.' }

  const agora = new Date().toISOString()
  const { error } = await (supabase as any)
    .from('autorizacoes')
    .upsert({
      processo_id:    processoId,
      organizacao_id: usuario.organizacao_id,
      autorizado_por: usuario.id,
      status:         'devolvido',
      observacao:     observacao.trim(),
      autorizado_em:  null,
      updated_at:     agora,
    }, { onConflict: 'processo_id' })

  if (error) return { success: false, error: error.message }

  // Reverte status do processo para em_revisao
  await (supabase as any)
    .from('processos_licitatorios')
    .update({ status: 'em_revisao', updated_at: agora })
    .eq('id', processoId)

  // Notifica setor de licitacoes
  const { data: analistas } = await supabase
    .from('usuarios')
    .select('id')
    .eq('organizacao_id', usuario.organizacao_id)
    .eq('papel', 'setor_licitacao')
    .eq('ativo', true)

  if (analistas && analistas.length > 0) {
    const notifs = analistas.map((a: { id: string }) => ({
      usuario_id:    a.id,
      organizacao_id: usuario.organizacao_id,
      processo_id:   processoId,
      titulo:        'Processo devolvido pela autoridade competente',
      mensagem:      `${usuario.nome_completo} devolveu o processo para correcao: ${observacao.trim()}`,
      lida:          false,
      link:          `/processos/${processoId}/revisao`,
    }))
    await (supabase as any).from('notificacoes').insert(notifs)
  }

  revalidatePath(`/processos/${processoId}`)
  return { success: true }
}
