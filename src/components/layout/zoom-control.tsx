'use client'

import { useState, useEffect, useCallback } from 'react'
import { ZoomIn, ZoomOut, RotateCcw } from 'lucide-react'

const ZOOM_LEVELS = [0.8, 0.9, 1, 1.1, 1.2, 1.3]
const ZOOM_KEY = 'licitaia-zoom-level'
const DEFAULT_ZOOM = 1

export default function ZoomControl() {
  const [zoom, setZoom] = useState(DEFAULT_ZOOM)
  const [mounted, setMounted] = useState(false)

  // Load from localStorage on mount
  useEffect(() => {
    setMounted(true)
    try {
      const saved = localStorage.getItem(ZOOM_KEY)
      if (saved) {
        const parsed = parseFloat(saved)
        if (ZOOM_LEVELS.includes(parsed)) {
          setZoom(parsed)
          document.documentElement.style.setProperty('--zoom-level', String(parsed))
        }
      }
    } catch {}
  }, [])

  const applyZoom = useCallback((level: number) => {
    setZoom(level)
    document.documentElement.style.setProperty('--zoom-level', String(level))
    try {
      localStorage.setItem(ZOOM_KEY, String(level))
    } catch {}
  }, [])

  const zoomIn = useCallback(() => {
    const currentIdx = ZOOM_LEVELS.indexOf(zoom)
    if (currentIdx < ZOOM_LEVELS.length - 1) {
      applyZoom(ZOOM_LEVELS[currentIdx + 1])
    }
  }, [zoom, applyZoom])

  const zoomOut = useCallback(() => {
    const currentIdx = ZOOM_LEVELS.indexOf(zoom)
    if (currentIdx > 0) {
      applyZoom(ZOOM_LEVELS[currentIdx - 1])
    }
  }, [zoom, applyZoom])

  const resetZoom = useCallback(() => {
    applyZoom(DEFAULT_ZOOM)
  }, [applyZoom])

  // Keyboard shortcut: Ctrl + / Ctrl -
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && (e.key === '=' || e.key === '+')) {
        e.preventDefault()
        zoomIn()
      }
      if ((e.ctrlKey || e.metaKey) && e.key === '-') {
        e.preventDefault()
        zoomOut()
      }
      if ((e.ctrlKey || e.metaKey) && e.key === '0') {
        e.preventDefault()
        resetZoom()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [zoomIn, zoomOut, resetZoom])

  if (!mounted) return null

  const isMin = zoom === ZOOM_LEVELS[0]
  const isMax = zoom === ZOOM_LEVELS[ZOOM_LEVELS.length - 1]
  const isDefault = zoom === DEFAULT_ZOOM
  const pct = Math.round(zoom * 100)

  return (
    <div
      className="fixed bottom-16 right-6 z-[55] flex items-center gap-0.5 rounded-full border border-[var(--hairline)] bg-white/95 backdrop-blur-md px-1.5 py-1 transition-all"
      style={{ boxShadow: '0px 4px 16px rgba(26, 54, 93, 0.08)' }}
    >
      {/* Zoom out */}
      <button
        onClick={zoomOut}
        disabled={isMin}
        className="flex items-center justify-center w-8 h-8 rounded-full text-[var(--inkSoft)] hover:bg-[var(--surfaceAlt)] hover:text-[var(--primary)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        title="Diminuir zoom (Ctrl + −)"
        aria-label="Diminuir zoom"
      >
        <ZoomOut className="w-4 h-4" />
      </button>

      {/* Percentage / reset */}
      <button
        onClick={resetZoom}
        className={`flex items-center justify-center min-w-[52px] h-8 rounded-full text-xs font-semibold transition-colors ${
          isDefault
            ? 'text-[var(--muted)] cursor-default'
            : 'text-[var(--primary)] hover:bg-[var(--primary)]/5 cursor-pointer'
        }`}
        title={isDefault ? 'Zoom: 100%' : 'Restaurar zoom (Ctrl + 0)'}
        aria-label={`Zoom ${pct}%`}
      >
        {!isDefault && <RotateCcw className="w-3 h-3 mr-1 opacity-60" />}
        {pct}%
      </button>

      {/* Zoom in */}
      <button
        onClick={zoomIn}
        disabled={isMax}
        className="flex items-center justify-center w-8 h-8 rounded-full text-[var(--inkSoft)] hover:bg-[var(--surfaceAlt)] hover:text-[var(--primary)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        title="Aumentar zoom (Ctrl + +)"
        aria-label="Aumentar zoom"
      >
        <ZoomIn className="w-4 h-4" />
      </button>
    </div>
  )
}
