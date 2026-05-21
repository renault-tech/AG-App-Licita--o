'use client'

import { useEffect, useRef } from 'react'
import { useChatRealtime } from '@/hooks/use-chat-realtime'
import { MensagemChatItem } from './mensagem-chat'
import { InputMensagem } from './input-mensagem'
import { marcarCanalComoLido } from '@/lib/actions/chat'
import type { MensagemChat } from '@/types/chat'

interface PainelChatProps {
  canalId: string
  mensagensIniciais: MensagemChat[]
  usuarioAtualId: string
  titulo?: string
  className?: string
}

export function PainelChat({
  canalId,
  mensagensIniciais,
  usuarioAtualId,
  titulo,
  className = '',
}: PainelChatProps) {
  const mensagens = useChatRealtime(canalId, mensagensIniciais)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensagens.length])

  useEffect(() => {
    marcarCanalComoLido(canalId).catch(() => {})
  }, [canalId])

  return (
    <div
      className={`flex flex-col rounded-[var(--r-lg)] border overflow-hidden ${className}`}
      style={{ background: 'var(--surface)', borderColor: 'var(--hairline)' }}
    >
      {titulo && (
        <div
          className="px-4 py-3 border-b flex items-center gap-2"
          style={{ background: 'var(--surfaceAlt)', borderColor: 'var(--hairline)' }}
        >
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-sm font-semibold" style={{ color: 'var(--ink)', fontFamily: 'var(--font-heading)' }}>
            {titulo}
          </span>
        </div>
      )}

      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 min-h-0" style={{ maxHeight: '60vh' }}>
        {mensagens.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center">
            <p className="text-sm" style={{ color: 'var(--muted)' }}>
              Nenhuma mensagem ainda. Seja o primeiro a escrever.
            </p>
          </div>
        ) : (
          mensagens.map(m => (
            <MensagemChatItem
              key={m.id}
              mensagem={m}
              eProprioUsuario={m.autor_id === usuarioAtualId}
            />
          ))
        )}
        <div ref={bottomRef} />
      </div>

      <div className="px-4 py-3 border-t" style={{ borderColor: 'var(--hairline)' }}>
        <InputMensagem canalId={canalId} />
      </div>
    </div>
  )
}
