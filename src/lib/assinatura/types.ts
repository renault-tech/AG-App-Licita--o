export type ProvedorAssinatura = 'interno' | 'clicksign' | 'zapsign' | 'govbr' | 'docusign'

export type ZapSignAuthMode = 'assinaturaTela' | 'icpBrasil' | 'tokenSms'

export interface ConfigAssinatura {
  provider: ProvedorAssinatura
  zapsign_auth_mode?: ZapSignAuthMode
}

export interface SolicitacaoAssinatura {
  documentoId: string
  tabelaOrigem: string
  processoId: string
  usuarioId: string
  organizacaoId: string
  nomeSignatario: string
  emailSignatario: string
  conteudoHash?: string
  zapsignAuthMode?: ZapSignAuthMode
}

export interface ResultadoAssinatura {
  sucesso: true
  hashDocumento: string
  provedor: ProvedorAssinatura
  urlAssinatura?: string
  timestampAssinatura: string
  referencia_externa?: string
}

export interface ErroAssinatura {
  sucesso: false
  erro: string
}

export interface AssinaturaAdapter {
  provedor: ProvedorAssinatura
  nome: string
  assinar(solicitacao: SolicitacaoAssinatura): Promise<ResultadoAssinatura | ErroAssinatura>
}