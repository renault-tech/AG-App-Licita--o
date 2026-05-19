'use server'

import { createClient } from '@/lib/supabase/server'
import { z } from 'zod'
import type { PapelUsuario } from '@/types/database'

interface ResultadoCadastro {
  success: boolean
  error?: string
}

const SchemaCadastroUsuario = z.object({
  email: z.string().email('E-mail invalido'),
  senha: z.string().min(8, 'Senha deve ter pelo menos 8 caracteres'),
  nomeCompleto: z.string().min(3, 'Nome deve ter pelo menos 3 caracteres').max(200),
  papelSolicitado: z.enum([
    'requisitante', 'setor_compras', 'setor_licitacao', 'procurador',
    'gestor_publico', 'publicacao', 'admin_organizacao',
  ] as const),
  organizacaoId: z.string().uuid('Organizacao invalida'),
})

export async function cadastrarUsuario(
  input: z.infer<typeof SchemaCadastroUsuario>
): Promise<ResultadoCadastro> {
  const parsed = SchemaCadastroUsuario.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message }
  }

  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: orgRaw } = await (supabase as any)
    .from('organizacoes')
    .select('id, ativo')
    .eq('id', parsed.data.organizacaoId)
    .maybeSingle()
  const org = orgRaw as { id: string; ativo: boolean } | null

  if (!org || !org.ativo) {
    return { success: false, error: 'Prefeitura nao encontrada ou inativa.' }
  }

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.senha,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/aguardando-aprovacao`,
    },
  })

  if (authError || !authData.user) {
    return { success: false, error: authError?.message ?? 'Erro ao criar conta.' }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: dbError } = await (supabase as any).from('usuarios').insert({
    id: authData.user.id,
    organizacao_id: parsed.data.organizacaoId,
    nome_completo: parsed.data.nomeCompleto,
    papel: parsed.data.papelSolicitado,
    papel_solicitado: parsed.data.papelSolicitado,
    status_aprovacao: 'aguardando_aprovacao',
    ativo: false,
  })

  if (dbError) {
    console.error('[cadastrarUsuario] Auth user criado mas insert na tabela falhou:', authData.user.id, dbError.message)
    return { success: false, error: 'Erro ao registrar usuario. Tente novamente.' }
  }

  const { data: admins } = await supabase
    .from('usuarios')
    .select('id')
    .eq('organizacao_id', parsed.data.organizacaoId)
    .eq('papel', 'admin_organizacao')
    .eq('ativo', true)

  if (admins && admins.length > 0) {
    const notifs = admins.map((a: { id: string }) => ({
      usuario_id: a.id,
      organizacao_id: parsed.data.organizacaoId,
      titulo: 'Novo usuario aguardando aprovacao',
      mensagem: `${parsed.data.nomeCompleto} solicitou acesso como ${parsed.data.papelSolicitado}.`,
      lida: false,
      link: '/configuracoes/usuarios',
    }))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('notificacoes').insert(notifs)
  }

  return { success: true }
}

const SchemaCadastroAdminOrg = z.object({
  email: z.string().email('E-mail invalido'),
  senha: z.string().min(8, 'Senha deve ter pelo menos 8 caracteres'),
  nomeCompleto: z.string().min(3).max(200),
  cargo: z.string().max(200).optional(),
  nomePrefeitura: z.string().min(3).max(300),
  cnpjPrefeitura: z.string().regex(/^\d{14}$/, 'CNPJ deve ter 14 digitos'),
  municipio: z.string().min(2).max(200),
  estado: z.string().length(2, 'Sigla do estado deve ter 2 caracteres'),
})

export async function cadastrarAdminOrg(
  input: z.infer<typeof SchemaCadastroAdminOrg>
): Promise<ResultadoCadastro> {
  const parsed = SchemaCadastroAdminOrg.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message }
  }

  const supabase = await createClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: orgExistenteRaw } = await (supabase as any)
    .from('organizacoes')
    .select('id')
    .eq('cnpj', parsed.data.cnpjPrefeitura)
    .maybeSingle()
  const orgExistente = orgExistenteRaw as { id: string } | null

  if (orgExistente) {
    return { success: false, error: 'Ja existe uma prefeitura cadastrada com este CNPJ. Entre em contato com o suporte.' }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data: novaOrgRaw, error: orgError } = await (supabase as any)
    .from('organizacoes')
    .insert({
      nome: parsed.data.nomePrefeitura,
      cnpj: parsed.data.cnpjPrefeitura,
      municipio: parsed.data.municipio,
      estado: parsed.data.estado,
      ativo: false,
    })
    .select('id')
    .single()
  const novaOrg = novaOrgRaw as { id: string } | null

  if (orgError || !novaOrg) {
    return { success: false, error: 'Erro ao registrar prefeitura.' }
  }

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.senha,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/aguardando-ativacao`,
    },
  })

  if (authError || !authData.user) {
    return { success: false, error: authError?.message ?? 'Erro ao criar conta.' }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { error: dbError } = await (supabase as any).from('usuarios').insert({
    id: authData.user.id,
    organizacao_id: novaOrg.id,
    nome_completo: parsed.data.nomeCompleto,
    cargo: parsed.data.cargo ?? null,
    papel: 'admin_organizacao',
    papel_solicitado: 'admin_organizacao',
    status_aprovacao: 'aguardando_aprovacao',
    ativo: false,
  })

  if (dbError) {
    console.error('[cadastrarAdminOrg] Auth user criado mas insert na tabela falhou:', authData.user.id, dbError.message)
    return { success: false, error: 'Erro ao registrar administrador.' }
  }

  const { data: adminsPlataforma } = await supabase
    .from('usuarios')
    .select('id')
    .eq('papel', 'admin_plataforma')
    .eq('ativo', true)

  if (adminsPlataforma && adminsPlataforma.length > 0) {
    const notifs = adminsPlataforma.map((a: { id: string }) => ({
      usuario_id: a.id,
      organizacao_id: novaOrg.id,
      titulo: 'Nova prefeitura aguardando ativacao',
      mensagem: `${parsed.data.nomePrefeitura} (${parsed.data.municipio}/${parsed.data.estado}) aguarda ativacao.`,
      lida: false,
      link: '/admin/organizacoes',
    }))
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await (supabase as any).from('notificacoes').insert(notifs)
  }

  return { success: true }
}
