import type { ReactNode } from 'react'
import { StatusPill, type StatusProcesso } from './status-pill'

interface DocSheetProps {
  titulo: string
  subtitulo?: string
  status?: StatusProcesso
  meta?: Array<{ label: string; value: string }>
  acoes?: ReactNode
  children: ReactNode
  className?: string
}

export function DocSheet({
  titulo,
  subtitulo,
  status,
  meta = [],
  acoes,
  children,
  className = '',
}: DocSheetProps) {
  return (
    <article
      className={`flex flex-col gap-0 rounded-[var(--r-lg)] border border-hairline bg-surface shadow-sm overflow-hidden ${className}`}
    >
      {/* Cabecalho */}
      <header className="flex flex-col gap-2 border-b border-hairline bg-surfaceAlt px-6 py-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h2
              className="truncate text-lg font-semibold leading-snug tracking-[-0.01em] text-ink"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              {titulo}
            </h2>
            {subtitulo && (
              <p className="mt-0.5 text-sm text-muted">{subtitulo}</p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {status && <StatusPill status={status} size="sm" />}
            {acoes && <div className="flex items-center gap-2">{acoes}</div>}
          </div>
        </div>

        {meta.length > 0 && (
          <dl className="flex flex-wrap gap-x-6 gap-y-1">
            {meta.map(({ label, value }) => (
              <div key={label} className="flex items-center gap-1.5">
                <dt className="text-[11px] font-semibold uppercase tracking-[0.08em] text-mutedSoft">{label}</dt>
                <dd className="text-[12px] font-medium text-inkSoft">{value}</dd>
              </div>
            ))}
          </dl>
        )}
      </header>

      {/* Conteudo */}
      <div className="flex-1 px-6 py-5">{children}</div>
    </article>
  )
}
