'use client'

import { Loader2, Check, AlertCircle } from 'lucide-react'
import type { AutoSaveStatus } from '@/hooks/use-auto-save'

interface AutoSaveIndicatorProps {
  status: AutoSaveStatus
  lastSavedAt: Date | null
  onRetry: () => void
  className?: string
}

function formatarHora(d: Date) {
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
}

export function AutoSaveIndicator({ status, lastSavedAt, onRetry, className = '' }: AutoSaveIndicatorProps) {
  if (status === 'idle') return null

  return (
    <span className={`flex items-center gap-1.5 text-xs ${className}`} aria-live="polite">
      {status === 'dirty' && (
        <span className="text-muted-foreground">Alteracoes pendentes...</span>
      )}
      {status === 'saving' && (
        <>
          <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />
          <span className="text-muted-foreground">Salvando...</span>
        </>
      )}
      {status === 'saved' && (
        <>
          <Check className="w-3 h-3 text-green-600" />
          <span className="text-green-600">
            Salvo{lastSavedAt ? ` as ${formatarHora(lastSavedAt)}` : ''}
          </span>
        </>
      )}
      {status === 'error' && (
        <>
          <AlertCircle className="w-3 h-3 text-destructive" />
          <span className="text-destructive">
            Erro ao salvar{' '}
            <button
              type="button"
              onClick={onRetry}
              className="underline"
            >
              tentar novamente
            </button>
          </span>
        </>
      )}
    </span>
  )
}
