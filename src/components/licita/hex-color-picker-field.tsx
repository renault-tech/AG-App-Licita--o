'use client'

import { useState, useEffect, useRef } from 'react'
import { HexColorPicker } from 'react-colorful'

interface HexColorPickerFieldProps {
  value:    string
  onChange: (hex: string) => void
  label?:   string
}

export function HexColorPickerField({ value, onChange, label }: HexColorPickerFieldProps) {
  const [open, setOpen]      = useState(false)
  const [inputVal, setInput] = useState(value)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => { setInput(value) }, [value])

  useEffect(() => {
    function handle(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handle)
    return () => document.removeEventListener('mousedown', handle)
  }, [open])

  function handleInput(e: React.ChangeEvent<HTMLInputElement>) {
    const raw = e.target.value
    setInput(raw)
    if (/^#[0-9a-fA-F]{6}$/.test(raw)) onChange(raw)
  }

  return (
    <div className="space-y-2">
      {label && (
        <label className="text-sm font-medium" style={{ color: 'var(--ink)' }}>
          {label}
        </label>
      )}

      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setOpen(v => !v)}
          className="w-9 h-9 rounded-md border-2 shrink-0 transition-shadow hover:shadow-md"
          style={{ backgroundColor: value, borderColor: 'var(--hairline)' }}
          aria-label="Abrir seletor de cor"
        />

        <div className="relative flex-1" ref={ref}>
          <input
            type="text"
            value={inputVal}
            onChange={handleInput}
            placeholder="#000000"
            maxLength={7}
            className="w-full h-9 px-3 rounded-md border text-sm font-mono"
            style={{
              borderColor: 'var(--hairline)',
              background:  'var(--surface)',
              color:       'var(--ink)',
            }}
          />
          {open && (
            <div
              className="absolute top-10 left-0 z-50 p-3 rounded-xl shadow-xl"
              style={{
                background: 'var(--surface)',
                border:     '1px solid var(--hairline)',
              }}
            >
              <HexColorPicker
                color={value}
                onChange={v => { onChange(v); setInput(v) }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Preview dos 4 tons derivados */}
      <div className="flex items-center gap-1.5">
        <span className="text-xs" style={{ color: 'var(--muted)' }}>Preview:</span>
        {([1, 0.7, 0.2, 0.08] as const).map((op, i) => (
          <div
            key={i}
            className="w-5 h-5 rounded"
            style={{
              background: value,
              opacity:    op,
              border:     '1px solid rgba(0,0,0,0.08)',
            }}
          />
        ))}
      </div>
    </div>
  )
}
