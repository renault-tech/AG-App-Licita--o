'use client'

import { useState, useTransition } from 'react'
import { Settings } from 'lucide-react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { salvarPreferenciaDashboard } from '@/lib/actions/dashboard'

export type ConfigSpec =
  | { type: 'number-input'; label: string; field: string; min: number; max: number }
  | { type: 'select';       label: string; field: string; options: Array<{ value: number; label: string }> }

interface CardConfigShellProps {
  configKey:   string
  configValue: Record<string, unknown>
  config:      ConfigSpec
  children:    React.ReactNode
}

export function CardConfigShell({
  configKey,
  configValue: initialValue,
  config,
  children,
}: CardConfigShellProps) {
  const [open, setOpen]       = useState(false)
  const [value, setValue]     = useState(initialValue)
  const [, startTransition]   = useTransition()

  function handleOpenChange(next: boolean) {
    if (!next && open) {
      startTransition(async () => {
        await salvarPreferenciaDashboard(configKey, value)
      })
    }
    setOpen(next)
  }

  function handleChange(rawValue: string) {
    setValue((prev) => ({ ...prev, [config.field]: Number(rawValue) }))
  }

  const currentVal = String((value as any)[config.field] ?? '')

  return (
    <div className="relative">
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger
          className="absolute top-4 right-4 z-10 rounded transition-opacity opacity-40 hover:opacity-100 focus:opacity-100 focus:outline-none"
          aria-label="Configurar card"
        >
          <Settings className="w-4 h-4" style={{ color: 'var(--muted)' }} />
        </PopoverTrigger>
        <PopoverContent className="w-64 p-4" align="end">
          <p className="text-xs font-semibold uppercase tracking-widest mb-3" style={{ color: 'var(--muted)' }}>
            Configurar card
          </p>
          <label className="text-xs" style={{ color: 'var(--ink)' }}>{config.label}</label>
          {config.type === 'number-input' ? (
            <input
              type="number"
              min={config.min}
              max={config.max}
              value={currentVal}
              onChange={(e) => handleChange(e.target.value)}
              className="mt-2 w-full border rounded px-3 py-1.5 text-sm"
              style={{ borderColor: 'var(--hairline)', background: 'var(--surface)', color: 'var(--ink)' }}
            />
          ) : (
            <select
              value={currentVal}
              onChange={(e) => handleChange(e.target.value)}
              className="mt-2 w-full border rounded px-3 py-1.5 text-sm"
              style={{ borderColor: 'var(--hairline)', background: 'var(--surface)', color: 'var(--ink)' }}
            >
              {config.options.map((opt) => (
                <option key={opt.value} value={String(opt.value)}>{opt.label}</option>
              ))}
            </select>
          )}
        </PopoverContent>
      </Popover>
      {children}
    </div>
  )
}
