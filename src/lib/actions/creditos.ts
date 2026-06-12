'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { PACOTES_CREDITOS, type PacoteId } from '@/lib/creditos-config'

// -----------------------------------------------------------------------
// Stripe Checkout
// Requer: STRIPE_SECRET_KEY e NEXT_PUBLIC_APP_URL no .env.local
// -----------------------------------------------------------------------
export async function criarSessaoStripe(pacoteId: PacoteId): Promise<{ url: string } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  const pacote = PACOTES_CREDITOS.find(p => p.id === pacoteId)
  if (!pacote) return { error: 'Pacote inválido.' }

  const stripeKey = process.env.STRIPE_SECRET_KEY
  if (!stripeKey) return { error: 'Stripe não configurado.' }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  try {
    const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${stripeKey}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        'payment_method_types[]':        'card',
        'line_items[0][price_data][currency]':                 'brl',
        'line_items[0][price_data][product_data][name]':      `LicitaIA: ${pacote.creditos} Créditos`,
        'line_items[0][price_data][product_data][description]': `Pacote de ${pacote.creditos} créditos para uso de IA`,
        'line_items[0][price_data][unit_amount]':              String(pacote.preco_brl),
        'line_items[0][quantity]':                             '1',
        'mode':                          'payment',
        'success_url':                   `${appUrl}/creditos?sucesso=1&pacote=${pacoteId}`,
        'cancel_url':                    `${appUrl}/creditos?cancelado=1`,
        'metadata[usuario_id]':          user.id,
        'metadata[pacote_id]':           pacoteId,
        'metadata[creditos]':            String(pacote.creditos),
      }).toString(),
    })

    if (!res.ok) {
      const err = await res.json()
      return { error: err.error?.message ?? 'Erro ao criar sessão Stripe.' }
    }

    const session = await res.json()
    return { url: session.url }
  } catch (err) {
    return { error: `Falha de conexão com Stripe: ${err instanceof Error ? err.message : String(err)}` }
  }
}

// -----------------------------------------------------------------------
// Mercado Pago Preference
// Requer: MERCADOPAGO_ACCESS_TOKEN e NEXT_PUBLIC_APP_URL no .env.local
// -----------------------------------------------------------------------
export async function criarPreferenciaMercadoPago(pacoteId: PacoteId): Promise<{ url: string } | { error: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado.' }

  const pacote = PACOTES_CREDITOS.find(p => p.id === pacoteId)
  if (!pacote) return { error: 'Pacote inválido.' }

  const mpToken = process.env.MERCADOPAGO_ACCESS_TOKEN
  if (!mpToken) return { error: 'Mercado Pago não configurado.' }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000'

  try {
    const res = await fetch('https://api.mercadopago.com/checkout/preferences', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${mpToken}`,
        'Content-Type':  'application/json',
        'X-Idempotency-Key': `${user.id}-${pacoteId}-${Date.now()}`,
      },
      body: JSON.stringify({
        items: [{
          id:          pacoteId,
          title:       `LicitaIA: ${pacote.creditos} Créditos`,
          description: `Pacote de ${pacote.creditos} créditos para uso de IA na plataforma LicitaIA`,
          quantity:    1,
          unit_price:  pacote.preco_brl / 100,
          currency_id: 'BRL',
        }],
        back_urls: {
          success: `${appUrl}/creditos?sucesso=1&pacote=${pacoteId}`,
          failure: `${appUrl}/creditos?cancelado=1`,
          pending: `${appUrl}/creditos?pendente=1`,
        },
        auto_return:     'approved',
        external_reference: `${user.id}|${pacoteId}|${pacote.creditos}`,
        statement_descriptor: 'LICITAIA',
      }),
    })

    if (!res.ok) {
      const err = await res.json()
      return { error: err.message ?? 'Erro ao criar preferência Mercado Pago.' }
    }

    const pref = await res.json()
    // init_point = URL de checkout real; sandbox_init_point = ambiente de testes
    const url = process.env.NODE_ENV === 'production' ? pref.init_point : pref.sandbox_init_point
    return { url }
  } catch (err) {
    return { error: `Falha de conexão com Mercado Pago: ${err instanceof Error ? err.message : String(err)}` }
  }
}

// -----------------------------------------------------------------------
// Conceder créditos (chamado pelos webhooks após pagamento confirmado)
// Operação idempotente via referencia_externa única
// -----------------------------------------------------------------------
export async function concederCreditos(params: {
  usuarioId:          string
  creditos:           number
  referenciaExterna:  string  // ex: stripe_session_id ou mp_payment_id
  descricao:          string
  provedor:           'stripe' | 'mercadopago' | 'manual'
}): Promise<{ success: true } | { success: false; error: string }> {
  const { createClient: createServiceClient } = await import('@/lib/supabase/server')
  const supabase = await createServiceClient()

  // Verificar idempotência: não creditar duas vezes o mesmo pagamento
  const { data: existing } = await (supabase as any)
    .from('transacoes_credito')
    .select('id')
    .eq('referencia_externa', params.referenciaExterna)
    .maybeSingle()

  if (existing) return { success: true } // já processado

  // Buscar saldo atual (ou criar registro de créditos)
  const { data: credRaw } = await (supabase as any)
    .from('creditos_usuario')
    .select('id, saldo, organizacao_id')
    .eq('usuario_id', params.usuarioId)
    .maybeSingle()

  let saldoAnterior = 0
  let creditosId: string | null = null
  let organizacaoId: string | null = null

  if (credRaw) {
    saldoAnterior  = credRaw.saldo
    creditosId     = credRaw.id
    organizacaoId  = credRaw.organizacao_id
  } else {
    // Buscar organização do usuário para criar o registro
    const { data: usr } = await (supabase as any)
      .from('usuarios')
      .select('organizacao_id')
      .eq('id', params.usuarioId)
      .maybeSingle()

    organizacaoId = usr?.organizacao_id ?? null

    const { data: novoCredito } = await (supabase as any)
      .from('creditos_usuario')
      .insert({ usuario_id: params.usuarioId, organizacao_id: organizacaoId, saldo: 0 })
      .select('id, saldo')
      .single()

    creditosId    = novoCredito?.id ?? null
    saldoAnterior = 0
  }

  if (!creditosId) return { success: false, error: 'Não foi possível localizar o registro de créditos.' }

  const novoSaldo = saldoAnterior + params.creditos

  // Atualizar saldo
  const { error: errUpdate } = await (supabase as any)
    .from('creditos_usuario')
    .update({ saldo: novoSaldo, updated_at: new Date().toISOString() })
    .eq('id', creditosId)

  if (errUpdate) return { success: false, error: errUpdate.message }

  // Registrar transação
  await (supabase as any)
    .from('transacoes_credito')
    .insert({
      usuario_id:          params.usuarioId,
      organizacao_id:      organizacaoId,
      tipo:                'compra',
      quantidade:          params.creditos,
      saldo_anterior:      saldoAnterior,
      saldo_posterior:     novoSaldo,
      descricao:           params.descricao,
      referencia_externa:  params.referenciaExterna,
      provedor:            params.provedor,
    })

  return { success: true }
}
