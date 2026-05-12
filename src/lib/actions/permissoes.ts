'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { TABS_VISIVEIS_POR_PAPEL } from '@/lib/permissions'
import type { PapelUsuario } from '@/types/database'

export type ItemPermissao = {
  tab_slug: string
  pode_ver: boolean
  pode_editar: boolean
}

export type DadosPermissaoPapel = {
  permissoes: ItemPermissao[]
  customizado: boolean
}

const ALL_TABS = [
  'dfd', 'cotacao', 'etp', 'tr', 'riscos', 'edital',
  'revisao', 'parecer', 'autorizacao', 'publicacao',
] as const

const PAPEIS_CONFIGURÁVEIS: PapelUsuario[] = [
  'requisitante', 'setor_licitacao', 'procurador', 'autoridade_competente',
]

function permissoesPadrao(papel: string): ItemPermissao[] {
  const tabsVisiveis = TABS_VISIVEIS_POR_PAPEL[papel] ?? []
  return ALL_TABS.map(slug => ({
    tab_slug: slug,
    pode_ver: tabsVisiveis.includes(slug),
    pode_editar: tabsVisiveis.includes(slug),
  }))
}

export async function obterTodasPermissoesOrg(): Promise<Record<string, DadosPermissaoPapel>> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return {}

  const { data: usuarioData } = await supabase
    .from('usuarios')
    .select('organizacao_id')
    .eq('id', user.id)
    .maybeSingle()

  if (!usuarioData) return {}

  const orgId = (usuarioData as any).organizacao_id as string

  const { data: rows } = await (supabase.from('permissoes_papel_organizacao') as any)
    .select('papel, tab_slug, pode_ver, pode_editar')
    .eq('organizacao_id', orgId)
    .in('papel', PAPEIS_CONFIGURÁVEIS)

  const rowsPorPapel = new Map<string, Array<{ tab_slug: string; pode_ver: boolean; pode_editar: boolean }>>()
  for (const row of (rows ?? []) as any[]) {
    if (!rowsPorPapel.has(row.papel)) rowsPorPapel.set(row.papel, [])
    rowsPorPapel.get(row.papel)!.push(row)
  }

  const resultado: Record<string, DadosPermissaoPapel> = {}
  for (const papel of PAPEIS_CONFIGURÁVEIS) {
    const papelRows = rowsPorPapel.get(papel) ?? []
    const customizado = papelRows.length > 0

    if (!customizado) {
      resultado[papel] = { permissoes: permissoesPadrao(papel), customizado: false }
      continue
    }

    const rowMap = new Map(papelRows.map(r => [r.tab_slug, r]))
    resultado[papel] = {
      customizado: true,
      permissoes: ALL_TABS.map(slug => {
        const row = rowMap.get(slug)
        return {
          tab_slug: slug,
          pode_ver: row?.pode_ver ?? false,
          pode_editar: row?.pode_editar ?? false,
        }
      }),
    }
  }

  return resultado
}

export async function salvarPermissoesPapel(
  papel: PapelUsuario,
  permissoes: ItemPermissao[],
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Nao autenticado' }

  const { data: usuarioData } = await supabase
    .from('usuarios')
    .select('organizacao_id, papel')
    .eq('id', user.id)
    .maybeSingle()

  if (!usuarioData) return { success: false, error: 'Usuario nao encontrado' }

  if (!['admin_organizacao', 'admin_plataforma'].includes((usuarioData as any).papel)) {
    return { success: false, error: 'Permissao insuficiente' }
  }

  const orgId = (usuarioData as any).organizacao_id

  const rows = permissoes.map(p => ({
    organizacao_id: orgId,
    papel,
    tab_slug: p.tab_slug,
    pode_ver: p.pode_ver,
    // editavel requer visivel — invariante garantido no servidor
    pode_editar: p.pode_editar && p.pode_ver,
  }))

  const { error } = await (supabase.from('permissoes_papel_organizacao') as any)
    .upsert(rows, { onConflict: 'organizacao_id,papel,tab_slug' })

  if (error) return { success: false, error: error.message }

  revalidatePath('/configuracoes/permissoes')
  return { success: true }
}

export async function restaurarPadraoPermissoesPapel(
  papel: PapelUsuario,
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Nao autenticado' }

  const { data: usuarioData } = await supabase
    .from('usuarios')
    .select('organizacao_id, papel')
    .eq('id', user.id)
    .maybeSingle()

  if (!usuarioData) return { success: false, error: 'Usuario nao encontrado' }

  if (!['admin_organizacao', 'admin_plataforma'].includes((usuarioData as any).papel)) {
    return { success: false, error: 'Permissao insuficiente' }
  }

  // Deleta as linhas customizadas — runtime volta a usar os padroes de permissions.ts
  const { error } = await (supabase.from('permissoes_papel_organizacao') as any)
    .delete()
    .eq('organizacao_id', (usuarioData as any).organizacao_id)
    .eq('papel', papel)

  if (error) return { success: false, error: error.message }

  revalidatePath('/configuracoes/permissoes')
  return { success: true }
}