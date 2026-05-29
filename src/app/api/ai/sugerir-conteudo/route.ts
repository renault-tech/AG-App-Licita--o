import { NextRequest } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { buildPromptSugerirConteudo, type ContextoSugestao } from '@/lib/ai/prompts/sugerir-conteudo'
import { gerarTextoIA } from '@/lib/ai/client'

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

  const { data: creditos } = await (supabase as any)
    .from('creditos_usuario')
    .select('id, saldo')
    .eq('usuario_id', usuario.id)
    .maybeSingle()

  if (!creditos || creditos.saldo <= 0) {
    return new Response('Saldo de creditos insuficiente. Adquira mais creditos para continuar.', { status: 402 })
  }

  let ctx: ContextoSugestao
  try {
    ctx = await req.json()
  } catch {
    return new Response('Payload invalido', { status: 400 })
  }

  if (!ctx.dadosProcesso?.objeto || ctx.dadosProcesso.objeto.trim().length < 5) {
    return new Response('Campo "Objeto" e obrigatorio para gerar sugestao.', { status: 400 })
  }

  const prompt = buildPromptSugerirConteudo(ctx)

  let textoGerado = ''
  let tokensIn = 0
  let tokensOut = 0

  try {
    const res = await gerarTextoIA({ prompt })
    textoGerado = res.text
    tokensIn = res.tokensIn
    tokensOut = res.tokensOut
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro ao chamar provedor de IA.'
    return new Response(msg, { status: 503 })
  }

  // Registra uso (fire-and-forget)
  await (supabase as any).from('acoes_ia').insert({
    usuario_id: usuario.id,
    organizacao_id: usuario.organizacao_id,
    tipo_acao: 'sugerir_conteudo',
    modelo: process.env.AI_PROVIDER ?? 'gemini',
    input_resumo: ctx.dadosProcesso.objeto.slice(0, 200),
    output_resumo: textoGerado.slice(0, 200),
    tokens_input: tokensIn || Math.ceil(prompt.length / 4),
    tokens_output: tokensOut || Math.ceil(textoGerado.length / 4),
  }).catch(() => {})

  // Debita 1 credito
  await (supabase as any)
    .from('creditos_usuario')
    .update({ saldo: creditos.saldo - 1, updated_at: new Date().toISOString() })
    .eq('id', creditos.id)
    .catch(() => {})

  // Retorna como stream para manter interface consistente com o cliente
  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(textoGerado))
      controller.close()
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
