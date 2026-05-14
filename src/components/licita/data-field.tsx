import type { ReactNode } from 'react'

interface DataFieldProps {
  label: string
  value?: ReactNode
  empty?: string
  horizontal?: boolean
  size?: 'sm' | 'md'
  className?: string
}

export function DataField({
  label,
  value,
  empty = 'Nao informado',
  horizontal = false,
  size = 'md',
  className = '',
}: DataFieldProps) {
  const isEmpty = value === undefined || value === null || value === ''

  if (horizontal) {
    return (
      <div className={`flex items-baseline gap-3 ${className}`}>
        <dt
          className="shrink-0 text-[11px] font-semibold uppercase tracking-[0.08em] text-muted"
          style={{ minWidth: 120 }}
        >
          {label}
        </dt>
        <dd className={`text-inkSoft ${size === 'sm' ? 'text-sm' : 'text-[15px]'} ${isEmpty ? 'italic text-mutedSoft' : ''}`}>
          {isEmpty ? empty : value}
        </dd>
      </div>
    )
  }

  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <dt className="text-[10.5px] font-semibold uppercase tracking-[0.1em] text-muted">
        {label}
      </dt>
      <dd className={`text-ink leading-snug ${size === 'sm' ? 'text-sm' : 'text-[15px]'} ${isEmpty ? 'italic text-mutedSoft' : ''}`}>
        {isEmpty ? empty : value}
      </dd>
    </div>
  )
}

interface DataGridProps {
  fields: Array<{ label: string; value?: ReactNode; empty?: string }>
  cols?: 1 | 2 | 3 | 4
  size?: 'sm' | 'md'
  className?: string
}

export function DataGrid({ fields, cols = 2, size = 'md', className = '' }: DataGridProps) {
  const colClass = { 1: 'grid-cols-1', 2: 'grid-cols-1 sm:grid-cols-2', 3: 'grid-cols-1 sm:grid-cols-3', 4: 'grid-cols-2 sm:grid-cols-4' }[cols]

  return (
    <dl className={`grid ${colClass} gap-x-8 gap-y-5 ${className}`}>
      {fields.map(({ label, value, empty }) => (
        <DataField key={label} label={label} value={value} empty={empty} size={size} />
      ))}
    </dl>
  )
}
