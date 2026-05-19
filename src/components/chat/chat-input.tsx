'use client'

import { useState, useRef, KeyboardEvent } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Send } from 'lucide-react'

interface ChatInputProps {
  onEnviar: (conteudo: string) => Promise<void>
  placeholder?: string
  desabilitado?: boolean
}

export function ChatInput({ onEnviar, placeholder = 'Digite uma mensagem...', desabilitado = false }: ChatInputProps) {
  const [texto, setTexto] = useState('')
  const [enviando, setEnviando] = useState(false)
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  async function handleEnviar() {
    const conteudo = texto.trim()
    if (!conteudo || enviando) return
    setEnviando(true)
    setTexto('')
    await onEnviar(conteudo)
    setEnviando(false)
    textareaRef.current?.focus()
  }

  function handleKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleEnviar()
    }
  }

  return (
    <div className="flex gap-2 items-end p-2 border-t bg-background">
      <Textarea
        ref={textareaRef}
        value={texto}
        onChange={e => setTexto(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        disabled={desabilitado || enviando}
        rows={1}
        className="resize-none min-h-[36px] max-h-[120px] text-sm"
        aria-label="Campo de mensagem"
      />
      <Button
        size="icon"
        onClick={handleEnviar}
        disabled={!texto.trim() || enviando || desabilitado}
        aria-label="Enviar mensagem"
        className="shrink-0 h-9 w-9"
      >
        <Send className="w-4 h-4" />
      </Button>
    </div>
  )
}
