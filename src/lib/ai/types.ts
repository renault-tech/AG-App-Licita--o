export type AIProvider = 'gemini' | 'groq' | 'anthropic' | 'openrouter'

export interface AIRequestOptions {
  prompt: string
  systemPrompt?: string
  maxTokens?: number
  temperature?: number
  provider?: AIProvider
}

export interface AIResponse {
  text: string
  tokensIn: number
  tokensOut: number
  provider: AIProvider
  model: string
}

export interface AIAdapter {
  provider: AIProvider
  model: string
  generate(options: AIRequestOptions): Promise<AIResponse>
}
