import type { AssinaturaAdapter, SolicitacaoAssinatura, ResultadoAssinatura, ErroAssinatura } from '../types'
import { createHash } from 'crypto'

// -----------------------------------------------------------------------
// Adapter Assinatura Gov.br (https://www.gov.br/conecta/catalogo/apis/assinatura-digital)
//
// Fluxo OAuth2 Gov.br:
//   1. Redirecionar usuário para https://sso.acesso.gov.br/authorize
//   2. Receber code no callback /api/assinatura/govbr/callback
//   3. Trocar code por access_token via /token
//   4. Chamar API de assinatura com o token para assinar o hash do documento
//
// Variáveis de ambiente necessárias:
//   GOVBR_CLIENT_ID      — ID do serviço cadastrado no Gov.br
//   GOVBR_CLIENT_SECRET  — Secret do serviço
//   GOVBR_REDIRECT_URI   — URL de callback (ex: https://app.licitaia.com.br/api/assinatura/govbr/callback)
//
// NOTA: Este adapter assume que o access_token já foi obtido via OAuth2
// e é passado no campo conteudoHash (temporariamente reutilizado como portador do token)
// até integração completa com sessão OAuth2.
// -----------------------------------------------------------------------

const GOVBR_API_BASE = 'https://assinatura.sinesp.gov.br/assinatura/v2'

export const govbrAdapter: AssinaturaAdapter = {
  provedor: 'govbr',
  nome: 'Assinatura Gov.br',

  async assinar(s: SolicitacaoAssinatura): Promise<ResultadoAssinatura | ErroAssinatura> {
    const clientId     = process.env.GOVBR_CLIENT_ID
    const clientSecret = process.env.GOVBR_CLIENT_SECRET

    if (!clientId || !clientSecret) {
      return {
        sucesso: false,
        erro: 'GOVBR_CLIENT_ID e GOVBR_CLIENT_SECRET não configurados. Configure no painel do Gov.br Conecta.',
      }
    }

    // ----------------------------------------------------------------
    // Em produção: o access_token deve vir da sessão OAuth2 do usuário.
    // Aqui verificamos se foi pré-obtido e passado como referencia_externa.
    // O fluxo completo requer integração com o módulo de sessão OAuth2.
    // ----------------------------------------------------------------
    const accessToken = s.conteudoHash  // convenção temporária

    if (!accessToken) {
      return {
        sucesso: false,
        erro:    'Assinatura Gov.br requer autenticação prévia via Gov.br. Inicie o fluxo de login.',
      }
    }

    // ----------------------------------------------------------------
    // Hash SHA-256 do documento para assinatura destacada (detached)
    // ----------------------------------------------------------------
    const docPayload    = `${s.documentoId}:${s.tabelaOrigem}:${s.processoId}`
    const hashDocumento = createHash('sha256').update(docPayload).digest('hex')

    try {
      // Endpoint de assinatura de hash (PKCS#7 detached)
      const res = await fetch(`${GOVBR_API_BASE}/assinar`, {
        method:  'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type':  'application/json',
        },
        body: JSON.stringify({
          hashConteudo:   hashDocumento,
          algoritmo:      'SHA256withRSA',
          tipo:           'DETACHED',
          nivelConfianca: 1,              // 1=Cadastro, 2=Verificado, 3=Qualificado
        }),
      })

      if (!res.ok) {
        const errBody = await res.text()
        return { sucesso: false, erro: `Gov.br API erro ${res.status}: ${errBody}` }
      }

      const dados = await res.json()

      return {
        sucesso:             true,
        hashDocumento,
        provedor:            'govbr',
        timestampAssinatura: new Date().toISOString(),
        referencia_externa:  dados.protocolo ?? dados.id ?? 'govbr-ok',
      }
    } catch (err) {
      return {
        sucesso: false,
        erro:    `Falha de conexão com Gov.br: ${err instanceof Error ? err.message : String(err)}`,
      }
    }
  },
}
