import type { AssinaturaAdapter, SolicitacaoAssinatura, ResultadoAssinatura } from '../types'
import { createHash } from 'crypto'

// Assinatura interna: hash SHA-256 do conteudo + timestamp + usuario
// Valida como registro de responsabilidade; nao tem validade juridica de ICP-Brasil
export const internoAdapter: AssinaturaAdapter = {
  provedor: 'interno',
  nome: 'Assinatura Interna',

  async assinar(s: SolicitacaoAssinatura): Promise<ResultadoAssinatura> {
    const payload = `${s.documentoId}:${s.usuarioId}:${s.organizacaoId}:${Date.now()}`
    const hash = createHash('sha256').update(payload).digest('hex')

    return {
      sucesso: true,
      hashDocumento: hash,
      provedor: 'interno',
      timestampAssinatura: new Date().toISOString(),
    }
  },
}