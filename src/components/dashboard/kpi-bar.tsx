import Link from 'next/link'

export interface KPIItem {
  label: string
  value: number | string
  sub?: string
  accent?: boolean
  href?: string
}

export function KPIBar({ items }: { items: KPIItem[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
      {items.map((item, i) => {
        const inner = (
          <div className="glass rounded-[var(--r-lg)] px-5 py-4 flex flex-col gap-1">
            <div
              style={{
                color: 'var(--muted)',
                fontSize: 9.5,
                letterSpacing: '0.16em',
                textTransform: 'uppercase' as const,
                fontWeight: 700,
                fontFamily: 'var(--font-mono, monospace)',
              }}
            >
              {item.label}
            </div>
            <div
              className="l-h l-tnum"
              style={{
                fontFamily: 'var(--font-heading)',
                fontSize: 40,
                lineHeight: 0.92,
                letterSpacing: '-0.03em',
                color: item.accent ? 'var(--accent)' : 'var(--ink)',
                fontWeight: 500,
              }}
            >
              {item.value}
            </div>
            {item.sub && (
              <div className="text-[11px] mt-0.5" style={{ color: 'var(--inkSoft)' }}>{item.sub}</div>
            )}
          </div>
        )
        return item.href ? (
          <Link key={i} href={item.href} className="block lift rounded-[var(--r-lg)]">
            {inner}
          </Link>
        ) : (
          <div key={i}>{inner}</div>
        )
      })}
    </div>
  )
}
