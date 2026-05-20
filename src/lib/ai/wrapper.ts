'use server'

import { createClient } from '@/lib/supabase/server'
import { gerarTextoIA, getProviderInfo } from './client'
import type { TipoAcaoIA, UsuarioRow, CreditosUsuarioRow, AcaoIARow } from '@/types/database'
import type { AIProvider } from './types'
import { headers } from 'next/headers'
import { verificarRateLimit } from './rate-limiter'

export interface RequestIA {
  prompt: string
  tipoAcao: TipoAcaoIA
  processoId?: string
  temperature?: number
}

export interface ResultadoIA {
  success: true
  texto: string
}

export interface ErroIA {
  success: false
  error: string
}

export async function executarIAComCreditos(
  params: RequestIA
): Promise<ResultadoIA | ErroIA> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Usuário não autenticado.' }

  const { data: usuarioRaw } = await supabase
    .from('usuarios')
    .select('organizacao_id')
    .eq('id', user.id)
    .single()

  const usuario = usuarioRaw as Pick<UsuarioRow, 'organizacao_id'> | null
  if (!usuario) return { success: false, error: 'Perfil de usuário não encontrado.' }

  const organizacaoId = usuario.organizacao_id

  // Rate limiting: verificar antes de qualquer chamada a IA
  const headersList = await headers()
  const ip = headersList.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '0.0.0.0'
  const rateLimit = await verificarRateLimit(organizacaoId, user.id, ip)
  if (!rateLimit.permitido) {
    return {
      success: false,
      error: `Limite de chamadas de IA atingido. Tente novamente apos ${rateLimit.resetEm.toLocaleTimeString('pt-BR')}.`,
    }
  }

  const [creditosRaw, orgRaw] = await Promise.all([
    supabase
      .from('creditos_usuario')
      .select('id, saldo')
      .eq('usuario_id', user.id)
      .single(),
    (supabase as any)
      .from('organizacoes')
      .select('ia_config')
      .eq('id', organizacaoId)
      .maybeSingle(),
  ])

  type CreditosSaldo = Pick<CreditosUsuarioRow, 'id' | 'saldo'>
  let creditos = creditosRaw.data as CreditosSaldo | null

  if (!creditos) {
    const { data: novoRaw } = await (supabase as any)
      .from('creditos_usuario')
      .insert({ usuario_id: user.id, organizacao_id: organizacaoId, saldo: 500 })
      .select('id, saldo')
      .single()
    creditos = novoRaw as CreditosSaldo | null
  }

  if (!creditos || creditos.saldo <= 0) {
    return {
      success: false,
      error: 'Saldo de créditos insuficiente. Adquira mais créditos para continuar.',
    }
  }

  const iaConfig = (orgRaw.data as any)?.ia_config as { provider?: string } | null
  const providerOverride = (iaConfig?.provider as AIProvider | undefined)
  const { provider: providerUsado, model: modeloUsado } = getProviderInfo(providerOverride)

  const temperature = params.temperature ?? 0.3
  let texto = ''
  let sucesso = false
  let erroMensagem: string | null = null
  let creditosDebitar = 1
  let tokensEntradaReal: number | null = null
  let tokensSaidaReal: number | null = null

  try {
    const res = await gerarTextoIA({
      prompt: params.prompt,
      temperature,
      provider: providerOverride,
    })
    texto = res.text
    tokensEntradaReal = res.tokensIn
    tokensSaidaReal = res.tokensOut
    sucesso = true
  } catch (err) {
    // Se org tem provider configurado e falhou, tentar o provider padrao do env como fallback
    const envProvider = (process.env.AI_PROVIDER ?? 'gemini') as AIProvider
    if (providerOverride && providerOverride !== envProvider) {
      try {
        const res = await gerarTextoIA({ prompt: params.prompt, temperature, provider: envProvider })
        texto = res.text
        tokensEntradaReal = res.tokensIn
        tokensSaidaReal = res.tokensOut
        sucesso = true
      } catch (err2) {
        erroMensagem = err2 instanceof Error ? err2.message : 'Falha de comunicação com o provedor de IA.'
        creditosDebitar = 0
      }
    } else {
      erroMensagem = err instanceof Error ? err.message : 'Falha de comunicação com o provedor de IA.'
      creditosDebitar = 0
    }
  }

  // Registrar acao de IA (fire-and-forget)
  ;(supabase as any)
    .from('acoes_ia')
    .insert({
      usuario_id: user.id,
      organizacao_id: organizacaoId,
      processo_id: params.processoId ?? null,
      tipo_acao: params.tipoAcao,
      provedor: providerUsado,
      modelo: modeloUsado,
      tokens_entrada: params.prompt.length,
      tokens_saida: texto.length,
      tokens_entrada_real: tokensEntradaReal,
      tokens_saida_real: tokensSaidaReal,
      chars_entrada: params.prompt.length,
      chars_saida: texto.length,
      creditos_consumidos: creditosDebitar,
      input_resumo: params.prompt.substring(0, 100),
      sucesso,
      erro_mensagem: erroMensagem,
    } satisfies Omit<AcaoIARow, 'id' | 'created_at'>)
    .then(() => {})

  if (sucesso && creditosDebitar > 0) {
    await (supabase as any)
      .from('creditos_usuario')
      .update({ saldo: creditos.saldo - creditosDebitar, updated_at: new Date().toISOString() })
      .eq('id', creditos.id)
  }

  if (!sucesso) return { success: false, error: erroMensagem ?? 'Falha interna.' }
  return { success: true, texto }
}