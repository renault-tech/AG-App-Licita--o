'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export interface Notificacao {
  id: string
  created_at: string
  titulo: string
  mensagem: string
  lida: boolean
  link: string | null
  processo_id: string | null
}

export async function obterNotificacoes(): Promise<{ notificacoes: Notificacao[]; naoLidas: number }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { notificacoes: [], naoLidas: 0 }

  const { data } = await (supabase as any)
    .from('notificacoes')
    .select('id, created_at, titulo, mensagem, lida, link, processo_id')
    .eq('usuario_id', user.id)
    .order('created_at', { ascending: false })
    .limit(30)

  const notificacoes: Notificacao[] = data ?? []
  const naoLidas = notificacoes.filter(n => !n.lida).length

  return { notificacoes, naoLidas }
}

export async function marcarComoLida(notificacaoId: string): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await (supabase as any)
    .from('notificacoes')
    .update({ lida: true })
    .eq('id', notificacaoId)
    .eq('usuario_id', user.id)

  revalidatePath('/', 'layout')
}

export async function marcarTodasComoLidas(): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await (supabase as any)
    .from('notificacoes')
    .update({ lida: true })
    .eq('usuario_id', user.id)
    .eq('lida', false)

  revalidatePath('/', 'layout')
}

export async function obterTodasNotificacoes(filtro?: 'nao_lidas'): Promise<{ notificacoes: Notificacao[]; naoLidas: number }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { notificacoes: [], naoLidas: 0 }

  let query = (supabase as any)
    .from('notificacoes')
    .select('id, created_at, titulo, mensagem, lida, link, processo_id')
    .eq('usuario_id', user.id)
    .order('created_at', { ascending: false })

  if (filtro === 'nao_lidas') {
    query = query.eq('lida', false)
  }

  const { data } = await query
  const notificacoes: Notificacao[] = data ?? []
  const naoLidas = notificacoes.filter(n => !n.lida).length

  return { notificacoes, naoLidas }
}
