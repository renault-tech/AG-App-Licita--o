import type { AssinaturaAdapter, ProvedorAssinatura } from './types'
import { internoAdapter } from './adapters/interno'
import { clicksignAdapter } from './adapters/clicksign'

const adapters: Record<ProvedorAssinatura, AssinaturaAdapter> = {
  interno:   internoAdapter,
  clicksign: clicksignAdapter,
  zapsign:   internoAdapter,   // fallback interno ate implementacao
  govbr:     internoAdapter,   // fallback interno ate implementacao
  docusign:  internoAdapter,   // fallback interno ate implementacao
}

export function getAssinaturaAdapter(provedor?: ProvedorAssinatura): AssinaturaAdapter {
  const p = provedor ?? 'interno'
  return adapters[p] ?? internoAdapter
}

export { type ProvedorAssinatura }