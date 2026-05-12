import type { AssinaturaAdapter, SolicitacaoAssinatura, ResultadoAssinatura, ErroAssinatura } from '../types'

// Stub: integração Clicksign (https://developers.clicksign.com)
// Requer CLICKSIGN_API_TOKEN no .env.local e configuracao por organizacao
export const clicksignAdapter: AssinaturaAdapter = {
  provedor: 'clicksign',
  nome: 'Clicksign',

  async assinar(s: SolicitacaoAssinatura): Promise<ResultadoAssinatura | ErroAssinatura> {
    const apiToken = process.env.CLICKSIGN_API_TOKEN
    if (!apiToken) {
      return { sucesso: false, erro: 'CLICKSIGN_API_TOKEN nao configurado.' }
    }

    // TODO: implementar fluxo completo:
    // 1. POST /api/v1/documents — upload do PDF do documento
    // 2. POST /api/v1/lists — criar lista de assinaturas
    // 3. POST /api/v1/lists/{key}/signers — adicionar signatario
    // 4. POST /api/v1/lists/{key}/notifications — notificar via email
    // 5. Webhook /api/assinatura/callback para receber confirmacao

    return {
      sucesso: false,
      erro: 'Integracao Clicksign em desenvolvimento. Use a assinatura interna por enquanto.',
    }
  },
}