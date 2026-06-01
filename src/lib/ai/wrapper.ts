'use server'

import { createClient } from '@/lib/supabase/server'
import { gerarTextoIA, getProviderInfo } from './client'
import type { TipoAcaoIA, UsuarioRow, CreditosUsuarioRow, AcaoIARow } from '@/types/database'
import type { AIProvider } from './types'
import { headers } from 'next/headers'
import { verificarRateLimit } from './rate-limiter'
import { buscarClausulasRelevantes, injetarClausulasNoPrompt } from './clausulas-lookup'
import { isProviderGratuito, CREDITOS_BOAS_VINDAS } from '@/lib/creditos-config'

export interface RequestIA {
  prompt: string
  tipoAcao: TipoAcaoIA
  processoId?: string
  temperature?: number
  // Campos opcionais para lookup de clausulas aprendidas
  documentoTipo?: 'dfd' | 'etp' | 'tr'
  modalidade?: string
  categoriaObjeto?: string
  camposNecessarios?: string[]
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
      error: `Limite de chamadas de IA atingido. Tente novamente após ${rateLimit.resetEm.toLocaleTimeString('pt-BR')}.`,
    }
  }

  // Lookup de clausulas aprendidas: enriquecer prompt quando disponivel
  let promptFinal = params.prompt
  if (params.documentoTipo && params.camposNecessarios) {
    const lookup = await buscarClausulasRelevantes(
      organizacaoId,
      params.documentoTipo,
      params.modalidade ?? '',
      params.categoriaObjeto ?? '',
      params.camposNecessarios
    )
    promptFinal = injetarClausulasNoPrompt(params.prompt, lookup)
  }

  const { data: orgRaw } = await (supabase as any)
    .from('organizacoes')
    .select('ia_config')
    .eq('id', organizacaoId)
    .maybeSingle()

  const iaConfig = (orgRaw as any)?.ia_config as { provider?: string } | null
  const providerOverride = (iaConfig?.provider as AIProvider | undefined)
  const { provider: providerUsado, model: modeloUsado } = getProviderInfo(providerOverride)

  // Providers gratuitos (Gemini, Groq) nao consomem creditos do usuario.
  // Apenas rate limiting se aplica — sem verificacao de saldo.
  const usandoProviderGratuito = isProviderGratuito(providerUsado)

  type CreditosSaldo = Pick<CreditosUsuarioRow, 'id' | 'saldo'>
  let creditos: CreditosSaldo | null = null

  if (!usandoProviderGratuito) {
    // Provider pago: verificar e debitar creditos
    const { data: creditosRaw } = await supabase
      .from('creditos_usuario')
      .select('id, saldo')
      .eq('usuario_id', user.id)
      .single()

    creditos = creditosRaw as CreditosSaldo | null

    if (!creditos) {
      // Criar registro com saldo de boas-vindas se ainda nao existe
      const { data: novoRaw } = await (supabase as any)
        .from('creditos_usuario')
        .insert({ usuario_id: user.id, organizacao_id: organizacaoId, saldo: CREDITOS_BOAS_VINDAS })
        .select('id, saldo')
        .single()
      creditos = novoRaw as CreditosSaldo | null
    }

    if (!creditos || creditos.saldo <= 0) {
      return {
        success: false,
        error: 'Saldo de créditos insuficiente. Adquira mais créditos ou altere o provedor de IA para Gemini ou Groq (gratuitos).',
      }
    }
  }

  const temperature = params.temperature ?? 0.3
  let texto = ''
  let sucesso = false
  let erroMensagem: string | null = null
  // Providers gratuitos nao debitam creditos — registrar 0 no log
  let creditosDebitar = usandoProviderGratuito ? 0 : 1
  let tokensEntradaReal: number | null = null
  let tokensSaidaReal: number | null = null

  try {
    const res = await gerarTextoIA({
      prompt: promptFinal,
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
        const res = await gerarTextoIA({ prompt: promptFinal, temperature, provider: envProvider })
        texto = res.text
        tokensEntradaReal = res.tokensIn
        tokensSaidaReal = res.tokensOut
        sucesso = true
      } catch (err2) {
        erroMensagem = err2 instanceof Error ? err2.message : 'Falha de comunicação com o provedor de IA.'
        if (!usandoProviderGratuito) creditosDebitar = 0
      }
    } else {
      erroMensagem = err instanceof Error ? err.message : 'Falha de comunicação com o provedor de IA.'
      if (!usandoProviderGratuito) creditosDebitar = 0
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

  // Debitar creditos apenas para providers pagos e quando houve sucesso
  if (!usandoProviderGratuito && sucesso && creditosDebitar > 0 && creditos) {
    await (supabase as any)
      .from('creditos_usuario')
      .update({ saldo: creditos.saldo - creditosDebitar, updated_at: new Date().toISOString() })
      .eq('id', creditos.id)
  }

  if (!sucesso) return { success: false, error: erroMensagem ?? 'Falha interna.' }
  return { success: true, texto }
}