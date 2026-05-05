import type { AIAdapter, AIRequestOptions, AIResponse } from '../types'

const OPENROUTER_URL = 'https://openrouter.ai/api/v1/chat/completions'
// Modelo gratuito no OpenRouter - pode ser trocado por variável de ambiente
const MODEL = process.env.OPENROUTER_MODEL ?? 'meta-llama/llama-3.3-70b-instruct:free'

export const openrouterAdapter: AIAdapter = {
  provider: 'openrouter',
  model: MODEL,

  async generate({ prompt, systemPrompt, maxTokens = 2048, temperature = 0.3 }: AIRequestOptions): Promise<AIResponse> {
    const apiKey = process.env.OPENROUTER_API_KEY
    if (!apiKey) throw new Error('OPENROUTER_API_KEY não configurada')

    const messages: { role: string; content: string }[] = []
    if (systemPrompt) messages.push({ role: 'system', content: systemPrompt })
    messages.push({ role: 'user', content: prompt })

    const res = await fetch(OPENROUTER_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_APP_URL ?? 'http://localhost:3000',
        'X-Title': 'LicitaIA',
      },
      body: JSON.stringify({ model: MODEL, messages, max_tokens: maxTokens, temperature }),
    })

    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error?.message ?? 'Erro na API OpenRouter')
    }

    const data = await res.json()
    const text = data.choices?.[0]?.message?.content ?? ''
    const usage = data.usage ?? {}

    return {
      text: text.trim(),
      tokensIn: usage.prompt_tokens ?? 0,
      tokensOut: usage.completion_tokens ?? 0,
      provider: 'openrouter',
      model: MODEL,
    }
  },
}
