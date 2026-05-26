'use server'

import { createClient } from '@/lib/supabase/server'
import { labelAcao } from '@/lib/audit/labels'

export interface FiltrosAudit {
  de?:         string
  ate?:        string
  usuarioId?:  string
  categoria?:  string
}

export async function exportarAuditoriaCsv(
  filtros: FiltrosAudit
): Promise<{ success: boolean; csv?: string; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Nao autenticado.' }

  const { data: usuarioData } = await supabase
    .from('usuarios')
    .select('papel, organizacao_id')
    .eq('id', user.id)
    .maybeSingle()

  const u = usuarioData as any
  if (!u || !['admin_organizacao', 'admin_plataforma'].includes(u.papel)) {
    return { success: false, error: 'Sem permissao.' }
  }

  const de  = filtros.de  ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const ate = filtros.ate ?? new Date().toISOString()

  let query = (supabase as any)
    .from('audit_log')
    .select('created_at, nome_usuario, papel_usuario, categoria, acao, recurso_desc, detalhes')
    .eq('organizacao_id', u.organizacao_id)
    .gte('created_at', de)
    .lte('created_at', ate + 'T23:59:59Z')
    .order('created_at', { ascending: false })
    .limit(10000)

  if (filtros.usuarioId) query = query.eq('usuario_id', filtros.usuarioId)
  if (filtros.categoria) query = query.eq('categoria', filtros.categoria)

  const { data: rows, error } = await query
  if (error) return { success: false, error: error.message }

  const linhas = (rows as any[]).map(r => {
    const dt   = new Date(r.created_at)
    const data = dt.toLocaleDateString('pt-BR')
    const hora = dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    const det  = r.detalhes ? JSON.stringify(r.detalhes) : ''
    return [
      data,
      hora,
      escapeCsv(r.nome_usuario),
      escapeCsv(r.papel_usuario),
      escapeCsv(r.categoria),
      escapeCsv(labelAcao(r.acao)),
      escapeCsv(r.recurso_desc ?? ''),
      escapeCsv(det),
    ].join(',')
  })

  const cabecalho = 'Data,Hora,Usuario,Papel,Categoria,Acao,Recurso,Detalhes'
  const csv = [cabecalho, ...linhas].join('\n')

  return { success: true, csv }
}

function escapeCsv(value: string): string {
  if (value.includes(',') || value.includes('"') || value.includes('\n')) {
    return `"${value.replace(/"/g, '""')}"`
  }
  return value
}
