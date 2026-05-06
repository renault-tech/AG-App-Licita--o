import type { AIAdapter, AIRequestOptions, AIResponse } from '../types'

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'
const MODEL = 'llama-3.3-70b-versatile'

export const groqAdapter: AIAdapter = {
  provider: 'groq',
  model: MODEL,

  async generate({ prompt, systemPrompt, maxTokens = 2048, temperature = 0.3 }: AIRequestOptions): Promise<AIResponse> {
    const apiKey = process.env.GROQ_API_KEY
    if (!apiKey) throw new Error('GROQ_API_KEY não configurada')

    const messages: { role: string; content: string }[] = []
    if (systemPrompt) messages.push({ role: 'system', content: systemPrompt })
    messages.push({ role: 'user', content: prompt })

    const res = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({ model: MODEL, messages, max_tokens: maxTokens, temperature }),
    })

    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error?.message ?? 'Erro na API Groq')
    }

    const data = await res.json()
    const text = data.choices?.[0]?.message?.content ?? ''
    const usage = data.usage ?? {}

    return {
      text: text.trim(),
      tokensIn: usage.prompt_tokens ?? 0,
      tokensOut: usage.completion_tokens ?? 0,
      provider: 'groq',
      model: MODEL,
    }
  },
}
