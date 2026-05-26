'use client'

import { useState, useRef } from 'react'
import { Sparkles, RotateCcw, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import type { ContextoCampo } from '@/lib/ai/prompts/melhorar-campo'

interface BotaoMelhorarCampoProps {
  textoAtual: string
  contexto: Omit<ContextoCampo, 'textoAtual'>
  onTextMelhorado: (novoTexto: string) => void
  className?: string
  secaoLabel?: string
}

export function BotaoMelhorarCampo({
  textoAtual,
  contexto,
  onTextMelhorado,
  className = '',
  secaoLabel,
}: BotaoMelhorarCampoProps) {
  const [melhorando, setMelhorando] = useState(false)
  const [textoAnterior, setTextoAnterior] = useState<string | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  async function handleMelhorar() {
    if (!textoAtual.trim()) {
      toast.error('Escreva algo no campo antes de melhorar com IA.')
      return
    }

    setTextoAnterior(textoAtual)
    setMelhorando(true)
    onTextMelhorado('')

    abortRef.current = new AbortController()

    try {
      const res = await fetch('/api/ai/melhorar-campo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...contexto, textoAtual }),
        signal: abortRef.current.signal,
      })

      if (!res.ok) {
        const msg = await res.text()
        throw new Error(msg || 'Erro ao chamar a IA.')
      }

      if (!res.body) throw new Error('Sem resposta da IA.')

      const reader = res.body.getReader()
      const decoder = new TextDecoder()
      let textoAcumulado = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        textoAcumulado += decoder.decode(value, { stream: true })
        onTextMelhorado(textoAcumulado)
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return
      toast.error(err instanceof Error ? err.message : 'Erro ao melhorar o texto.')
      if (textoAnterior !== null) onTextMelhorado(textoAnterior)
    } finally {
      setMelhorando(false)
    }
  }

  function handleReverter() {
    if (textoAnterior !== null) {
      onTextMelhorado(textoAnterior)
      setTextoAnterior(null)
    }
  }

  return (
    <div className={`flex gap-1.5 items-center ${className}`} aria-busy={melhorando}>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={handleMelhorar}
        disabled={melhorando}
        className="h-7 px-2 gap-1.5 text-xs"
        style={{ borderColor: 'var(--primary)', color: 'var(--primary)' }}
        aria-label={secaoLabel ? `Melhorar "${secaoLabel}" com IA` : 'Melhorar texto com IA'}
      >
        {melhorando
          ? <Loader2 className="w-3 h-3 animate-spin" />
          : <Sparkles className="w-3 h-3" />
        }
        {melhorando ? 'Melhorando...' : 'Melhorar com IA'}
      </Button>

      {textoAnterior !== null && !melhorando && (
        <Button
          type="button"
          size="sm"
          variant="ghost"
          onClick={handleReverter}
          className="h-7 px-2 gap-1.5 text-xs text-muted-foreground hover:text-foreground"
          aria-label="Reverter texto original"
        >
          <RotateCcw className="w-3 h-3" />
          Reverter
        </Button>
      )}
    </div>
  )
}
