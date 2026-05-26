'use client'
import { useTheme, THEMES, type ThemeName } from '@/lib/theme/provider'
import { Check, X } from 'lucide-react'

interface ThemeSwitcherPanelProps {
  open: boolean
  onClose: () => void
}

export function ThemeSwitcherPanel({ open, onClose }: ThemeSwitcherPanelProps) {
  const { theme, setTheme } = useTheme()

  if (!open) return null

  return (
    <>
      <div
        className="fixed inset-0 z-40"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        className="absolute top-[calc(100%+8px)] right-0 w-80 z-50 rounded-[var(--r-lg)] p-3"
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--hairline)',
          boxShadow: '0 12px 40px rgba(0,0,0,0.16)',
        }}
      >
        <div
          className="flex items-center justify-between px-1.5 pb-2.5 mb-2.5"
          style={{ borderBottom: '1px solid var(--hairlineSoft)' }}
        >
          <div>
            <div
              className="text-[10px] font-bold tracking-[0.12em] uppercase"
              style={{ color: 'var(--accent)' }}
            >
              Aparencia da plataforma
            </div>
            <div
              className="text-sm font-semibold mt-px"
              style={{ color: 'var(--ink)', fontFamily: 'var(--font-heading)' }}
            >
              Tema institucional
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-[26px] h-[26px] flex items-center justify-center transition-colors rounded-[var(--r-sm)]"
            style={{ color: 'var(--muted)' }}
            onMouseEnter={e => {
              (e.currentTarget as HTMLElement).style.background = 'var(--surfaceSink)'
              ;(e.currentTarget as HTMLElement).style.color = 'var(--ink)'
            }}
            onMouseLeave={e => {
              (e.currentTarget as HTMLElement).style.background = 'transparent'
              ;(e.currentTarget as HTMLElement).style.color = 'var(--muted)'
            }}
            aria-label="Fechar"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex flex-col gap-1.5">
          {(Object.entries(THEMES) as [ThemeName, typeof THEMES.petroleo][]).map(([id, t]) => {
            const active = id === theme
            return (
              <button
                key={id}
                onClick={() => setTheme(id)}
                className="flex items-center gap-3 p-2.5 rounded-[var(--r-md)] text-left transition-colors"
                style={active
                  ? { background: 'var(--surfaceAlt)', border: '1px solid var(--hairline)' }
                  : { background: 'transparent', border: '1px solid transparent' }
                }
              >
                <div className="flex flex-col gap-0.5 shrink-0">
                  {t.swatch.map((c, i) => (
                    <div
                      key={i}
                      className="w-8 h-2.5 rounded-sm"
                      style={{ background: c, border: '1px solid rgba(0,0,0,0.06)' }}
                    />
                  ))}
                </div>
                <div className="flex-1 min-w-0">
                  <div
                    className="text-sm font-semibold"
                    style={{ color: 'var(--ink)', fontFamily: 'var(--font-heading)' }}
                  >
                    {t.name}
                  </div>
                  <div className="text-[11px] mt-0.5" style={{ color: 'var(--muted)' }}>
                    {t.desc}
                  </div>
                </div>
                {active && (
                  <span
                    className="w-5 h-5 rounded-full inline-flex items-center justify-center shrink-0"
                    style={{ background: 'var(--primary)', color: 'var(--primaryInk)' }}
                  >
                    <Check className="w-3 h-3" />
                  </span>
                )}
              </button>
            )
          })}
        </div>
      </div>
    </>
  )
}
