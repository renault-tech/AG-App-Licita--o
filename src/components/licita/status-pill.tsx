'use client'

export type StatusProcesso =
  | 'rascunho'
  | 'em_revisao'
  | 'assinado'
  | 'publicado'
  | 'em_analise'
  | 'devolvido'
  | 'aguardando'
  | 'cancelado'

interface StatusConfig {
  label: string
  bg: string
  color: string
  dot: string
}

const STATUS_MAP: Record<StatusProcesso, StatusConfig> = {
  rascunho:    { label: 'Rascunho',     bg: 'var(--surfaceSink)',  color: 'var(--muted)',   dot: 'var(--muted)' },
  em_revisao:  { label: 'Em revisao',   bg: 'var(--warnWash)',    color: 'var(--warn)',    dot: 'var(--warn)' },
  assinado:    { label: 'Assinado',     bg: 'var(--primaryWash)', color: 'var(--primary)', dot: 'var(--primary)' },
  publicado:   { label: 'Publicado',    bg: 'var(--successWash)', color: 'var(--success)', dot: 'var(--success)' },
  em_analise:  { label: 'Em analise',   bg: 'var(--accentWash)',  color: 'var(--accent)',  dot: 'var(--accent)' },
  devolvido:   { label: 'Devolvido',    bg: 'var(--dangerWash)',  color: 'var(--danger)',  dot: 'var(--danger)' },
  aguardando:  { label: 'Aguardando',   bg: 'var(--warnWash)',    color: 'var(--warn)',    dot: 'var(--warn)' },
  cancelado:   { label: 'Cancelado',    bg: 'var(--dangerWash)',  color: 'var(--danger)',  dot: 'var(--danger)' },
}

interface StatusPillProps {
  status: StatusProcesso
  size?: 'sm' | 'md'
  dot?: boolean
  className?: string
}

export function StatusPill({ status, size = 'md', dot = true, className = '' }: StatusPillProps) {
  const cfg = STATUS_MAP[status]
  const px  = size === 'sm' ? '6px 10px' : '5px 12px'
  const fs  = size === 'sm' ? '10.5px'   : '12px'
  const fw  = '600'

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-[var(--r-pill)] font-medium tracking-[0.02em] uppercase select-none ${className}`}
      style={{ background: cfg.bg, color: cfg.color, padding: px, fontSize: fs, fontWeight: fw, letterSpacing: '0.04em' }}
    >
      {dot && (
        <span
          className="shrink-0 rounded-full"
          style={{ width: size === 'sm' ? 5 : 6, height: size === 'sm' ? 5 : 6, background: cfg.dot }}
        />
      )}
      {cfg.label}
    </span>
  )
}
