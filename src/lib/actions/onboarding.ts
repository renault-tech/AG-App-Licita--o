'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { schemaOnboarding, type OnboardingInput } from '@/lib/validacao/organizacao'
import { redirect } from 'next/navigation'

export async function criarOrganizacaoEAdmin(
  input: OnboardingInput
): Promise<{ success: boolean; error?: string }> {
  const parsed = schemaOnboarding.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Sessao expirada. Faca login novamente.' }

  // Verifica se já tem organização
  const { data: usuarioExistente } = await supabase
    .from('usuarios')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  if (usuarioExistente) return { success: false, error: 'Voce ja possui uma organizacao configurada.' }

  const serviceClient = await createServiceClient()
  const { nome, cnpj, municipio, estado, cabecalho_institucional, rodape_institucional, nome_completo, cargo } = parsed.data

  // Cria organização
  const { data: org, error: orgError } = await (serviceClient
    .from('organizacoes') as any)
    .insert({ nome, cnpj, municipio, estado, cabecalho_institucional, rodape_institucional })
    .select('*')
    .single()

  if (orgError) {
    if (orgError.code === '23505') return { success: false, error: 'CNPJ ja cadastrado na plataforma.' }
    return { success: false, error: `Erro no Supabase: ${orgError.message}` }
  }

  // Cria registro de usuário como admin_organizacao
  const { error: usuarioError } = await (serviceClient
    .from('usuarios') as any)
    .insert({
      id: user.id,
      organizacao_id: org.id,
      papel: 'admin_organizacao',
      nome_completo,
      cargo: cargo ?? null,
    })

  if (usuarioError) {
    // Rollback manual: remove org criada
    await (serviceClient.from('organizacoes') as any).delete().eq('id', org.id)
    return { success: false, error: `Erro ao configurar usuario: ${usuarioError.message}` }
  }

  // Cria saldo inicial de créditos (100 créditos de boas-vindas)
  await (serviceClient.from('creditos_usuario') as any).insert({
    usuario_id: user.id,
    organizacao_id: org.id,
    saldo: 100,
  })

  return { success: true }
}
