export type ProvedorAssinatura = 'interno' | 'clicksign' | 'zapsign' | 'govbr' | 'docusign'

export interface SolicitacaoAssinatura {
  documentoId: string
  tabelaOrigem: string
  processoId: string
  usuarioId: string
  organizacaoId: string
  nomeSignatario: string
  emailSignatario: string
  conteudoHash?: string
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