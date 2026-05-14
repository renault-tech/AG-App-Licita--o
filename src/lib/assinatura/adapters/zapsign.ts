import type { AssinaturaAdapter, SolicitacaoAssinatura, ResultadoAssinatura, ErroAssinatura } from '../types'
import { createHash } from 'crypto'

// -----------------------------------------------------------------------
// Adapter ZapSign (https://docs.zapsign.com.br)
// Requer ZAPSIGN_API_TOKEN no .env.local
// Token gerado em: https://app.zapsign.com.br/conta/integracao
// -----------------------------------------------------------------------

const ZAPSIGN_BASE = 'https://api.zapsign.com.br/api/v1'

interface ZapSignDocumentResponse {
  token: string
  open_id: number
  status: string
  signers?: ZapSignSignerResponse[]
}

interface ZapSignSignerResponse {
  token: string
  sign_url: string
  status: string
  email: string
  name: string
}

export const zapsignAdapter: AssinaturaAdapter = {
  provedor: 'zapsign',
  nome: 'ZapSign',

  async assinar(s: SolicitacaoAssinatura): Promise<ResultadoAssinatura | ErroAssinatura> {
    const apiToken = process.env.ZAPSIGN_API_TOKEN
    if (!apiToken) {
      return { sucesso: false, erro: 'ZAPSIGN_API_TOKEN não configurado. Acesse app.zapsign.com.br/conta/integracao.' }
    }

    // ----------------------------------------------------------------
    // Passo 1: Criar documento na ZapSign
    // Usamos um PDF placeholder; em produção, gerar o PDF real do documento
    // via /api/documentos/exportar-pdf e enviar o base64 aqui.
    // ----------------------------------------------------------------
    const nomeDocumento = `LicitaIA-${s.tabelaOrigem.toUpperCase()}-${s.documentoId.substring(0, 8)}`

    const payloadDoc = {
      name:             nomeDocumento,
      url_pdf:          null,                    // usar base64_pdf em produção
      sandbox:          process.env.NODE_ENV !== 'production',
      lang:             'pt-br',
      disable_signer_emails: false,
      signers: [
        {
          name:  s.nomeSignatario,
          email: s.emailSignatario,
          auth_mode: 'assinaturaTela',          // ou 'tokenSms', 'icpBrasil'
          send_automatic_email: true,
        },
      ],
    }

    let docToken: string
    let signUrl: string | undefined

    try {
      const resDoc = await fetch(`${ZAPSIGN_BASE}/docs/`, {
        method:  'POST',
        headers: {
          'Authorization': `Bearer ${apiToken}`,
          'Content-Type':  'application/json',
        },
        body: JSON.stringify(payloadDoc),
      })

      if (!resDoc.ok) {
        const errBody = await resDoc.text()
        return { sucesso: false, erro: `ZapSign API erro ${resDoc.status}: ${errBody}` }
      }

      const docData: ZapSignDocumentResponse = await resDoc.json()
      docToken = docData.token
      signUrl  = docData.signers?.[0]?.sign_url
    } catch (err) {
      return { sucesso: false, erro: `Falha de conexão com ZapSign: ${err instanceof Error ? err.message : String(err)}` }
    }

    // ----------------------------------------------------------------
    // Passo 2: Calcular hash de auditoria local (complementar ao ZapSign)
    // ----------------------------------------------------------------
    const hashPayload = `${s.documentoId}:${s.usuarioId}:${s.organizacaoId}:${docToken}:${Date.now()}`
    const hashDocumento = createHash('sha256').update(hashPayload).digest('hex')

    return {
      sucesso:             true,
      hashDocumento,
      provedor:            'zapsign',
      urlAssinatura:       signUrl,
      timestampAssinatura: new Date().toISOString(),
      referencia_externa:  docToken,
    }
  },
}
