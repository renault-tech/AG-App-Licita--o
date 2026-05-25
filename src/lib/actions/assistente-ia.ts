'use server'

import { createClient } from '@/lib/supabase/server'
import type { MensagemAssistente } from '@/types/chat'

const CUSTO_ASSISTENTE_CREDITOS = 2

const SYSTEM_PROMPT = `Voce e um assistente juridico especializado na Lei Federal 14.133/21 (Nova Lei de Licitacoes e Contratos Administrativos). Voce ajuda os servidores publicos a entender e conduzir processos licitatorios corretamente.

Regras:
- Responda sempre em portugues formal institucional
- Nunca invente dados, numeros de processo, valores ou CNPJs
- Sempre cite o artigo da lei quando aplicavel
- Seja conciso e direto
- Quando nao souber, diga que nao sabe e sugira consultar a procuradoria
- Use "Conforme Art. X da Lei 14.133/21" para referencias legais`

export async function enviarMensagemAssistente(
  processoId: string,
  mensagemUsuario: string,
): Promise<{ success: boolean; resposta?: string; error?: string }> {
  const texto = mensagemUsuario.trim()
  if (!texto || texto.length > 2000) {
    return { success: false, error: 'Mensagem invalida' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Nao autenticado' }

  const { data: creditos } = await (supabase as any)
    .from('creditos_usuario')
    .select('saldo')
    .eq('usuario_id', user.id)
    .maybeSingle()

  if (!creditos || (creditos as any).saldo < CUSTO_ASSISTENTE_CREDITOS) {
    return { success: false, error: 'Saldo insuficiente de creditos' }
  }

  const { data: processo } = await (supabase as any)
    .from('processos_licitatorios')
    .select('objeto, modalidade, status, numero_processo, valor_estimado, etapa_atual')
    .eq('id', processoId)
    .maybeSingle()

  if (!processo) return { success: false, error: 'Processo nao encontrado' }

  const { data: conversa } = await (supabase as any)
    .from('conversas_assistente')
    .select('historico')
    .eq('processo_id', processoId)
    .eq('usuario_id', user.id)
    .maybeSingle()

  const historico: MensagemAssistente[] = (conversa as any)?.historico ?? []

  const contextoProcesso = `
Processo em analise:
- Objeto: ${(processo as any).objeto}
- Modalidade: ${(processo as any).modalidade}
- Numero: ${(processo as any).numero_processo ?? 'nao definido'}
- Status: ${(processo as any).status}
- Etapa atual: ${(processo as any).etapa_atual ?? 'nao definida'}
- Valor estimado: ${(processo as any).valor_estimado ? `R$ ${Number((processo as any).valor_estimado).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'nao informado'}
`

  const mensagensApi = [
    ...historico.map(m => ({ role: m.role, content: m.content })),
    { role: 'user' as const, content: texto },
  ]

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return { success: false, error: 'Servico de IA nao configurado' }

  let resposta: string
  try {
    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 1024,
        system: `${SYSTEM_PROMPT}\n\n${contextoProcesso}`,
        messages: mensagensApi,
      }),
    })

    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      return { success: false, error: (err as any).error?.message ?? 'Erro na API de IA' }
    }

    const json = await res.json()
    resposta = json.content?.[0]?.text ?? ''
    if (!resposta) return { success: false, error: 'Resposta vazia da IA' }
  } catch {
    return { success: false, error: 'Erro de conexao com a IA' }
  }

  const novoHistorico: MensagemAssistente[] = ([
    ...historico,
    { role: 'user' as const, content: texto, timestamp: new Date().toISOString() },
    { role: 'assistant' as const, content: resposta, timestamp: new Date().toISOString() },
  ] as MensagemAssistente[]).slice(-20)

  await (supabase as any)
    .from('conversas_assistente')
    .upsert({
      processo_id: processoId,
      usuario_id: user.id,
      historico: novoHistorico,
      atualizado_em: new Date().toISOString(),
    })

  await (supabase as any)
    .from('creditos_usuario')
    .update({ saldo: (creditos as any).saldo - CUSTO_ASSISTENTE_CREDITOS })
    .eq('usuario_id', user.id)

  await (supabase as any)
    .from('acoes_ia')
    .insert({
      usuario_id: user.id,
      acao_tipo: 'sugerir_conteudo',
      contexto: { processo_id: processoId, tipo: 'assistente' },
      creditos_consumidos: CUSTO_ASSISTENTE_CREDITOS,
    })

  return { success: true, resposta }
}

export async function buscarHistoricoAssistente(
  processoId: string,
): Promise<MensagemAssistente[]> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await (supabase as any)
    .from('conversas_assistente')
    .select('historico')
    .eq('processo_id', processoId)
    .eq('usuario_id', user.id)
    .maybeSingle()

  return (data as any)?.historico ?? []
}

export async function limparHistoricoAssistente(
  processoId: string,
): Promise<void> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  await (supabase as any)
    .from('conversas_assistente')
    .update({ historico: [], atualizado_em: new Date().toISOString() })
    .eq('processo_id', processoId)
    .eq('usuario_id', user.id)
}
