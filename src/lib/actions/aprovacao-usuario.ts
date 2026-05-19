'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { PapelUsuario } from '@/types/database'

interface ResultadoAprovacao {
  success: boolean
  error?: string
}

async function verificarAdminOrg() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: adminRaw } = await supabase
    .from('usuarios')
    .select('id, papel, organizacao_id')
    .eq('id', user.id)
    .maybeSingle()

  const admin = adminRaw as { id: string; papel: PapelUsuario; organizacao_id: string } | null
  if (!admin || !['admin_organizacao', 'admin_plataforma'].includes(admin.papel)) return null
  return admin
}

/** Aprova um usuario pendente, ativando o acesso na organizacao. */
export async function aprovarUsuario(usuarioId: string): Promise<ResultadoAprovacao> {
  const supabase = await createClient()
  const admin = await verificarAdminOrg()
  if (!admin) return { success: false, error: 'Sem permissao.' }

  const { data: usuarioRaw } = await supabase
    .from('usuarios')
    .select('id, organizacao_id, papel_solicitado, nome_completo')
    .eq('id', usuarioId)
    .maybeSingle()

  const usuario = usuarioRaw as {
    id: string
    organizacao_id: string
    papel_solicitado: PapelUsuario | null
    nome_completo: string
  } | null

  if (!usuario) return { success: false, error: 'Usuario nao encontrado.' }
  if (usuario.organizacao_id !== admin.organizacao_id && admin.papel !== 'admin_plataforma') {
    return { success: false, error: 'Sem permissao para este usuario.' }
  }

  const papelAtribuido: PapelUsuario = usuario.papel_solicitado ?? 'requisitante'

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('usuarios')
    .update({
      status_aprovacao: 'ativo',
      ativo: true,
      papel: papelAtribuido,
    })
    .eq('id', usuarioId)

  if (error) return { success: false, error: (error as { message: string }).message }

  // Notifica o usuario aprovado
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  await (supabase as any).from('notificacoes').insert({
    usuario_id: usuarioId,
    organizacao_id: usuario.organizacao_id,
    titulo: 'Seu acesso foi aprovado!',
    mensagem: 'Voce ja pode acessar a plataforma LicitaIA.',
    lida: false,
    link: '/dashboard',
  })

  revalidatePath('/configuracoes/usuarios')
  return { success: true }
}

/** Recusa um usuario pendente, bloqueando o acesso. */
export async function recusarUsuario(usuarioId: string, motivo: string): Promise<ResultadoAprovacao> {
  if (!motivo.trim()) return { success: false, error: 'Motivo obrigatorio.' }

  const supabase = await createClient()
  const admin = await verificarAdminOrg()
  if (!admin) return { success: false, error: 'Sem permissao.' }

  const { data: usuarioRaw } = await supabase
    .from('usuarios')
    .select('id, organizacao_id')
    .eq('id', usuarioId)
    .maybeSingle()

  const usuario = usuarioRaw as { id: string; organizacao_id: string } | null

  if (!usuario) return { success: false, error: 'Usuario nao encontrado.' }
  if (usuario.organizacao_id !== admin.organizacao_id && admin.papel !== 'admin_plataforma') {
    return { success: false, error: 'Sem permissao para este usuario.' }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error } = await (supabase as any)
    .from('usuarios')
    .update({ status_aprovacao: 'recusado', ativo: false })
    .eq('id', usuarioId)

  if (error) return { success: false, error: (error as { message: string }).message }

  revalidatePath('/configuracoes/usuarios')
  return { success: true }
}

/** Lista usuarios pendentes de aprovacao na organizacao do admin logado. */
export async function listarUsuariosPendentes(): Promise<{
  data: Array<{
    id: string
    nome_completo: string
    papel_solicitado: PapelUsuario | null
    created_at: string
  }> | null
  error: string | null
}> {
  const supabase = await createClient()
  const admin = await verificarAdminOrg()
  if (!admin) return { data: null, error: 'Sem permissao.' }

  // Admin de plataforma ve todos; Admin de org ve apenas sua org
  const baseQuery = supabase
    .from('usuarios')
    .select('id, nome_completo, papel_solicitado, created_at')
    .eq('status_aprovacao', 'aguardando_aprovacao')
    .order('created_at', { ascending: true })

  const { data, error } = admin.papel === 'admin_plataforma'
    ? await baseQuery
    : await baseQuery.eq('organizacao_id', admin.organizacao_id)

  if (error) return { data: null, error: error.message }

  return {
    data: (data ?? []) as Array<{
      id: string
      nome_completo: string
      papel_solicitado: PapelUsuario | null
      created_at: string
    }>,
    error: null,
  }
}
