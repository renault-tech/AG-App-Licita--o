'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const salvarPreferenciaSchema = z.object({
  configKey: z.string().min(1),
  configValue: z.record(z.string(), z.unknown()),
})

export async function salvarPreferenciaDashboard(
  configKey: string,
  configValue: Record<string, unknown>
): Promise<{ success: boolean; error?: string }> {
  const parsed = salvarPreferenciaSchema.safeParse({ configKey, configValue })
  if (!parsed.success) {
    const issues = parsed.error.issues
    return { success: false, error: issues[0]?.message ?? 'Dados invalidos.' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Nao autenticado.' }

  const { data: usuarioData, error: usuarioError } = await supabase
    .from('usuarios')
    .select('organizacao_id')
    .eq('id', user.id)
    .maybeSingle()

  if (usuarioError || !usuarioData) {
    return { success: false, error: 'Organizacao nao encontrada.' }
  }

  const u = usuarioData as { organizacao_id: string }

  const { error } = await (supabase as any)
    .from('dashboard_preferencias')
    .upsert(
      {
        usuario_id: user.id,
        organizacao_id: u.organizacao_id,
        config_key: parsed.data.configKey,
        config_value: parsed.data.configValue,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'usuario_id,config_key' }
    )

  if (error) return { success: false, error: error.message }

  revalidatePath('/dashboard')
  return { success: true }
}

export async function buscarPreferenciaDashboard(
  configKey: string,
  defaultValue: Record<string, unknown>
): Promise<Record<string, unknown>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return defaultValue

  const { data, error } = await (supabase as any)
    .from('dashboard_preferencias')
    .select('config_value')
    .eq('usuario_id', user.id)
    .eq('config_key', configKey)
    .maybeSingle()

  if (error || !data) return defaultValue

  return (data as { config_value: Record<string, unknown> }).config_value ?? defaultValue
}

