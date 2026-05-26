'use client'

import { useState, useEffect, useRef } from 'react'

export type AutoSaveStatus = 'idle' | 'dirty' | 'saving' | 'saved' | 'error'

/**
 * Hook de auto-save com debounce.
 * deps: lista de valores a observar — qualquer mudança dispara o debounce.
 * onSave: função assíncrona sem argumento (usa closure para ler estado atual).
 * delay: ms de debounce (default 1500).
 */
export function useAutoSave(
  deps: unknown[],
  onSave: () => Promise<void>,
  delay = 1500
): { status: AutoSaveStatus; lastSavedAt: Date | null; retrySave: () => void } {
  const [status, setStatus]         = useState<AutoSaveStatus>('idle')
  const [lastSavedAt, setLastSaved] = useState<Date | null>(null)
  const timerRef   = useRef<ReturnType<typeof setTimeout> | null>(null)
  const onSaveRef  = useRef(onSave)
  const mountedRef = useRef(false)

  // Mantém referência sempre atualizada sem re-disparar o effect
  useEffect(() => { onSaveRef.current = onSave }, [onSave])

  // Aviso ao sair com alterações não salvas
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (status === 'dirty' || status === 'saving') {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [status])

  // Debounce quando deps mudam (ignora montagem inicial)
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true
      return
    }
    setStatus('dirty')
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(async () => {
      setStatus('saving')
      try {
        await onSaveRef.current()
        setLastSaved(new Date())
        setStatus('saved')
      } catch {
        setStatus('error')
      }
    }, delay)
    return () => { if (timerRef.current) clearTimeout(timerRef.current) }
  }, deps) // eslint-disable-line react-hooks/exhaustive-deps

  function retrySave() {
    setStatus('saving')
    onSaveRef.current()
      .then(() => { setLastSaved(new Date()); setStatus('saved') })
      .catch(() => setStatus('error'))
  }

  return { status, lastSavedAt, retrySave }
}
