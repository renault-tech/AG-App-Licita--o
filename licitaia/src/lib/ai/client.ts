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

function getActiveAdapter(): AIAdapter {
  const provider = (process.env.AI_PROVIDER ?? 'gemini') as AIProvider
  const adapter = adapters[provider]
  if (!adapter) throw new Error(`Provedor de IA desconhecido: ${provider}`)
  return adapter
}

export async function gerarTextoIA(options: AIRequestOptions): Promise<AIResponse> {
  const adapter = getActiveAdapter()
  return adapter.generate(options)
}

export function getProviderInfo(): { provider: AIProvider; model: string } {
  const adapter = getActiveAdapter()
  return { provider: adapter.provider, model: adapter.model }
}
