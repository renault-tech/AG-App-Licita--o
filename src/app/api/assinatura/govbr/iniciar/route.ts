import { NextRequest, NextResponse } from 'next/server'

// -----------------------------------------------------------------------
// GET /api/assinatura/govbr/iniciar?documento_id=...&tabela=...&processo_id=...
//
// Redireciona o usuário para o SSO Gov.br para autenticação OAuth2.
// Após o login, o Gov.br redireciona para /api/assinatura/govbr/callback.
// -----------------------------------------------------------------------

export async function GET(req: NextRequest) {
  const clientId    = process.env.GOVBR_CLIENT_ID
  const redirectUri = process.env.GOVBR_REDIRECT_URI

  if (!clientId || !redirectUri) {
    return NextResponse.json(
      { error: 'GOVBR_CLIENT_ID e GOVBR_REDIRECT_URI não configurados.' },
      { status: 503 }
    )
  }

  const { searchParams } = new URL(req.url)
  const documentoId = searchParams.get('documento_id') ?? ''
  const tabela      = searchParams.get('tabela')      ?? ''
  const processoId  = searchParams.get('processo_id') ?? ''

  // Encoda o estado para recuperar após o callback
  const state = Buffer.from(JSON.stringify({ documentoId, tabela, processoId })).toString('base64url')

  const authUrl = new URL('https://sso.acesso.gov.br/authorize')
  authUrl.searchParams.set('response_type', 'code')
  authUrl.searchParams.set('client_id',     clientId)
  authUrl.searchParams.set('scope',         'openid+govbr_assinatura')
  authUrl.searchParams.set('redirect_uri',  redirectUri)
  authUrl.searchParams.set('nonce',         crypto.randomUUID())
  authUrl.searchParams.set('state',         state)

  return NextResponse.redirect(authUrl.toString())
}
