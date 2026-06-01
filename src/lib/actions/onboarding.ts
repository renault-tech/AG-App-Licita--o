'use server'

import { createClient, createServiceClient } from '@/lib/supabase/server'
import { schemaOnboarding, type OnboardingInput } from '@/lib/validacao/organizacao'
import { revalidatePath } from 'next/cache'
import { CREDITOS_BOAS_VINDAS } from '@/lib/creditos-config'

// Provisiona creditos iniciais e registra transacao de boas-vindas.
// Idempotente: nao cria duplicata se o usuario ja tiver saldo.
async function provisionarCreditosIniciais(
  serviceClient: Awaited<ReturnType<typeof createServiceClient>>,
  usuarioId: string,
  organizacaoId: string,
): Promise<void> {
  const { data: existente } = await (serviceClient.from('creditos_usuario') as any)
    .select('id')
    .eq('usuario_id', usuarioId)
    .maybeSingle()

  if (existente) return // ja tem registro — nao recriar

  const { data: creditos } = await (serviceClient.from('creditos_usuario') as any)
    .insert({ usuario_id: usuarioId, organizacao_id: organizacaoId, saldo: CREDITOS_BOAS_VINDAS })
    .select('id')
    .single()

  if (!creditos?.id) return

  // Registrar transacao de boas-vindas para visibilidade no historico
  await (serviceClient.from('transacoes_credito') as any).insert({
    usuario_id:         usuarioId,
    organizacao_id:     organizacaoId,
    tipo:               'bonus',
    quantidade:         CREDITOS_BOAS_VINDAS,
    saldo_anterior:     0,
    saldo_posterior:    CREDITOS_BOAS_VINDAS,
    descricao:          'Creditos gratuitos de boas-vindas',
    referencia_externa: `boas-vindas-${usuarioId}`,
    provedor:           'manual',
  })
}

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
  const { data: usuarioExistente } = await (supabase as any)
    .from('usuarios')
    .select('organizacao_id')
    .eq('id', user.id)
    .maybeSingle()

  if ((usuarioExistente as { organizacao_id?: string } | null)?.organizacao_id) {
    // Usuario ja configurado: nao reprocessar, apenas redirecionar para o dashboard
    revalidatePath('/', 'layout')
    return { success: true }
  }

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

      await provisionarCreditosIniciais(serviceClient, user.id, orgExistente.id)

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

  // Provisiona creditos gratuitos de boas-vindas com registro no historico
  await provisionarCreditosIniciais(serviceClient, user.id, org.id)

  revalidatePath('/', 'layout')
  return { success: true }
}
