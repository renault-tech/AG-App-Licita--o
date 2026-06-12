'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { executarIAComCreditos } from '@/lib/ai/wrapper'
import type { ProcessoLicitatorioRow } from '@/types/database'

export interface RiscoItem {
  id: string
  identificacao: string
  probabilidade: 'Baixa' | 'Média' | 'Alta'
  impacto: 'Baixo' | 'Médio' | 'Alto'
  mitigacao: string
}

export async function obterMapaRiscos(processoId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('mapa_riscos')
    .select('*, processos_licitatorios(objeto)')
    .eq('processo_id', processoId)
    .maybeSingle()

  if (data) return data

  const { data: pRaw } = await supabase
    .from('processos_licitatorios')
    .select('organizacao_id')
    .eq('id', processoId)
    .maybeSingle()

  const p = pRaw as Pick<ProcessoLicitatorioRow, 'organizacao_id'> | null
  if (!p) return null

  const supabaseAny = supabase as any
  const { data: novo } = await supabaseAny
    .from('mapa_riscos')
    .insert({
      processo_id: processoId,
      organizacao_id: p.organizacao_id,
      criado_por: user.id,
      riscos: [],
      status: 'rascunho',
      gerado_por_ia: false,
    })
    .select('*, processos_licitatorios(objeto)')
    .single()

  return novo ?? null
}

export async function atualizarMapaRiscos(mapaId: string, riscos: RiscoItem[]) {
  const supabase = await createClient()
  const supabaseAny = supabase as any

  const { error } = await supabaseAny
    .from('mapa_riscos')
    .update({ riscos, updated_at: new Date().toISOString() })
    .eq('id', mapaId)

  if (error) return { success: false as const, error: error.message as string }

  revalidatePath('/dashboard')
  return { success: true as const }
}

export async function sugerirRiscosIA(objeto: string, processoId?: string) {
  if (!objeto) return { success: false as const, error: 'Objeto vazio.' }

  // Enriquecer o prompt com dados reais do processo quando disponiveis
  let contextoProcesso = ''
  if (processoId) {
    const supabase = await createClient()
    const { data: procRaw } = await supabase
      .from('processos_licitatorios')
      .select('modalidade, valor_estimado, prazo_dias')
      .eq('id', processoId)
      .maybeSingle()
    const proc = procRaw as { modalidade: string | null; valor_estimado: number | null; prazo_dias: number | null } | null
    if (proc) {
      contextoProcesso = `
<contexto_processo>
  ${proc.modalidade ? `<modalidade>${proc.modalidade}</modalidade>` : ''}
  ${proc.valor_estimado ? `<valor_estimado>R$ ${proc.valor_estimado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</valor_estimado>` : ''}
  ${proc.prazo_dias ? `<prazo>${proc.prazo_dias} dias</prazo>` : ''}
</contexto_processo>`
    }
  }

  const prompt = `<instrucoes>
Voce e um especialista em gestao de riscos de contratacoes publicas (Lei 14.133/21).
Elabore a matriz de riscos da contratacao conforme o Art. 22 da Lei 14.133/21, que exige a identificacao dos riscos que possam comprometer a licitacao ou a execucao contratual, com tratamento e alocacao adequados.
Considere riscos das tres fases: planejamento da contratacao, selecao do fornecedor e execucao contratual (incluindo riscos de mercado, de inexecucao, de variacao de precos e operacionais).
Pondere probabilidade e impacto de forma consistente com a modalidade e o valor informados, quando disponiveis.
</instrucoes>

<objeto_contratacao>${objeto}</objeto_contratacao>
${contextoProcesso}

<formato_saida>
Gere de 4 a 6 riscos. Retorne EXCLUSIVAMENTE um array JSON com objetos, sem formatacao markdown (sem \`\`\`json), apenas o array puro.
A mitigacao deve ser uma acao concreta e atribuivel (quem faz o que), nao uma frase generica.
Formato exato de cada objeto:
{"id": "uuid_unico", "identificacao": "descricao objetiva do risco", "probabilidade": "Baixa|Média|Alta", "impacto": "Baixo|Médio|Alto", "mitigacao": "acao concreta de prevencao ou contingencia"}
</formato_saida>`

  const resultado = await executarIAComCreditos({
    prompt,
    tipoAcao: 'sugerir_conteudo',
    processoId,
    temperature: 0.2,
  })

  if (!resultado.success) return resultado

  try {
    const clean = resultado.texto.replace(/```json/g, '').replace(/```/g, '').trim()
    const riscos = JSON.parse(clean) as RiscoItem[]
    return { success: true as const, riscos }
  } catch {
    return { success: false as const, error: 'Resposta da IA em formato inválido.' }
  }
}
