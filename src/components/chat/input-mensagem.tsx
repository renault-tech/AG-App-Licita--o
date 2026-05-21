'use client'

import { useState, useRef, useTransition } from 'react'
import { Send } from 'lucide-react'
import { enviarMensagem } from '@/lib/actions/chat'

interface InputMensagemProps {
  canalId: string
  placeholder?: string
}

export function InputMensagem({ canalId, placeholder = 'Escreva uma mensagem...' }: InputMensagemProps) {
  const [texto, setTexto] = useState('')
  const [isPending, startTransition] = useTransition()
  const textareaRef = useRef<HTMLTextAreaElement>(null)

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      enviar()
    }
  }

  function enviar() {
    const conteudo = texto.trim()
    if (!conteudo || isPending) return

    setTexto('')
    startTransition(async () => {
      await enviarMensagem(canalId, conteudo)
    })
    textareaRef.current?.focus()
  }

  return (
    <div
      className="flex items-end gap-2 px-3 py-2 rounded-[var(--r-lg)] border"
      style={{ background: 'var(--surface)', borderColor: 'var(--hairline)' }}
    >
      <textarea
        ref={textareaRef}
        value={texto}
        onChange={e => setTexto(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder={placeholder}
        rows={1}
        className="flex-1 resize-none bg-transparent text-sm outline-none leading-relaxed"
        style={{
          color: 'var(--ink)',
          maxHeight: '120px',
          overflow: 'auto',
        }}
      />
      <button
        onClick={enviar}
        disabled={!texto.trim() || isPending}
        className="w-8 h-8 rounded-[var(--r-md)] flex items-center justify-center shrink-0 transition-all"
        style={{
          background: texto.trim() ? 'var(--primary)' : 'var(--hairline)',
          color: texto.trim() ? 'var(--primaryInk)' : 'var(--muted)',
        }}
        title="Enviar (Enter)"
      >
        <Send className="w-3.5 h-3.5" />
      </button>
    </div>
  )
}
