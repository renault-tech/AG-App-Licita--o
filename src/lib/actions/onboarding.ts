'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { schemaOnboarding, type OnboardingInput } from '@/lib/validacao/organizacao'
import { revalidatePath } from 'next/cache'

function resolverPapel(email: string): 'admin_plataforma' | 'admin_organizacao' {
  const adminEmail = process.env.ADMIN_PLATFORM_EMAIL
  if (adminEmail && email.toLowerCase() === adminEmail.toLowerCase()) {
    return 'admin_plataforma'
  }
  return 'admin_organizacao'
}

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

  const papel = resolverPapel(user.email ?? '')
  const serviceClient = await createServiceClient()
  const { nome, cnpj, municipio, estado, cabecalho_institucional, rodape_institucional, nome_completo, cargo } = parsed.data

  // Cria organização
  const { data: org, error: orgError } = await (serviceClient
    .from('organizacoes') as any)
    .insert({ nome, cnpj, municipio, estado, cabecalho_institucional, rodape_institucional })
    .select('*')
    .single()

  if (orgError) {
    if (orgError.code === '23505') {
      // Org ja existe: verificar se tem admin. Se nao tiver, vincular o usuario atual.
      const { data: orgExistente } = await (serviceClient.from('organizacoes') as any)
        .select('id')
        .eq('cnpj', cnpj)
        .maybeSingle()

      if (!orgExistente) {
        return { success: false, error: 'Erro ao localizar organizacao existente.' }
      }

      const { data: adminExistente } = await (serviceClient.from('usuarios') as any)
        .select('id, papel')
        .eq('organizacao_id', orgExistente.id)
        .in('papel', ['admin_organizacao', 'admin_plataforma'])
        .maybeSingle()

      if (adminExistente) {
        // Se o admin existente é o próprio usuário autenticado, ele já está configurado.
        // Atualiza o papel se necessário (ex: ADMIN_PLATFORM_EMAIL definido depois do primeiro cadastro).
        if (adminExistente.id === user.id) {
          if (adminExistente.papel !== papel) {
            await (serviceClient.from('usuarios') as any)
              .update({ papel })
              .eq('id', user.id)
          }
          revalidatePath('/', 'layout')
          return { success: true }
        }
        return { success: false, error: 'Esta prefeitura ja esta configurada e possui um administrador. Solicite acesso ao administrador da organizacao.' }
      }

      // Org existe mas nao tem admin: vincular o usuario autenticado com o papel correto
      const { error: vinculoError } = await (serviceClient.from('usuarios') as any)
        .insert({
          id: user.id,
          organizacao_id: orgExistente.id,
          papel,
          nome_completo,
          cargo: cargo ?? null,
        })

      if (vinculoError) {
        return { success: false, error: `Erro ao vincular usuario: ${vinculoError.message}` }
      }

      await (serviceClient.from('creditos_usuario') as any).insert({
        usuario_id: user.id,
        organizacao_id: orgExistente.id,
        saldo: 100,
      }).then(() => {}).catch(() => {})

      revalidatePath('/', 'layout')
      return { success: true }
    }
    return { success: false, error: `Erro no Supabase: ${orgError.message}` }
  }

  // Cria registro de usuário com papel resolvido pelo e-mail
  const { error: usuarioError } = await (serviceClient
    .from('usuarios') as any)
    .insert({
      id: user.id,
      organizacao_id: org.id,
      papel,
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

  revalidatePath('/', 'layout')
  return { success: true }
}
