'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { schemaOrganizacao, type OrganizacaoInput } from '@/lib/validacao/organizacao'
import { schemaConviteUsuario, schemaAlterarPapel, type ConviteUsuarioInput } from '@/lib/validacao/usuario'
import { revalidatePath } from 'next/cache'
import { registrarAuditoria } from '@/lib/audit/log'

type ActionResult<T = undefined> =
  | { success: true; data?: T }
  | { success: false; error: string }

async function getUsuarioAutenticado() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('usuarios')
    .select('*')
    .eq('id', user.id)
    .single()

  const usuario = data as any;
  return usuario
}

export async function atualizarOrganizacao(input: OrganizacaoInput): Promise<ActionResult> {
  const parsed = schemaOrganizacao.safeParse(input)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message }

  const usuario = await getUsuarioAutenticado()
  if (!usuario) return { success: false, error: 'Sessao expirada.' }
  if (!['admin_organizacao', 'admin_plataforma'].includes(usuario.papel)) {
    return { success: false, error: 'Sem permissao para editar a organizacao.' }
  }

  const supabase = await createClient()
  const { error } = await (supabase
    .from('organizacoes') as any)
    .update(parsed.data)
    .eq('id', usuario.organizacao_id)

  if (error) return { success: false, error: 'Erro ao salvar. Tente novamente.' }

  void registrarAuditoria({
    organizacaoId: usuario.organizacao_id,
    usuarioId:     usuario.id,
    nomeUsuario:   usuario.nome_completo ?? 'Admin',
    papelUsuario:  usuario.papel,
    categoria:     'organizacao',
    acao:          'organizacao.atualizada',
  })

  revalidatePath('/configuracoes/organizacao')
  return { success: true }
}

export async function convidarUsuario(input: ConviteUsuarioInput): Promise<ActionResult> {
  const parsed = schemaConviteUsuario.safeParse(input)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message }

  const usuario = await getUsuarioAutenticado()
  if (!usuario) return { success: false, error: 'Sessao expirada.' }
  if (!['admin_organizacao', 'admin_plataforma'].includes(usuario.papel)) {
    return { success: false, error: 'Sem permissao para convidar usuarios.' }
  }

  const serviceClient = await createServiceClient()

  // Cria usuario no Auth do Supabase com senha temporária
  const senhaTemp = Math.random().toString(36).slice(-12) + 'Aa1!'
  const { data: novoAuth, error: authError } = await serviceClient.auth.admin.createUser({
    email: parsed.data.email,
    password: senhaTemp,
    email_confirm: true,
  })

  if (authError) {
    if (authError.message.includes('already')) return { success: false, error: 'E-mail ja cadastrado na plataforma.' }
    return { success: false, error: 'Erro ao criar usuario.' }
  }

  const { error: profileError } = await (serviceClient.from('usuarios') as any).insert({
    id: novoAuth.user.id,
    organizacao_id: usuario.organizacao_id,
    papel: parsed.data.papel,
    nome_completo: parsed.data.nome_completo,
    cargo: parsed.data.cargo ?? null,
  })

  if (profileError) {
    await serviceClient.auth.admin.deleteUser(novoAuth.user.id)
    return { success: false, error: 'Erro ao salvar perfil do usuario.' }
  }

  await (serviceClient.from('creditos_usuario') as any).insert({
    usuario_id: novoAuth.user.id,
    organizacao_id: usuario.organizacao_id,
    saldo: 0,
  })

  // Envia link de redefinição de senha por e-mail
  await serviceClient.auth.admin.generateLink({
    type: 'recovery',
    email: parsed.data.email,
    options: { redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/login` },
  })

  void registrarAuditoria({
    organizacaoId: usuario.organizacao_id,
    usuarioId:     usuario.id,
    nomeUsuario:   usuario.nome_completo ?? 'Admin',
    papelUsuario:  usuario.papel,
    categoria:     'usuario',
    acao:          'usuario.convidado',
    recursoDesc:   parsed.data.email,
    detalhes:      { papel_convidado: parsed.data.papel },
  })

  revalidatePath('/configuracoes/usuarios')
  return { success: true }
}

export async function alterarPapelUsuario(input: { usuario_id: string; papel: string }): Promise<ActionResult> {
  const parsed = schemaAlterarPapel.safeParse(input)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message }

  const usuario = await getUsuarioAutenticado()
  if (!usuario) return { success: false, error: 'Sessao expirada.' }
  if (!['admin_organizacao', 'admin_plataforma'].includes(usuario.papel)) {
    return { success: false, error: 'Sem permissao.' }
  }
  if (parsed.data.usuario_id === usuario.id) {
    return { success: false, error: 'Voce nao pode alterar seu proprio papel.' }
  }

  const supabase = await createClient()
  const { error } = await (supabase
    .from('usuarios') as any)
    .update({ papel: parsed.data.papel })
    .eq('id', parsed.data.usuario_id)
    .eq('organizacao_id', usuario.organizacao_id)

  if (error) return { success: false, error: 'Erro ao alterar papel.' }

  void registrarAuditoria({
    organizacaoId: usuario.organizacao_id,
    usuarioId:     usuario.id,
    nomeUsuario:   usuario.nome_completo ?? 'Admin',
    papelUsuario:  usuario.papel,
    categoria:     'usuario',
    acao:          'usuario.papel_alterado',
    recursoId:     parsed.data.usuario_id,
    detalhes:      { novo_papel: parsed.data.papel },
  })

  revalidatePath('/configuracoes/usuarios')
  return { success: true }
}

export async function desativarUsuario(usuarioId: string): Promise<ActionResult> {
  const usuario = await getUsuarioAutenticado()
  if (!usuario) return { success: false, error: 'Sessao expirada.' }
  if (!['admin_organizacao', 'admin_plataforma'].includes(usuario.papel)) {
    return { success: false, error: 'Sem permissao.' }
  }
  if (usuarioId === usuario.id) return { success: false, error: 'Voce nao pode desativar sua propria conta.' }

  const supabase = await createClient()
  const { error } = await (supabase
    .from('usuarios') as any)
    .update({ ativo: false })
    .eq('id', usuarioId)
    .eq('organizacao_id', usuario.organizacao_id)

  if (error) return { success: false, error: 'Erro ao desativar usuario.' }

  void registrarAuditoria({
    organizacaoId: usuario.organizacao_id,
    usuarioId:     usuario.id,
    nomeUsuario:   usuario.nome_completo ?? 'Admin',
    papelUsuario:  usuario.papel,
    categoria:     'usuario',
    acao:          'usuario.suspenso',
    recursoId:     usuarioId,
  })

  revalidatePath('/configuracoes/usuarios')
  return { success: true }
}

export async function salvarConfigIA(provedor: string): Promise<ActionResult> {
  const provedoresValidos = ['gemini', 'groq', 'anthropic', 'openrouter']
  if (!provedoresValidos.includes(provedor)) {
    return { success: false, error: 'Provedor invalido.' }
  }

  const usuario = await getUsuarioAutenticado()
  if (!usuario) return { success: false, error: 'Sessao expirada.' }
  if (!['admin_organizacao', 'admin_plataforma'].includes(usuario.papel)) {
    return { success: false, error: 'Sem permissao para configurar IA.' }
  }

  const supabase = await createClient()
  const { error } = await (supabase.from('organizacoes') as any)
    .update({ ia_config: { provider: provedor } })
    .eq('id', usuario.organizacao_id)

  if (error) return { success: false, error: 'Erro ao salvar configuracao.' }

  revalidatePath('/configuracoes/ia')
  return { success: true }
}
