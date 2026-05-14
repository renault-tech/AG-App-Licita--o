import type { AssinaturaAdapter, ProvedorAssinatura } from './types'
import { internoAdapter }   from './adapters/interno'
import { clicksignAdapter } from './adapters/clicksign'
import { zapsignAdapter }   from './adapters/zapsign'
import { govbrAdapter }     from './adapters/govbr'

const adapters: Record<ProvedorAssinatura, AssinaturaAdapter> = {
  interno:   internoAdapter,
  clicksign: clicksignAdapter,
  zapsign:   zapsignAdapter,
  govbr:     govbrAdapter,
  docusign:  internoAdapter,   // fallback interno -- implementar se necessario
}

export function getAssinaturaAdapter(provedor?: ProvedorAssinatura): AssinaturaAdapter {
  const p = provedor ?? 'interno'
  return adapters[p] ?? internoAdapter
}

export { type ProvedorAssinatura }