import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { govbrAdapter } from '@/lib/assinatura/adapters/govbr'

// -----------------------------------------------------------------------
// GET /api/assinatura/govbr/callback?code=...&state=...
//
// Recebe o código OAuth2 do Gov.br, troca pelo access_token,
// chama o adapter de assinatura e atualiza o banco de dados.
// -----------------------------------------------------------------------

const GOVBR_TOKEN_URL = 'https://sso.acesso.gov.br/token'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const code  = searchParams.get('code')
  const state = searchParams.get('state')

  if (!code || !state) {
    return NextResponse.redirect(new URL('/erro?motivo=govbr_sem_code', req.url))
  }

  // Decodifica o estado com os dados do documento
  let documentoId: string, tabela: string, processoId: string
  try {
    const decoded = JSON.parse(Buffer.from(state, 'base64url').toString())
    documentoId = decoded.documentoId
    tabela      = decoded.tabela
    processoId  = decoded.processoId
  } catch {
    return NextResponse.redirect(new URL('/erro?motivo=govbr_state_invalido', req.url))
  }

  const clientId     = process.env.GOVBR_CLIENT_ID!
  const clientSecret = process.env.GOVBR_CLIENT_SECRET!
  const redirectUri  = process.env.GOVBR_REDIRECT_URI!

  // Troca code por access_token
  let accessToken: string
  try {
    const tokenRes = await fetch(GOVBR_TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type:    'authorization_code',
        code,
        redirect_uri:  redirectUri,
        client_id:     clientId,
        client_secret: clientSecret,
      }),
    })

    if (!tokenRes.ok) {
      const err = await tokenRes.text()
      console.error('[govbr/callback] Erro token:', err)
      return NextResponse.redirect(new URL('/erro?motivo=govbr_token_falhou', req.url))
    }

    const tokenData = await tokenRes.json()
    accessToken = tokenData.access_token
  } catch (err) {
    console.error('[govbr/callback] Exceção token:', err)
    return NextResponse.redirect(new URL('/erro?motivo=govbr_excecao', req.url))
  }

  // Busca usuário autenticado
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  const { data: usuarioRaw } = await supabase
    .from('usuarios')
    .select('id, organizacao_id, nome_completo')
    .eq('id', user.id)
    .single()

  const usuario = usuarioRaw as { id: string; organizacao_id: string; nome_completo: string } | null
  if (!usuario) {
    return NextResponse.redirect(new URL('/erro?motivo=govbr_usuario_nao_encontrado', req.url))
  }

  // Chama o adapter passando o access_token via conteudoHash (convenção do adapter)
  const resultado = await govbrAdapter.assinar({
    documentoId,
    tabelaOrigem:    tabela,
    processoId,
    usuarioId:       usuario.id,
    organizacaoId:   usuario.organizacao_id,
    nomeSignatario:  usuario.nome_completo ?? user.email ?? 'Usuário',
    emailSignatario: user.email ?? '',
    conteudoHash:    accessToken,   // portador temporário do token OAuth2
  })

  if (!resultado.sucesso) {
    console.error('[govbr/callback] Adapter falhou:', resultado.erro)
    return NextResponse.redirect(
      new URL(`/erro?motivo=govbr_assinatura_falhou&detalhe=${encodeURIComponent(resultado.erro)}`, req.url)
    )
  }

  // Atualiza documento e registra assinatura
  await (supabase.from(tabela) as any)
    .update({ status: 'assinado', updated_at: new Date().toISOString() })
    .eq('id', documentoId)

  await (supabase.from('assinaturas') as any).insert({
    tabela_origem:        tabela,
    documento_id:         documentoId,
    organizacao_id:       usuario.organizacao_id,
    usuario_id:           user.id,
    provedor:             'govbr',
    hash_documento:       resultado.hashDocumento,
    timestamp_assinatura: resultado.timestampAssinatura,
    status:               'concluido',
    referencia_externa:   resultado.referencia_externa ?? null,
  })

  // Mapeia tabela → slug de navegação
  const SLUG: Record<string, string> = {
    dfd: 'dfd', etp: 'etp', termo_referencia: 'tr',
    mapa_riscos: 'riscos', edital: 'edital', pareceres: 'parecer',
  }
  const slug = SLUG[tabela] ?? tabela

  return NextResponse.redirect(
    new URL(`/processos/${processoId}/${slug}?assinado=govbr`, req.url)
  )
}
