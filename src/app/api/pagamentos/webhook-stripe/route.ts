import { NextRequest, NextResponse } from 'next/server'
import { concederCreditos } from '@/lib/actions/creditos'

// -----------------------------------------------------------------------
// Webhook Stripe
// URL a configurar no dashboard Stripe: POST /api/pagamentos/webhook-stripe
// Requer STRIPE_WEBHOOK_SECRET no .env.local
// -----------------------------------------------------------------------
export async function POST(req: NextRequest) {
  const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET
  if (!stripeWebhookSecret) {
    console.error('[stripe-webhook] STRIPE_WEBHOOK_SECRET não configurado')
    return NextResponse.json({ error: 'Webhook não configurado.' }, { status: 500 })
  }

  const signature = req.headers.get('stripe-signature')
  if (!signature) {
    return NextResponse.json({ error: 'Assinatura ausente.' }, { status: 400 })
  }

  const rawBody = await req.text()

  // Verificação de assinatura HMAC-SHA256 (sem depender do SDK Stripe)
  let event: Record<string, any>
  try {
    event = await verificarAssinaturaStripe(rawBody, signature, stripeWebhookSecret)
  } catch (err) {
    console.error('[stripe-webhook] Assinatura inválida:', err)
    return NextResponse.json({ error: 'Assinatura inválida.' }, { status: 400 })
  }

  // Processar apenas pagamentos completados
  if (event.type !== 'checkout.session.completed') {
    return NextResponse.json({ received: true })
  }

  const session = event.data?.object as Record<string, any>

  // Pagamento incompleto
  if (session.payment_status !== 'paid') {
    return NextResponse.json({ received: true })
  }

  const usuarioId  = session.metadata?.usuario_id as string | undefined
  const pacoteId   = session.metadata?.pacote_id  as string | undefined
  const creditos   = parseInt(session.metadata?.creditos ?? '0', 10)
  const sessionId  = session.id as string

  if (!usuarioId || !pacoteId || creditos <= 0) {
    console.error('[stripe-webhook] Metadados ausentes:', session.metadata)
    return NextResponse.json({ error: 'Metadados insuficientes.' }, { status: 400 })
  }

  const resultado = await concederCreditos({
    usuarioId,
    creditos,
    referenciaExterna: sessionId,
    descricao:         `Compra Stripe — Pacote ${creditos} créditos`,
    provedor:          'stripe',
  })

  if (!resultado.success) {
    console.error('[stripe-webhook] Erro ao conceder créditos:', resultado.error)
    return NextResponse.json({ error: resultado.error }, { status: 500 })
  }

  console.info(`[stripe-webhook] ${creditos} créditos concedidos ao usuário ${usuarioId} (sessão ${sessionId})`)
  return NextResponse.json({ received: true })
}

// -----------------------------------------------------------------------
// Verificação de assinatura Stripe sem SDK
// Conforme https://stripe.com/docs/webhooks/signatures
// -----------------------------------------------------------------------
async function verificarAssinaturaStripe(
  payload: string,
  signature: string,
  secret: string,
): Promise<Record<string, any>> {
  const partes  = Object.fromEntries(signature.split(',').map(p => p.split('=')))
  const t       = partes['t']
  const v1      = partes['v1']

  if (!t || !v1) throw new Error('Formato de assinatura inválido')

  // Verificar tolerância de 5 minutos para replay attacks
  const agora = Math.floor(Date.now() / 1000)
  if (Math.abs(agora - parseInt(t, 10)) > 300) {
    throw new Error('Timestamp fora da tolerância')
  }

  const encoder    = new TextEncoder()
  const keyData    = encoder.encode(secret)
  const msgData    = encoder.encode(`${t}.${payload}`)

  const cryptoKey  = await crypto.subtle.importKey('raw', keyData, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  const assinatura = await crypto.subtle.sign('HMAC', cryptoKey, msgData)
  const hexCalc    = Array.from(new Uint8Array(assinatura)).map(b => b.toString(16).padStart(2, '0')).join('')

  if (hexCalc !== v1) throw new Error('Assinatura HMAC não confere')

  return JSON.parse(payload)
}
