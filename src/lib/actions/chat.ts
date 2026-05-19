'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

interface ResultadoChat {
  success: boolean
  error?: string
}

async function obterUsuarioChat() {
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

export async function enviarMensagemProcesso(
  processoId: string,
  conteudo: string
): Promise<ResultadoChat> {
  if (!conteudo.trim()) return { success: false, error: 'Mensagem nao pode ser vazia.' }
  const supabase = await createClient()
  const usuario = await obterUsuarioChat()
  if (!usuario) return { success: false, error: 'Nao autenticado.' }

  const { error } = await (supabase as any).from('mensagens_processo').insert({
    processo_id: processoId,
    organizacao_id: usuario.organizacao_id,
    usuario_id: usuario.id,
    nome_usuario: usuario.nome_completo,
    papel_usuario: usuario.papel,
    conteudo: conteudo.trim(),
  })

  if (error) return { success: false, error: error.message }
  revalidatePath(`/processos/${processoId}`)
  return { success: true }
}

export async function buscarMensagensProcesso(processoId: string) {
  const supabase = await createClient()
  const { data, error } = await (supabase as any)
    .from('mensagens_processo')
    .select('*')
    .eq('processo_id', processoId)
    .order('created_at', { ascending: true })
    .limit(200)
  if (error) return { data: null, error: error.message }
  return { data, error: null }
}

export async function enviarMensagemSetor(
  conteudo: string
): Promise<ResultadoChat> {
  if (!conteudo.trim()) return { success: false, error: 'Mensagem nao pode ser vazia.' }
  const supabase = await createClient()
  const usuario = await obterUsuarioChat()
  if (!usuario) return { success: false, error: 'Nao autenticado.' }

  const { error } = await (supabase as any).from('mensagens_setor').insert({
    organizacao_id: usuario.organizacao_id,
    setor: usuario.papel,
    usuario_id: usuario.id,
    nome_usuario: usuario.nome_completo,
    conteudo: conteudo.trim(),
  })

  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function buscarMensagensSetor() {
  const supabase = await createClient()
  const usuario = await obterUsuarioChat()
  if (!usuario) return { data: null, error: 'Nao autenticado.' }

  const { data, error } = await (supabase as any)
    .from('mensagens_setor')
    .select('*')
    .eq('organizacao_id', usuario.organizacao_id)
    .eq('setor', usuario.papel)
    .order('created_at', { ascending: true })
    .limit(200)
  if (error) return { data: null, error: error.message }
  return { data, error: null }
}

export async function enviarMensagemDireta(
  paraUsuarioId: string,
  conteudo: string
): Promise<ResultadoChat> {
  if (!conteudo.trim()) return { success: false, error: 'Mensagem nao pode ser vazia.' }
  const supabase = await createClient()
  const usuario = await obterUsuarioChat()
  if (!usuario) return { success: false, error: 'Nao autenticado.' }
  if (paraUsuarioId === usuario.id) return { success: false, error: 'Nao pode enviar mensagem para si mesmo.' }

  const { error } = await (supabase as any).from('mensagens_diretas').insert({
    organizacao_id: usuario.organizacao_id,
    de_usuario_id: usuario.id,
    para_usuario_id: paraUsuarioId,
    nome_remetente: usuario.nome_completo,
    conteudo: conteudo.trim(),
  })

  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function buscarMensagensDiretas(paraUsuarioId: string) {
  const supabase = await createClient()
  const usuario = await obterUsuarioChat()
  if (!usuario) return { data: null, error: 'Nao autenticado.' }

  const { data, error } = await (supabase as any)
    .from('mensagens_diretas')
    .select('*')
    .eq('organizacao_id', usuario.organizacao_id)
    .or(`and(de_usuario_id.eq.${usuario.id},para_usuario_id.eq.${paraUsuarioId}),and(de_usuario_id.eq.${paraUsuarioId},para_usuario_id.eq.${usuario.id})`)
    .order('created_at', { ascending: true })
    .limit(200)
  if (error) return { data: null, error: error.message }
  return { data, error: null }
}

export async function buscarUsuariosDaOrg() {
  const supabase = await createClient()
  const usuario = await obterUsuarioChat()
  if (!usuario) return { data: null, error: 'Nao autenticado.' }

  const { data, error } = await supabase
    .from('usuarios')
    .select('id, nome_completo, papel, cargo')
    .eq('organizacao_id', usuario.organizacao_id)
    .eq('ativo', true)
    .neq('id', usuario.id)
    .order('nome_completo')

  if (error) return { data: null, error: error.message }
  return { data, error: null }
}

export async function contarNaoLidas(processoId?: string) {
  const supabase = await createClient()
  const usuario = await obterUsuarioChat()
  if (!usuario) return { processo: 0, setor: 0, direto: 0 }

  const { count: direto } = await (supabase as any)
    .from('mensagens_diretas')
    .select('*', { count: 'exact', head: true })
    .eq('para_usuario_id', usuario.id)
    .eq('lida', false)

  return {
    processo: 0,
    setor: 0,
    direto: direto ?? 0,
  }
}
