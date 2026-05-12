import type { AIAdapter, AIProvider, AIRequestOptions, AIResponse } from './types'
import { geminiAdapter } from './adapters/gemini'
import { groqAdapter } from './adapters/groq'
import { anthropicAdapter } from './adapters/anthropic'
import { openrouterAdapter } from './adapters/openrouter'

const adapters: Record<AIProvider, AIAdapter> = {
  gemini: geminiAdapter,
  groq: groqAdapter,
  anthropic: anthropicAdapter,
  openrouter: openrouterAdapter,
}

function getActiveAdapter(providerOverride?: AIProvider): AIAdapter {
  const provider = (providerOverride ?? process.env.AI_PROVIDER ?? 'gemini') as AIProvider
  const adapter = adapters[provider]
  if (!adapter) throw new Error(`Provedor de IA desconhecido: ${provider}`)
  return adapter
}

export async function gerarTextoIA(options: AIRequestOptions): Promise<AIResponse> {
  const adapter = getActiveAdapter(options.provider)
  return adapter.generate(options)
}

export function getProviderInfo(providerOverride?: AIProvider): { provider: AIProvider; model: string } {
  const adapter = getActiveAdapter(providerOverride)
  return { provider: adapter.provider, model: adapter.model }
}
