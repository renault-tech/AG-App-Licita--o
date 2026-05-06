'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { executarIAComCreditos } from '@/lib/ai/wrapper'
import type { ProcessoLicitatorioRow, TermoReferenciaRow } from '@/types/database'

export async function obterTR(processoId: string) {
  const supabase = await createClient()

  const { data } = await supabase
    .from('termo_referencia')
    .select('*')
    .eq('processo_id', processoId)
    .maybeSingle()

  if (data) return data as TermoReferenciaRow

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: pRaw } = await supabase
    .from('processos_licitatorios')
    .select('organizacao_id')
    .eq('id', processoId)
    .maybeSingle()

  const p = pRaw as Pick<ProcessoLicitatorioRow, 'organizacao_id'> | null
  if (!p) return null

  const supabaseAny = supabase as any
  const { data: nova } = await supabaseAny
    .from('termo_referencia')
    .insert({
      processo_id: processoId,
      organizacao_id: p.organizacao_id,
      criado_por: user.id,
      status: 'rascunho',
      gerado_por_ia: false,
    })
    .select('*')
    .single()

  return (nova ?? null) as TermoReferenciaRow | null
}

export async function atualizarTR(trId: string, dados: Partial<TermoReferenciaRow>) {
  const supabase = await createClient()
  const supabaseAny = supabase as any

  const { error } = await supabaseAny
    .from('termo_referencia')
    .update({ ...dados, updated_at: new Date().toISOString() })
    .eq('id', trId)

  if (error) return { success: false as const, error: error.message as string }

  revalidatePath('/dashboard')
  return { success: true as const }
}

export async function aprimorarTRComIA(textoOriginal: string, campo: string) {
  if (!textoOriginal) return { success: false as const, error: 'Texto vazio.' }

  const prompt = `Você é um especialista em licitações públicas (Lei 14.133/21).
Aprimore o texto abaixo para um Termo de Referência (TR).
Seção do TR: ${campo}
Texto original: "${textoOriginal}"

Retorne APENAS o texto aprimorado final, redigido de forma clara, técnica, objetiva e formal (linguagem governamental).
Sem introduções, sem aspas, focado puramente no conteúdo.`

  return executarIAComCreditos({ prompt, tipoAcao: 'aprimorar_texto', temperature: 0.2 })
}
