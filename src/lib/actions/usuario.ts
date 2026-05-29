'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { PapelUsuario } from '@/types/database'
import { obterPerfilAtivo } from '@/lib/perfil-session'

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

/**
 * Retorna o papel efetivo do usuario, considerando o perfil simulado via profile switcher.
 * Use esta funcao em paginas de visibilidade de dados (listas, filtros).
 * Use obterPapelUsuario() para verificacoes de permissao real de escrita.
 */
export async function obterPapelEfetivo(): Promise<PapelUsuario | null> {
  const [papelReal, perfilCookie] = await Promise.all([
    obterPapelUsuario(),
    obterPerfilAtivo(),
  ])
  // admin_plataforma e admin_organizacao podem simular outros papeis via cookie
  const podeSimular = papelReal === 'admin_plataforma' || papelReal === 'admin_organizacao'
  return (podeSimular && perfilCookie) ? perfilCookie : papelReal
}

