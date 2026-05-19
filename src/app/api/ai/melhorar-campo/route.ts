import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildPromptMelhorarCampo, type ContextoCampo } from '@/lib/ai/prompts/melhorar-campo'

const ANTHROPIC_URL = 'https://api.anthropic.com/v1/messages'

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return new Response('Nao autorizado', { status: 401 })
  }

  const { data: usuario } = await (supabase as any)
    .from('usuarios')
    .select('id, organizacao_id')
    .eq('id', user.id)
    .maybeSingle()

  if (!usuario) return new Response('Nao autorizado', { status: 401 })

  let ctx: ContextoCampo
  try {
    ctx = await req.json()
  } catch {
    return new Response('Payload invalido', { status: 400 })
  }

  if (!ctx.textoAtual || ctx.textoAtual.trim().length === 0) {
    return new Response('Texto vazio nao pode ser melhorado', { status: 400 })
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return new Response('IA nao configurada', { status: 503 })

  const prompt = buildPromptMelhorarCampo(ctx)

  const upstream = await fetch(ANTHROPIC_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      stream: true,
      messages: [{ role: 'user', content: prompt }],
    }),
  })

  if (!upstream.ok || !upstream.body) {
    const err = await upstream.text()
    return new Response(err || 'Erro na API Anthropic', { status: upstream.status })
  }

  // Transpoe o SSE da Anthropic extraindo apenas os deltas de texto
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()
      const reader = upstream.body!.getReader()
      const decoder = new TextDecoder()
      let textoCompleto = ''
      let buffer = ''

      try {
        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buffer += decoder.decode(value, { stream: true })
          const lines = buffer.split('\n')
          buffer = lines.pop() ?? ''

          for (const line of lines) {
            if (!line.startsWith('data: ')) continue
            const data = line.slice(6).trim()
            if (data === '[DONE]') continue
            try {
              const parsed = JSON.parse(data)
              if (parsed.type === 'content_block_delta' && parsed.delta?.type === 'text_delta') {
                const text = parsed.delta.text as string
                textoCompleto += text
                controller.enqueue(encoder.encode(text))
              }
            } catch {
              // ignora linhas nao JSON
            }
          }
        }

        // Registra uso sem bloquear o stream
        await (supabase as any).from('acoes_ia').insert({
          usuario_id: usuario.id,
          organizacao_id: usuario.organizacao_id,
          tipo_acao: 'aprimorar_texto',
          modelo: 'claude-sonnet-4-6',
          input_resumo: ctx.textoAtual.slice(0, 200),
          output_resumo: textoCompleto.slice(0, 200),
          tokens_input: Math.ceil(prompt.length / 4),
          tokens_output: Math.ceil(textoCompleto.length / 4),
        }).catch(() => {})

        controller.close()
      } catch (err) {
        controller.error(err)
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Transfer-Encoding': 'chunked',
      'X-Content-Type-Options': 'nosniff',
    },
  })
}
