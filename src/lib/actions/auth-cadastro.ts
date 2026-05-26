'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { z } from 'zod'

interface ResultadoCadastro {
  success:     boolean
  error?:      string
  codigoErro?: 'cnpj_existente' | string
  orgId?:      string
}

// --- SOLICITAR ACESSO (usuario comum) ---

const SchemaCadastroUsuario = z.object({
  email:           z.string().email('E-mail invalido'),
  senha:           z.string().min(8, 'Senha deve ter pelo menos 8 caracteres'),
  nomeCompleto:    z.string().min(3).max(200),
  papelSolicitado: z.enum([
    'requisitante', 'setor_compras', 'setor_licitacao',
    'procurador', 'gestor_publico', 'publicacao',
  ] as const),
  organizacaoId:   z.string().uuid('Organizacao invalida'),
  secretariaId:    z.string().uuid('Secretaria invalida').optional(),
})

export async function cadastrarUsuario(
  input: z.infer<typeof SchemaCadastroUsuario>
): Promise<ResultadoCadastro> {
  const parsed = SchemaCadastroUsuario.safeParse(input)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message }

  const supabase = await createClient()

  const { data: org } = await (supabase as any)
    .from('organizacoes')
    .select('id, ativo')
    .eq('id', parsed.data.organizacaoId)
    .maybeSingle()

  if (!org || !org.ativo) {
    return { success: false, error: 'Prefeitura nao encontrada ou inativa.' }
  }

  const { data: authData, error: authError } = await supabase.auth.signUp({
    email:    parsed.data.email,
    password: parsed.data.senha,
    options:  { emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/aguardando-aprovacao` },
  })
  if (authError || !authData.user) return { success: false, error: authError?.message ?? 'Erro ao criar conta.' }

  const { error: dbError } = await (supabase as any).from('usuarios').insert({
    id:               authData.user.id,
    organizacao_id:   parsed.data.organizacaoId,
    nome_completo:    parsed.data.nomeCompleto,
    papel:            parsed.data.papelSolicitado,
    papel_solicitado: parsed.data.papelSolicitado,
    secretaria_id:    parsed.data.secretariaId ?? null,
    status_aprovacao: 'aguardando_aprovacao',
    ativo:            false,
  })
  if (dbError) {
    console.error('[cadastrarUsuario] insert falhou:', authData.user.id, dbError.message)
    return { success: false, error: 'Erro ao registrar usuario. Tente novamente.' }
  }

  // Notificar admins da org
  const { data: admins } = await (supabase as any)
    .from('usuarios')
    .select('id')
    .eq('organizacao_id', parsed.data.organizacaoId)
    .in('papel', ['admin_organizacao', 'admin_plataforma'])
    .eq('ativo', true)

  if (admins?.length) {
    await (supabase as any).from('notificacoes').insert(
      (admins as { id: string }[]).map(a => ({
        usuario_id:     a.id,
        organizacao_id: parsed.data.organizacaoId,
        titulo:         'Novo usuario aguardando aprovacao',
        mensagem:       `${parsed.data.nomeCompleto} solicitou acesso como ${parsed.data.papelSolicitado}.`,
        lida:           false,
        link:           '/configuracoes/usuarios',
      }))
    )
  }

  return { success: true }
}

// --- CADASTRAR NOVA PREFEITURA (admin_organizacao) ---

const SECRETARIAS_PADRAO = [
  'Gabinete do Prefeito',
  'Secretaria de Administracao',
  'Secretaria de Financas',
  'Secretaria de Obras e Infraestrutura',
  'Secretaria de Saude',
  'Secretaria de Educacao',
  'Procuradoria Juridica',
  'Setor de Licitacoes e Contratos',
] as const

const SchemaCadastroAdminOrg = z.object({
  email:          z.string().email('E-mail invalido'),
  senha:          z.string().min(8, 'Senha deve ter pelo menos 8 caracteres'),
  nomeCompleto:   z.string().min(3).max(200),
  cargo:          z.string().max(200).optional(),
  secretariaNome: z.string().min(2).max(200),
  nomePrefeitura: z.string().min(3).max(300),
  cnpjPrefeitura: z.string().regex(/^\d{14}$/, 'CNPJ deve ter 14 digitos'),
  municipio:      z.string().min(2).max(200),
  estado:         z.string().length(2),
  cep:            z.string().regex(/^\d{8}$/, 'CEP deve ter 8 digitos'),
  logradouro:     z.string().min(2).max(300),
  numero:         z.string().max(20),
  bairro:         z.string().min(2).max(200),
  cor_primaria:   z.string().regex(/^#[0-9a-fA-F]{6}$/).optional(),
})

export async function cadastrarAdminOrg(
  input: z.infer<typeof SchemaCadastroAdminOrg>
): Promise<ResultadoCadastro> {
  const parsed = SchemaCadastroAdminOrg.safeParse(input)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message }

  const supabase = await createServiceClient()

  // Verificar CNPJ duplicado
  const { data: existente } = await (supabase as any)
    .from('organizacoes')
    .select('id')
    .eq('cnpj', parsed.data.cnpjPrefeitura)
    .maybeSingle()

  if (existente) return { success: false, codigoErro: 'cnpj_existente', error: 'Esta prefeitura ja esta cadastrada.' }

  // Criar org
  const { data: novaOrgRaw, error: orgError } = await (supabase as any)
    .from('organizacoes')
    .insert({
      nome:         parsed.data.nomePrefeitura,
      cnpj:         parsed.data.cnpjPrefeitura,
      municipio:    parsed.data.municipio,
      estado:       parsed.data.estado,
      cep:          parsed.data.cep,
      logradouro:   parsed.data.logradouro,
      numero:       parsed.data.numero,
      bairro:       parsed.data.bairro,
      cor_primaria: parsed.data.cor_primaria ?? null,
      ativo:        false,
    })
    .select('id')
    .single()

  const novaOrg = novaOrgRaw as { id: string } | null
  if (orgError || !novaOrg) return { success: false, error: 'Erro ao registrar prefeitura.' }

  const orgId = novaOrg.id

  // Inserir secretarias padrao
  const { data: secretariasInseridas } = await (supabase as any)
    .from('secretarias')
    .insert(
      SECRETARIAS_PADRAO.map(nome => ({
        organizacao_id: orgId,
        nome,
        ativo: true,
      }))
    )
    .select('id, nome')

  // Encontrar secretaria_id correspondente a escolha do admin
  const secs = (secretariasInseridas ?? []) as { id: string; nome: string }[]
  const secEscolhida = secs.find(s => s.nome === parsed.data.secretariaNome)

  // Criar usuario admin (usa createClient para signUp pois service client nao tem auth.signUp)
  const supabaseAuth = await createClient()
  const { data: authData, error: authError } = await supabaseAuth.auth.signUp({
    email:    parsed.data.email,
    password: parsed.data.senha,
    options:  { emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback?next=/aguardando-ativacao` },
  })
  if (authError || !authData.user) return { success: false, error: authError?.message ?? 'Erro ao criar conta.' }

  const { error: dbError } = await (supabase as any).from('usuarios').insert({
    id:               authData.user.id,
    organizacao_id:   orgId,
    nome_completo:    parsed.data.nomeCompleto,
    cargo:            parsed.data.cargo ?? null,
    secretaria_id:    secEscolhida?.id ?? null,
    papel:            'admin_organizacao',
    papel_solicitado: 'admin_organizacao',
    status_aprovacao: 'aguardando_aprovacao',
    ativo:            false,
  })
  if (dbError) {
    console.error('[cadastrarAdminOrg] insert usuario falhou:', authData.user.id, dbError.message)
    return { success: false, error: 'Erro ao registrar administrador.' }
  }

  // Notificar admin_plataforma
  const { data: adminsPlat } = await (supabase as any)
    .from('usuarios')
    .select('id')
    .eq('papel', 'admin_plataforma')
    .eq('ativo', true)

  if (adminsPlat?.length) {
    await (supabase as any).from('notificacoes').insert(
      (adminsPlat as { id: string }[]).map(a => ({
        usuario_id:     a.id,
        organizacao_id: orgId,
        titulo:         'Nova prefeitura aguardando ativacao',
        mensagem:       `${parsed.data.nomePrefeitura} (${parsed.data.municipio}/${parsed.data.estado}) aguarda ativacao.`,
        lida:           false,
        link:           '/admin/organizacoes',
      }))
    )
  }

  return { success: true, orgId }
}
