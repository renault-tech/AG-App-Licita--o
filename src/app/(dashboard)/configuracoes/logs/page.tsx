import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ScrollText } from 'lucide-react'
import { labelAcao, LABEL_CATEGORIA } from '@/lib/audit/labels'
import FiltrosLog from './filtros-log'
import ExportarCsv from './exportar-csv'
import type { FiltrosAudit } from '@/lib/actions/audit'

const PAGE_SIZE = 20

interface Props {
  searchParams: Promise<{
    de?:         string
    ate?:        string
    usuario_id?: string
    categoria?:  string
    page?:       string
  }>
}

export default async function LogsPage({ searchParams }: Props) {
  const params = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: usuarioData } = await supabase
    .from('usuarios')
    .select('papel, organizacao_id')
    .eq('id', user.id)
    .maybeSingle()

  const u = usuarioData as any
  if (!u || !['admin_organizacao', 'admin_plataforma'].includes(u.papel)) {
    redirect('/configuracoes/ia')
  }

  const hoje  = new Date().toISOString().slice(0, 10)
  const haMes = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10)

  const de        = params.de          ?? haMes
  const ate       = params.ate         ?? hoje
  const usuId     = params.usuario_id
  const catFiltro = params.categoria
  const page      = Math.max(1, parseInt(params.page ?? '1', 10))
  const offset    = (page - 1) * PAGE_SIZE

  let query = (supabase as any)
    .from('audit_log')
    .select('id, created_at, nome_usuario, papel_usuario, categoria, acao, recurso_desc, detalhes', { count: 'exact' })
    .eq('organizacao_id', u.organizacao_id)
    .gte('created_at', de)
    .lte('created_at', ate + 'T23:59:59Z')
    .order('created_at', { ascending: false })
    .range(offset, offset + PAGE_SIZE - 1)

  if (usuId)      query = query.eq('usuario_id', usuId)
  if (catFiltro)  query = query.eq('categoria', catFiltro)

  const { data: logs, count } = await query
  const total   = count ?? 0
  const paginas = Math.ceil(total / PAGE_SIZE)
  const lista   = (logs as any[]) ?? []

  const { data: usuariosOrg } = await supabase
    .from('usuarios')
    .select('id, nome_completo')
    .eq('organizacao_id', u.organizacao_id)
    .eq('ativo', true)
    .order('nome_completo')

  const filtrosAtivos: FiltrosAudit = {
    de, ate, usuarioId: usuId, categoria: catFiltro,
  }

  const buildUrl = (overrides: Record<string, string | undefined>) => {
    const p = new URLSearchParams()
    const merged = { de, ate, usuario_id: usuId, categoria: catFiltro, ...overrides }
    Object.entries(merged).forEach(([k, v]) => { if (v) p.set(k, v) })
    return `/configuracoes/logs?${p.toString()}`
  }

  return (
    <div className="space-y-6">
      {/* Cabecalho */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <ScrollText className="w-4 h-4" style={{ color: 'var(--accent)' }} />
            <span
              className="text-[10px] font-bold tracking-[0.12em] uppercase"
              style={{ color: 'var(--accent)' }}
            >
              Seguranca
            </span>
          </div>
          <h1
            className="text-xl font-bold"
            style={{ color: 'var(--ink)', fontFamily: 'var(--font-heading)' }}
          >
            Log de Auditoria
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
            {total} registro{total !== 1 ? 's' : ''} encontrado{total !== 1 ? 's' : ''}
          </p>
        </div>
        <ExportarCsv filtros={filtrosAtivos} />
      </div>

      {/* Filtros */}
      <FiltrosLog
        usuarios={(usuariosOrg as any[]) ?? []}
        de={de}
        ate={ate}
        usuarioId={usuId}
        categoria={catFiltro}
      />

      {/* Tabela */}
      <div
        className="rounded-[var(--r-lg)] border overflow-hidden"
        style={{ background: 'var(--surface)', borderColor: 'var(--hairline)' }}
      >
        {lista.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <p className="text-sm" style={{ color: 'var(--muted)' }}>
              Nenhum registro encontrado para os filtros selecionados.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ background: 'var(--surfaceAlt)', borderBottom: '1px solid var(--hairline)' }}>
                  {['Data/Hora', 'Usuario', 'Acao', 'Recurso'].map(h => (
                    <th
                      key={h}
                      className="px-4 py-3 text-left text-[11px] font-bold tracking-wider uppercase"
                      style={{ color: 'var(--muted)' }}
                    >
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {lista.map((row: any) => {
                  const dt   = new Date(row.created_at)
                  const data = dt.toLocaleDateString('pt-BR')
                  const hora = dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
                  return (
                    <tr
                      key={row.id}
                      style={{ borderBottom: '1px solid var(--hairlineSoft, var(--hairline))' }}
                    >
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="font-medium" style={{ color: 'var(--ink)' }}>{data}</span>
                        <span className="ml-1.5 text-[11px]" style={{ color: 'var(--muted)' }}>{hora}</span>
                      </td>
                      <td className="px-4 py-3">
                        <p className="font-medium truncate max-w-[160px]" style={{ color: 'var(--ink)' }}>
                          {row.nome_usuario}
                        </p>
                        <p className="text-[11px]" style={{ color: 'var(--muted)' }}>
                          {row.papel_usuario}
                        </p>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold"
                          style={{ background: 'var(--primaryWash)', color: 'var(--primary)' }}
                        >
                          {labelAcao(row.acao)}
                        </span>
                        <p className="text-[11px] mt-0.5" style={{ color: 'var(--muted)' }}>
                          {LABEL_CATEGORIA[row.categoria] ?? row.categoria}
                        </p>
                      </td>
                      <td className="px-4 py-3 max-w-[200px]">
                        <p className="text-[13px] truncate" style={{ color: 'var(--inkSoft)' }}>
                          {row.recurso_desc ?? '—'}
                        </p>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Paginacao */}
        {paginas > 1 && (
          <div
            className="flex items-center justify-between px-4 py-3"
            style={{ borderTop: '1px solid var(--hairline)', background: 'var(--surfaceAlt)' }}
          >
            <p className="text-xs" style={{ color: 'var(--muted)' }}>
              Pagina {page} de {paginas} — {total} registros
            </p>
            <div className="flex gap-2">
              {page > 1 && (
                <a
                  href={buildUrl({ page: String(page - 1) })}
                  className="text-xs px-3 py-1.5 rounded-[var(--r-md)] border transition-colors"
                  style={{ borderColor: 'var(--hairline)', color: 'var(--inkSoft)' }}
                >
                  Anterior
                </a>
              )}
              {page < paginas && (
                <a
                  href={buildUrl({ page: String(page + 1) })}
                  className="text-xs px-3 py-1.5 rounded-[var(--r-md)] border transition-colors"
                  style={{ borderColor: 'var(--hairline)', color: 'var(--inkSoft)' }}
                >
                  Proxima
                </a>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
