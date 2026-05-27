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
    <div
      className="flex items-stretch overflow-x-auto"
      style={{ borderTop: '2px solid var(--rule)', borderBottom: '1px solid var(--hairline)' }}
    >
      {items.map((item, i) => {
        const inner = (
          <div
            className="flex flex-col justify-center gap-0.5 px-7 py-5 shrink-0"
            style={i > 0 ? { borderLeft: '1px solid var(--hairline)' } : {}}
          >
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
                fontSize: 44,
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
          <Link key={i} href={item.href} className="block hover:bg-[var(--surfaceAlt)] transition-colors">
            {inner}
          </Link>
        ) : (
          <div key={i}>{inner}</div>
        )
      })}
    </div>
  )
}
