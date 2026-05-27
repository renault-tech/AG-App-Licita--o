'use client'

import { useState, useTransition } from 'react'
import { Settings } from 'lucide-react'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { salvarPreferenciaDashboard } from '@/lib/actions/dashboard'

interface CardConfigShellProps {
  configKey: string
  configValue: Record<string, unknown>
  configContent: (
    value: Record<string, unknown>,
    onChange: (v: Record<string, unknown>) => void
  ) => React.ReactNode
  children: React.ReactNode
}

export function CardConfigShell({
  configKey,
  configValue: initialValue,
  configContent,
  children,
}: CardConfigShellProps) {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState(initialValue)
  const [, startTransition] = useTransition()

  function handleOpenChange(next: boolean) {
    if (!next && open) {
      startTransition(async () => {
        await salvarPreferenciaDashboard(configKey, value)
      })
    }
    setOpen(next)
  }

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
          {configContent(value, setValue)}
        </PopoverContent>
      </Popover>
      {children}
    </div>
  )
}
