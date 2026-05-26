import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createHash } from 'crypto'

// -----------------------------------------------------------------------
// POST /api/assinatura/zapsign/callback
//
// Recebe notificacoes de eventos da ZapSign via webhook.
// Configurar em: app.zapsign.com.br > Integracoes > Webhooks
// URL: https://app.licitaia.com.br/api/assinatura/zapsign/callback
//
// Eventos tratados:
//   - doc_signed: todos os signatarios assinaram
//   - signer_signed: signatario individual assinou (multiplas assinaturas)
// -----------------------------------------------------------------------

interface ZapSignWebhookPayload {
  event_type: 'doc_signed' | 'signer_signed' | 'doc_refused' | string
  document: {
    token:       string
    status:      'pending' | 'signed' | 'refused'
    name:        string
    signed_at?:  string
    extra_docs?:  unknown[]
  }
  signer?: {
    token:    string
    name:     string
    email:    string
    status:   string
    signed_at?: string
  }
}

export async function POST(req: NextRequest) {
  // Valida token de seguranca do webhook (configurar ZAPSIGN_WEBHOOK_SECRET no .env.local)
  const webhookSecret = process.env.ZAPSIGN_WEBHOOK_SECRET
  if (webhookSecret) {
    const signature = req.headers.get('x-zapsign-signature') ?? ''
    const body      = await req.text()
    const expected  = createHash('sha256').update(`${webhookSecret}${body}`).digest('hex')
    if (signature !== expected) {
      return NextResponse.json({ error: 'Assinatura invalida.' }, { status: 401 })
    }
    // Re-parse apos consumir o stream
    const payload: ZapSignWebhookPayload = JSON.parse(body)
    return handlePayload(payload)
  }

  const payload: ZapSignWebhookPayload = await req.json()
  return handlePayload(payload)
}

async function handlePayload(payload: ZapSignWebhookPayload) {
  if (payload.event_type !== 'doc_signed') {
    return NextResponse.json({ ok: true, skipped: true })
  }

  const docToken = payload.document?.token
  if (!docToken) {
    return NextResponse.json({ error: 'Token de documento ausente.' }, { status: 400 })
  }

  const supabase = await createClient()

  // Busca assinatura pendente pelo token externo (referencia_externa)
  const { data: assinaturaRaw, error: fetchError } = await (supabase as any)
    .from('assinaturas')
    .select('id, tabela_origem, documento_id, organizacao_id')
    .eq('referencia_externa', docToken)
    .eq('status', 'pendente')
    .maybeSingle()

  if (fetchError || !assinaturaRaw) {
    // Pode ser reenvio de webhook ja processado; retorna 200 para evitar retentativas
    return NextResponse.json({ ok: true, not_found: true })
  }

  const assinatura = assinaturaRaw as {
    id: string
    tabela_origem: string
    documento_id: string
    organizacao_id: string
  }

  const timestampAssinatura = payload.document.signed_at ?? new Date().toISOString()

  // Atualiza registro de assinatura para concluido
  await (supabase as any)
    .from('assinaturas')
    .update({ status: 'concluido', timestamp_assinatura: timestampAssinatura })
    .eq('id', assinatura.id)

  // Atualiza status do documento para assinado
  await (supabase as any)
    .from(assinatura.tabela_origem)
    .update({ status: 'assinado', updated_at: timestampAssinatura })
    .eq('id', assinatura.documento_id)

  return NextResponse.json({ ok: true })
}
