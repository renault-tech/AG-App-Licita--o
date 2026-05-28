import Link from 'next/link'

export interface KPIItem {
  label: string
  value: number | string
  sub?: string
  accent?: boolean
  href?: string
  delta?: string
  deltaColor?: 'success' | 'warn' | 'blue' | 'muted'
  sparkline?: 'up' | 'down' | 'flat' | 'wave'
}

const SPARK_D: Record<string, string> = {
  up:   'M0 26 L16 20 L28 22 L40 14 L52 10 L64 5 L72 2',
  down: 'M0 4 L16 8 L28 6 L40 14 L52 18 L64 22 L72 26',
  flat: 'M0 16 L14 14 L26 18 L38 13 L52 15 L64 12 L72 14',
  wave: 'M0 20 L10 8 L20 22 L30 10 L40 18 L50 6 L60 20 L72 14',
}

const DELTA_COLORS: Record<string, { bg: string; color: string }> = {
  success: { bg: 'var(--successWash)', color: 'var(--success)' },
  warn:    { bg: 'var(--warnWash)',    color: 'var(--warn)'    },
  blue:    { bg: 'var(--primaryWash)', color: 'var(--primary)' },
  muted:   { bg: 'var(--hairline)',    color: 'var(--muted)'   },
}

export function KPIBar({ items }: { items: KPIItem[] }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
      {items.map((item, i) => {
        const dc = DELTA_COLORS[item.deltaColor ?? 'muted']
        const inner = (
          <div className="glass rounded-[var(--r-lg)] px-5 py-4 flex flex-col gap-1 relative overflow-hidden min-h-[110px]">
            {/* Sparkline decorativa top-right */}
            {item.sparkline && (
              <div className="absolute top-3 right-3 pointer-events-none" style={{ opacity: 0.28, color: 'var(--muted)' }}>
                <svg width="72" height="28" viewBox="0 0 72 28" fill="none" aria-hidden="true">
                  <path
                    d={SPARK_D[item.sparkline]}
                    stroke="currentColor" strokeWidth="1.5"
                    strokeLinejoin="round" strokeLinecap="round"
                    fill="none"
                  />
                </svg>
              </div>
            )}
            {/* Label */}
            <div style={{ color: 'var(--muted)', fontSize: 9.5, letterSpacing: '0.16em', textTransform: 'uppercase' as const, fontWeight: 700, fontFamily: 'var(--font-mono, monospace)' }}>
              {item.label}
            </div>
            {/* Valor principal */}
            <div
              className="l-h l-tnum"
              style={{ fontFamily: 'var(--font-heading)', fontSize: 40, lineHeight: 0.92, letterSpacing: '-0.03em', color: item.accent ? 'var(--accent)' : 'var(--ink)', fontWeight: 500 }}
            >
              {item.value}
            </div>
            {/* Rodape: sub + delta badge */}
            <div className="flex items-end justify-between gap-2 mt-auto pt-1">
              {item.sub && (
                <div className="text-[11px]" style={{ color: 'var(--inkSoft)' }}>{item.sub}</div>
              )}
              {item.delta && (
                <span
                  className="text-[9.5px] font-bold px-1.5 py-0.5 rounded-full shrink-0 ml-auto"
                  style={{ background: dc.bg, color: dc.color, letterSpacing: '0.04em' }}
                >
                  {item.delta}
                </span>
              )}
            </div>
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
