'use server'

import { createClient } from '@/lib/supabase/server'
import type { PapelUsuario } from '@/types/database'

export async function obterPapelUsuario(): Promise<PapelUsuario | null> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('usuarios')
    .select('papel')
    .eq('id', user.id)
    .maybeSingle()

  return (data as { papel: PapelUsuario } | null)?.papel ?? null
}
