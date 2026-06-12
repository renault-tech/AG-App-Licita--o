import { NextRequest, NextResponse } from 'next/server'
import { concederCreditos } from '@/lib/actions/creditos'
import crypto from 'crypto'

// -----------------------------------------------------------------------
// Webhook Mercado Pago
// URL a configurar no painel MP: POST /api/pagamentos/webhook-mercadopago
// Requer MERCADOPAGO_ACCESS_TOKEN no .env.local
//
// Eventos relevantes: payment (status approved)
// Docs: https://www.mercadopago.com.br/developers/pt/docs/your-integrations/notifications/webhooks
// -----------------------------------------------------------------------
export async function POST(req: NextRequest) {
  const mpToken = process.env.MERCADOPAGO_ACCESS_TOKEN
  if (!mpToken) {
    console.error('[mp-webhook] MERCADOPAGO_ACCESS_TOKEN não configurado')
    return NextResponse.json({ error: 'Webhook não configurado.' }, { status: 500 })
  }

  // MP envia o payload como JSON
  let body: Record<string, any>
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ error: 'Payload inválido.' }, { status: 400 })
  }

  // Verificar assinatura x-signature (quando habilitada no painel MP)
  const xSignature = req.headers.get('x-signature')
  const xRequestId = req.headers.get('x-request-id')
  const dataId     = req.nextUrl.searchParams.get('data.id')

  if (xSignature && xRequestId && dataId) {
    const mpWebhookSecret = process.env.MERCADOPAGO_WEBHOOK_SECRET
    if (mpWebhookSecret) {
      const manifest = `id:${dataId};request-id:${xRequestId};`
      const partes   = Object.fromEntries(xSignature.split(',').map(p => p.split('=')))
      const ts       = partes['ts']
      const v1       = partes['v1']
      const msg      = ts ? `${manifest}ts:${ts};` : manifest
      const hmac     = crypto.createHmac('sha256', mpWebhookSecret).update(msg).digest('hex')

      if (hmac !== v1) {
        console.error('[mp-webhook] Assinatura inválida')
        return NextResponse.json({ error: 'Assinatura inválida.' }, { status: 401 })
      }
    }
  }

  // Processar apenas notificações de pagamento
  const tipo = body.type ?? body.action
  if (tipo !== 'payment') {
    return NextResponse.json({ received: true })
  }

  const paymentId: string | undefined = body.data?.id ?? String(body.id ?? '')
  if (!paymentId) {
    return NextResponse.json({ received: true })
  }

  // Consultar detalhes do pagamento na API MP
  let pagamento: Record<string, any>
  try {
    const res = await fetch(`https://api.mercadopago.com/v1/payments/${paymentId}`, {
      headers: { 'Authorization': `Bearer ${mpToken}` },
    })
    if (!res.ok) {
      console.error(`[mp-webhook] Erro ao buscar pagamento ${paymentId}:`, res.status)
      return NextResponse.json({ received: true })
    }
    pagamento = await res.json()
  } catch (err) {
    console.error('[mp-webhook] Falha ao consultar API MP:', err)
    return NextResponse.json({ received: true })
  }

  // Só processar pagamentos aprovados
  if (pagamento.status !== 'approved') {
    return NextResponse.json({ received: true })
  }

  // Extrair dados do external_reference: "usuarioId|pacoteId|creditos"
  const ref: string = pagamento.external_reference ?? ''
  const [usuarioId, pacoteId, creditosStr] = ref.split('|')
  const creditos = parseInt(creditosStr ?? '0', 10)

  if (!usuarioId || !pacoteId || creditos <= 0) {
    console.error('[mp-webhook] external_reference inválido:', ref)
    return NextResponse.json({ received: true })
  }

  const resultado = await concederCreditos({
    usuarioId,
    creditos,
    referenciaExterna: `mp_${paymentId}`,
    descricao:         `Compra Mercado Pago: Pacote ${creditos} créditos`,
    provedor:          'mercadopago',
  })

  if (!resultado.success) {
    console.error('[mp-webhook] Erro ao conceder créditos:', resultado.error)
    return NextResponse.json({ error: resultado.error }, { status: 500 })
  }

  console.info(`[mp-webhook] ${creditos} créditos concedidos ao usuário ${usuarioId} (pagamento ${paymentId})`)
  return NextResponse.json({ received: true })
}
