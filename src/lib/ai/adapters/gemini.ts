import type { AIAdapter, AIRequestOptions, AIResponse } from '../types'

const GEMINI_URL = 'https://generativelanguage.googleapis.com/v1beta/models'
const MODEL = 'gemini-1.5-flash'

export const geminiAdapter: AIAdapter = {
  provider: 'gemini',
  model: MODEL,

  async generate({ prompt, systemPrompt, maxTokens = 2048, temperature = 0.3 }: AIRequestOptions): Promise<AIResponse> {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey) throw new Error('GEMINI_API_KEY não configurada')

    const contents = []
    const systemInstruction = systemPrompt ? { parts: [{ text: systemPrompt }] } : undefined

    contents.push({ role: 'user', parts: [{ text: prompt }] })

    const body: Record<string, unknown> = {
      contents,
      generationConfig: { temperature, maxOutputTokens: maxTokens },
    }
    if (systemInstruction) body.system_instruction = systemInstruction

    const res = await fetch(`${GEMINI_URL}/${MODEL}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })

    if (!res.ok) {
      const err = await res.json()
      throw new Error(err.error?.message ?? 'Erro na API Gemini')
    }

    const data = await res.json()
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
    const usage = data.usageMetadata ?? {}

    return {
      text: text.trim(),
      tokensIn: usage.promptTokenCount ?? 0,
      tokensOut: usage.candidatesTokenCount ?? 0,
      provider: 'gemini',
      model: MODEL,
    }
  },
}
