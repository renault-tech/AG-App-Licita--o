import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface PaginacaoProcessosProps {
  total:    number
  page:     number
  pageSize: number
  q?:       string
  status?:  string
  fase?:    string
}

function buildHref(page: number, q?: string, status?: string, fase?: string) {
  const params = new URLSearchParams()
  params.set('page', String(page))
  if (q)      params.set('q', q)
  if (status) params.set('status', status)
  if (fase)   params.set('fase', fase)
  return `/processos?${params.toString()}`
}

export default function PaginacaoProcessos({ total, page, pageSize, q, status, fase }: PaginacaoProcessosProps) {
  if (total <= pageSize) return null

  const totalPages = Math.ceil(total / pageSize)
  const inicio = (page - 1) * pageSize + 1
  const fim    = Math.min(page * pageSize, total)

  return (
    <div
      className="flex items-center justify-between pt-3 mt-2"
      style={{ borderTop: '1px solid var(--hairline)' }}
    >
      <span className="text-xs" style={{ color: 'var(--muted)' }}>
        Mostrando {inicio} a {fim} de {total} processos
      </span>
      <div className="flex items-center gap-1">
        {page > 1 ? (
          <Link
            href={buildHref(page - 1, q, status, fase)}
            className="flex items-center justify-center w-7 h-7 rounded border transition-colors"
            style={{ borderColor: 'var(--hairline)', color: 'var(--inkSoft)' }}
            aria-label="Pagina anterior"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </Link>
        ) : (
          <span
            className="flex items-center justify-center w-7 h-7 rounded border opacity-40 cursor-not-allowed"
            style={{ borderColor: 'var(--hairline)', color: 'var(--muted)' }}
            aria-disabled="true"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
          </span>
        )}

        <span className="text-xs font-semibold px-2" style={{ color: 'var(--ink)' }}>
          {page} / {totalPages}
        </span>

        {page < totalPages ? (
          <Link
            href={buildHref(page + 1, q, status, fase)}
            className="flex items-center justify-center w-7 h-7 rounded border transition-colors"
            style={{ borderColor: 'var(--hairline)', color: 'var(--inkSoft)' }}
            aria-label="Proxima pagina"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </Link>
        ) : (
          <span
            className="flex items-center justify-center w-7 h-7 rounded border opacity-40 cursor-not-allowed"
            style={{ borderColor: 'var(--hairline)', color: 'var(--muted)' }}
            aria-disabled="true"
          >
            <ChevronRight className="w-3.5 h-3.5" />
          </span>
        )}
      </div>
    </div>
  )
}
