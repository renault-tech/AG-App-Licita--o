'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import type { ConfiguracaoPlataformaRow } from '@/types/database'

export async function obterConfiguracoes(): Promise<Record<string, string>> {
  const supabase = await createClient()
  const { data } = await (supabase as any)
    .from('configuracoes_plataforma')
    .select('chave, valor')

  const resultado: Record<string, string> = {}
  for (const row of data ?? []) {
    resultado[row.chave] = row.valor
  }
  return resultado
}

const SchemaConfig = z.object({
  prazo_urgencia_parecer_dias: z.number().int().min(1).max(365),
  prazo_alerta_parecer_dias:   z.number().int().min(1).max(365),
}).refine(
  (d) => d.prazo_urgencia_parecer_dias < d.prazo_alerta_parecer_dias,
  { message: 'Prazo de urgencia deve ser menor que prazo de alerta.' }
)

export async function salvarConfiguracoes(
  input: { prazo_urgencia_parecer_dias: number; prazo_alerta_parecer_dias: number }
): Promise<{ success: boolean; error?: string }> {
  const parsed = SchemaConfig.safeParse(input)
  if (!parsed.success) {
    return { success: false, error: parsed.error.issues[0].message }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Nao autenticado.' }

  const updates: Array<Partial<ConfiguracaoPlataformaRow>> = [
    { chave: 'prazo_urgencia_parecer_dias', valor: String(parsed.data.prazo_urgencia_parecer_dias), updated_by: user.id, updated_at: new Date().toISOString() },
    { chave: 'prazo_alerta_parecer_dias',   valor: String(parsed.data.prazo_alerta_parecer_dias),   updated_by: user.id, updated_at: new Date().toISOString() },
  ]

  for (const update of updates) {
    const { error } = await (supabase as any)
      .from('configuracoes_plataforma')
      .update(update)
      .eq('chave', update.chave)

    if (error) return { success: false, error: error.message }
  }

  revalidatePath('/admin/configuracoes-plataforma')
  return { success: true }
}
