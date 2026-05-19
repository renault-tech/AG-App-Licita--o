'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ChatMensagem } from './chat-mensagem'
import { ChatInput } from './chat-input'
import { enviarMensagemProcesso, buscarMensagensProcesso } from '@/lib/actions/chat'
import { toast } from 'sonner'
import type { MensagemProcessoRow } from '@/types/database'

interface ChatAbaProcessoProps {
  processoId: string
  usuarioId: string
}

export function ChatAbaProcesso({ processoId, usuarioId }: ChatAbaProcessoProps) {
  const [mensagens, setMensagens] = useState<MensagemProcessoRow[]>([])
  const [carregando, setCarregando] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    buscarMensagensProcesso(processoId)
      .then(({ data }) => { if (data) setMensagens(data) })
      .finally(() => setCarregando(false))

    const supabase = createClient()
    const channel = supabase
      .channel(`mensagens_processo:${processoId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'mensagens_processo', filter: `processo_id=eq.${processoId}` },
        payload => setMensagens(prev => [...prev, payload.new as MensagemProcessoRow])
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [processoId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensagens])

  async function handleEnviar(conteudo: string) {
    const resultado = await enviarMensagemProcesso(processoId, conteudo)
    if (!resultado.success) toast.error(resultado.error)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
        {carregando && <div className="text-xs text-muted-foreground text-center">Carregando...</div>}
        {!carregando && mensagens.length === 0 && (
          <div className="text-xs text-muted-foreground text-center mt-4">Nenhuma mensagem ainda. Inicie a conversa!</div>
        )}
        {mensagens.map(m => (
          <ChatMensagem
            key={m.id}
            nomeUsuario={m.nome_usuario}
            papelUsuario={m.papel_usuario}
            conteudo={m.conteudo}
            createdAt={m.created_at}
            isProprioUsuario={m.usuario_id === usuarioId}
          />
        ))}
        <div ref={bottomRef} />
      </div>
      <ChatInput onEnviar={handleEnviar} placeholder="Mensagem no processo..." />
    </div>
  )
}
