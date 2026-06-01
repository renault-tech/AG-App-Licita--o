export const PACOTES_CREDITOS = [
  { id: 'pack_50',   creditos: 50,   preco_brl: 990,   label: 'R$ 9,90'   },
  { id: 'pack_200',  creditos: 200,  preco_brl: 2990,  label: 'R$ 29,90'  },
  { id: 'pack_500',  creditos: 500,  preco_brl: 5990,  label: 'R$ 59,90'  },
  { id: 'pack_1500', creditos: 1500, preco_brl: 14990, label: 'R$ 149,90' },
] as const

export type PacoteId = typeof PACOTES_CREDITOS[number]['id']

// Provedores cujo uso e gratuito (sem custo de API).
// Chamadas via esses provedores nao debitam creditos do usuario —
// apenas rate limiting se aplica.
export const PROVIDERS_GRATUITOS = ['gemini', 'groq'] as const
export type ProviderGratuito = typeof PROVIDERS_GRATUITOS[number]

export function isProviderGratuito(provider: string): boolean {
  return (PROVIDERS_GRATUITOS as readonly string[]).includes(provider)
}

// Creditos concedidos gratuitamente ao criar conta.
// Valem apenas para uso de providers pagos (Anthropic, OpenRouter).
export const CREDITOS_BOAS_VINDAS = 500
