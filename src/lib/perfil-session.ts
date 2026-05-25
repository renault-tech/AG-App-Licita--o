'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { PapelUsuario } from '@/types/database'

const COOKIE_PERFIL_ATIVO = 'licitaia_perfil_ativo'

export async function obterPerfilAtivo(): Promise<PapelUsuario | null> {
  const cookieStore = await cookies()
  return (cookieStore.get(COOKIE_PERFIL_ATIVO)?.value ?? null) as PapelUsuario | null
}

export async function trocarPerfilAtivo(novoPapel: PapelUsuario | null): Promise<{ success: boolean }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false }

  const { data } = await supabase
    .from('usuarios')
    .select('papel')
    .eq('id', user.id)
    .single()

  const papelReal = (data as { papel: PapelUsuario } | null)?.papel ?? null

  const autorizado =
    papelReal === 'admin_plataforma' ||
    (papelReal === 'admin_organizacao' && await _adminOrgPodeTrocar())

  if (!autorizado) return { success: false }

  const cookieStore = await cookies()
  if (novoPapel === null || novoPapel === papelReal) {
    cookieStore.delete(COOKIE_PERFIL_ATIVO)
  } else {
    cookieStore.set(COOKIE_PERFIL_ATIVO, novoPapel, {
      path: '/',
      httpOnly: false,
      sameSite: 'lax',
    })
  }

  revalidatePath('/', 'layout')
  return { success: true }
}

async function _adminOrgPodeTrocar(): Promise<boolean> {
  const supabase = await createClient()
  const { data } = await (supabase as any)
    .from('configuracoes_plataforma')
    .select('valor')
    .eq('chave', 'admin_org_pode_trocar_perfil')
    .maybeSingle()
  return (data as any)?.valor === 'true'
}
