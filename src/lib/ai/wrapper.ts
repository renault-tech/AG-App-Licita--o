'use server'

import { createClient } from '@/lib/supabase/server'
import type { TipoAcaoIA, UsuarioRow, CreditosUsuarioRow, AcaoIARow } from '@/types/database'

export interface RequestIA {
  prompt: string
  tipoAcao: TipoAcaoIA
  processoId?: string
  temperature?: number
}

export interface ResultadoIA {
  success: true
  texto: string
}

export interface ErroIA {
  success: false
  error: string
}

async function chamarGroq(prompt: string, temperature: number): Promise<string> {
  const apiKey = process.env.GROQ_API_KEY
  if (!apiKey) throw new Error('GROQ_API_KEY não configurada.')

  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [{ role: 'user', content: prompt }],
      temperature,
      max_tokens: 4096,
    }),
  })

  if (!res.ok) {
    const errBody = await res.text()
    throw new Error(`API Groq retornou ${res.status}: ${errBody}`)
  }

  const data = await res.json()
  const texto: string | undefined = data?.choices?.[0]?.message?.content
  if (!texto) throw new Error('Resposta vazia da IA.')
  return texto.trim()
}

export async function executarIAComCreditos(
  params: RequestIA
): Promise<ResultadoIA | ErroIA> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Usuário não autenticado.' }

  const { data: usuarioRaw } = await supabase
    .from('usuarios')
    .select('organizacao_id')
    .eq('id', user.id)
    .single()

  const usuario = usuarioRaw as Pick<UsuarioRow, 'organizacao_id'> | null
  if (!usuario) return { success: false, error: 'Perfil de usuário não encontrado.' }

  const organizacaoId = usuario.organizacao_id

  // Verificar ou criar saldo de créditos
  const { data: creditosRaw } = await supabase
    .from('creditos_usuario')
    .select('id, saldo')
    .eq('usuario_id', user.id)
    .single()

  type CreditosSaldo = Pick<CreditosUsuarioRow, 'id' | 'saldo'>
  let creditos = creditosRaw as CreditosSaldo | null

  if (!creditos) {
    const supabaseAny = supabase as any
    const { data: novoRaw } = await supabaseAny
      .from('creditos_usuario')
      .insert({ usuario_id: user.id, organizacao_id: organizacaoId, saldo: 500 })
      .select('id, saldo')
      .single()
    creditos = novoRaw as CreditosSaldo | null
  }

  if (!creditos || creditos.saldo <= 0) {
    return {
      success: false,
      error: 'Saldo de créditos insuficiente. Adquira mais créditos para continuar.',
    }
  }

  const temperature = params.temperature ?? 0.3
  let texto = ''
  let sucesso = false
  let erroMensagem: string | null = null
  let creditosDebitar = 1

  try {
    texto = await chamarGroq(params.prompt, temperature)
    sucesso = true
  } catch (err) {
    erroMensagem = err instanceof Error ? err.message : 'Falha de comunicação.'
    creditosDebitar = 0
  }

  // Registrar ação de IA (fire-and-forget)
  const supabaseAny = supabase as any
  supabaseAny
    .from('acoes_ia')
    .insert({
      usuario_id: user.id,
      organizacao_id: organizacaoId,
      processo_id: params.processoId ?? null,
      tipo_acao: params.tipoAcao,
      provedor: 'groq',
      modelo: 'llama-3.3-70b-versatile',
      tokens_entrada: params.prompt.length,
      tokens_saida: texto.length,
      creditos_consumidos: creditosDebitar,
      input_resumo: params.prompt.substring(0, 100),
      sucesso,
      erro_mensagem: erroMensagem,
    } satisfies Omit<AcaoIARow, 'id' | 'created_at'>)
    .then(() => {})

  if (sucesso && creditosDebitar > 0) {
    await supabaseAny
      .from('creditos_usuario')
      .update({ saldo: creditos.saldo - creditosDebitar, updated_at: new Date().toISOString() })
      .eq('id', creditos.id)
  }

  if (!sucesso) return { success: false, error: erroMensagem ?? 'Falha interna.' }
  return { success: true, texto }
}
