import type { AIAdapter, AIRequestOptions, AIResponse } from '../types'

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'
const MODEL = 'claude-sonnet-4-6'

export const anthropicAdapter: AIAdapter = {
  provider: 'anthropic',
  model: MODEL,

  async generate({ prompt, systemPrompt, maxTokens = 2048, temperature = 0.3 }: AIRequestOptions): Promise<AIResponse> {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) throw new Error('ANTHROPIC_API_KEY não configurada')

    const body: Record<string, unknown> = {
      model: MODEL,
      max_tokens: maxTokens,
      temperature,
      messages: [{ role: 'user', content: prompt }],
    }
    if (systemPrompt) body.system = systemPrompt

    const res = await fetch(ANTHROPIC_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error?.message ?? 'Erro na API Anthropic')
    }

    const data = await res.json()
    const text = data.content?.[0]?.text ?? ''
    const usage = data.usage ?? {}

    return {
      text: text.trim(),
      tokensIn: usage.input_tokens ?? 0,
      tokensOut: usage.output_tokens ?? 0,
      provider: 'anthropic',
      model: MODEL,
    }
  },
}
