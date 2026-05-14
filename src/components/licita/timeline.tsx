import type { ReactNode } from 'react'
import { Check, Clock, AlertCircle, Circle } from 'lucide-react'

export type TimelineItemStatus = 'concluido' | 'em_andamento' | 'pendente' | 'bloqueado'

export interface TimelineItem {
  id: string
  label: string
  descricao?: string
  status: TimelineItemStatus
  data?: string
  actor?: string
  icon?: ReactNode
}

const STATUS_ICON: Record<TimelineItemStatus, ReactNode> = {
  concluido:    <Check className="w-3.5 h-3.5" />,
  em_andamento: <Clock className="w-3.5 h-3.5" />,
  pendente:     <Circle className="w-3.5 h-3.5" />,
  bloqueado:    <AlertCircle className="w-3.5 h-3.5" />,
}

const STATUS_STYLE: Record<TimelineItemStatus, { dot: string; line: string; icon: string }> = {
  concluido:    { dot: 'var(--success)',   line: 'var(--success)',   icon: 'var(--primaryInk)' },
  em_andamento: { dot: 'var(--primary)',   line: 'var(--hairline)',  icon: 'var(--primaryInk)' },
  pendente:     { dot: 'var(--hairline)',  line: 'var(--hairline)',  icon: 'var(--muted)' },
  bloqueado:    { dot: 'var(--danger)',    line: 'var(--hairline)',  icon: 'var(--primaryInk)' },
}

interface TimelineProps {
  items: TimelineItem[]
  compact?: boolean
  className?: string
}

export function Timeline({ items, compact = false, className = '' }: TimelineProps) {
  return (
    <ol className={`flex flex-col ${className}`}>
      {items.map((item, idx) => {
        const s = STATUS_STYLE[item.status]
        const isLast = idx === items.length - 1

        return (
          <li key={item.id} className="relative flex gap-3">
            {/* Trilha vertical */}
            <div className="flex flex-col items-center" style={{ width: 24 }}>
              <div
                className="relative z-10 flex items-center justify-center rounded-full shrink-0"
                style={{
                  width: 24, height: 24,
                  background: s.dot,
                  color: s.icon,
                  boxShadow: item.status === 'em_andamento' ? '0 0 0 3px var(--primaryWash)' : undefined,
                }}
              >
                {item.icon ?? STATUS_ICON[item.status]}
              </div>
              {!isLast && (
                <div
                  className="flex-1 w-px my-1"
                  style={{ background: s.line, minHeight: compact ? 16 : 24 }}
                />
              )}
            </div>

            {/* Conteudo */}
            <div className={`flex-1 min-w-0 ${compact ? 'pb-3' : 'pb-5'}`}>
              <p
                className="text-sm font-semibold leading-snug"
                style={{ color: item.status === 'pendente' ? 'var(--muted)' : 'var(--ink)' }}
              >
                {item.label}
              </p>
              {item.descricao && !compact && (
                <p className="mt-0.5 text-[12px] text-muted leading-snug">{item.descricao}</p>
              )}
              <div className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5">
                {item.data && (
                  <span className="text-[11px] text-mutedSoft">{item.data}</span>
                )}
                {item.actor && (
                  <span className="text-[11px] text-mutedSoft">{item.actor}</span>
                )}
              </div>
            </div>
          </li>
        )
      })}
    </ol>
  )
}
