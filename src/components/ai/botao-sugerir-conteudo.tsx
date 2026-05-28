'use client'

import { useState, useRef } from 'react'
import { Lightbulb, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import type { ContextoSugestao } from '@/lib/ai/prompts/sugerir-conteudo'

interface BotaoSugerirConteudoProps {
  contexto: ContextoSugestao
  onTextoSugerido: (texto: string) => void
  className?: string
  secaoLabel?: string
  disabled?: boolean
}

export function BotaoSugerirConteudo({
  contexto,
  onTextoSugerido,
  className = '',
  secaoLabel,
  disabled = false,
}: BotaoSugerirConteudoProps) {
  const [sugerindo, setSugerindo] = useState(false)
  const abortRef = useRef<AbortController | null>(null)

  async function handleSugerir() {
    if (!contexto.dadosProcesso?.objeto || contexto.dadosProcesso.objeto.trim().length < 5) {
      toast.error('Preencha o campo "Objeto" antes de solicitar uma sugestao.')
      return
    }

    setSugerindo(true)
    onTextoSugerido('')

    abortRef.current = new AbortController()

    try {
      const res = await fetch('/api/ai/sugerir-conteudo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contexto),
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
        onTextoSugerido(textoAcumulado)
      }
    } catch (err: unknown) {
      if (err instanceof Error && err.name === 'AbortError') return
      toast.error(err instanceof Error ? err.message : 'Erro ao gerar sugestao.')
      onTextoSugerido('')
    } finally {
      setSugerindo(false)
    }
  }

  return (
    <div className={`flex gap-1.5 items-center ${className}`} aria-busy={sugerindo}>
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={handleSugerir}
        disabled={sugerindo || disabled}
        className="h-7 px-2 gap-1.5 text-xs text-amber-700 border-amber-200 bg-amber-50 hover:bg-amber-100"
        aria-label={secaoLabel ? `Sugerir conteudo para "${secaoLabel}" com IA` : 'Sugerir conteudo com IA'}
      >
        {sugerindo
          ? <Loader2 className="w-3 h-3 animate-spin" />
          : <Lightbulb className="w-3 h-3" />
        }
        {sugerindo ? 'Sugerindo...' : 'Sugerir com IA'}
      </Button>
    </div>
  )
}
