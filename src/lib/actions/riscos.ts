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

export async function sugerirRiscosIA(objeto: string) {
  if (!objeto) return { success: false as const, error: 'Objeto vazio.' }

  const prompt = `Você é um pregoeiro/especialista em licitações públicas (Lei 14.133/21).
Gere de 3 a 5 riscos inerentes à seguinte contratação/aquisição: "${objeto}".
Para cada risco, defina a probabilidade (Baixa, Média, Alta), o impacto (Baixo, Médio, Alto) e a mitigação.
Retorne EXCLUSIVAMENTE um array JSON com objetos. Sem formatação markdown (\`\`\`json), apenas o array puro.
Formato exato de cada objeto:
{"id": "uuid_unico", "identificacao": "descrição do risco", "probabilidade": "Média", "impacto": "Alto", "mitigacao": "ação de contingência/prevenção"}`

  const resultado = await executarIAComCreditos({
    prompt,
    tipoAcao: 'sugerir_conteudo',
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
