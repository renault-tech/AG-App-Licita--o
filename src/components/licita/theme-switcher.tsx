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
      <div className="absolute top-[calc(100%+8px)] right-0 bg-surface border border-hairline rounded-licita p-3 w-80 z-50"
        style={{ boxShadow: '0 12px 40px rgba(0,0,0,0.12)' }}
      >
        <div className="flex items-center justify-between px-1.5 pb-2.5 border-b border-hairlineSoft mb-2.5">
          <div>
            <div className="text-[10px] text-[var(--accent)] font-bold tracking-[0.12em] uppercase">
              Aparencia da plataforma
            </div>
            <div className="font-heading text-sm font-semibold text-ink mt-px">
              Tema institucional
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-[26px] h-[26px] rounded-[var(--r-sm)] flex items-center justify-center text-muted hover:text-ink hover:bg-surfaceSink transition-colors"
            aria-label="Fechar"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="flex flex-col gap-2">
          {(Object.entries(THEMES) as [ThemeName, typeof THEMES.petroleo][]).map(([id, t]) => {
            const active = id === theme
            return (
              <button
                key={id}
                onClick={() => setTheme(id)}
                className={`flex items-center gap-3 p-2.5 rounded-[var(--r-md)] text-left transition-colors ${
                  active
                    ? 'bg-surfaceAlt border border-hairline'
                    : 'border border-transparent hover:bg-surfaceAlt'
                }`}
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
                  <div className="font-heading text-sm font-semibold text-ink">{t.name}</div>
                  <div className="text-[11px] text-muted mt-0.5">{t.desc}</div>
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
