import { cache } from 'react'
import { obterTodasPermissoesOrg } from './actions/permissoes'
import type { DadosPermissaoPapel } from './actions/permissoes'

// Deduplica chamadas ao banco dentro do mesmo render tree (layout + paginas rodam no mesmo request)
export const getPermissoesOrg = cache(
  (): Promise<Record<string, DadosPermissaoPapel>> => obterTodasPermissoesOrg()
)

export function resolverPodeEditar(
  permissoes: Record<string, DadosPermissaoPapel>,
  papel: string | null | undefined,
  tabSlug: string,
): boolean {
  if (!papel) return false
  // Admins tem acesso completo sempre
  if (['admin_organizacao', 'admin_plataforma'].includes(papel)) return true
  // Fallback true quando o banco nao tem dados para o papel (fail open)
  return permissoes[papel]?.permissoes.find(p => p.tab_slug === tabSlug)?.pode_editar ?? true
}