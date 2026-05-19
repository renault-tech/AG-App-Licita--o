'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ChatMensagem } from './chat-mensagem'
import { ChatInput } from './chat-input'
import { enviarMensagemSetor, buscarMensagensSetor } from '@/lib/actions/chat'
import { toast } from 'sonner'
import type { MensagemSetorRow, PapelUsuario } from '@/types/database'
import { LABEL_PAPEL, COR_PAPEL } from '@/lib/permissions'

interface ChatAbaSetorProps {
  usuarioId: string
  papelUsuario: PapelUsuario
  organizacaoId: string
}

export function ChatAbaSetor({ usuarioId, papelUsuario, organizacaoId }: ChatAbaSetorProps) {
  const [mensagens, setMensagens] = useState<MensagemSetorRow[]>([])
  const [carregando, setCarregando] = useState(true)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    buscarMensagensSetor()
      .then(({ data }) => { if (data) setMensagens(data) })
      .finally(() => setCarregando(false))

    const supabase = createClient()
    const channel = supabase
      .channel(`mensagens_setor:${organizacaoId}:${papelUsuario}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'mensagens_setor', filter: `organizacao_id=eq.${organizacaoId}` },
        payload => {
          const msg = payload.new as MensagemSetorRow
          if (msg.setor === papelUsuario) setMensagens(prev => [...prev, msg])
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [organizacaoId, papelUsuario])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensagens])

  async function handleEnviar(conteudo: string) {
    const resultado = await enviarMensagemSetor(conteudo)
    if (!resultado.success) toast.error(resultado.error)
  }

  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-1.5 text-[11px] font-semibold text-white" style={{ background: COR_PAPEL[papelUsuario] }}>
        Chat interno -- {LABEL_PAPEL[papelUsuario]}
      </div>
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
        {carregando && <div className="text-xs text-muted-foreground text-center">Carregando...</div>}
        {!carregando && mensagens.length === 0 && (
          <div className="text-xs text-muted-foreground text-center mt-4">Nenhuma mensagem ainda no seu setor.</div>
        )}
        {mensagens.map(m => (
          <ChatMensagem
            key={m.id}
            nomeUsuario={m.nome_usuario}
            conteudo={m.conteudo}
            createdAt={m.created_at}
            isProprioUsuario={m.usuario_id === usuarioId}
          />
        ))}
        <div ref={bottomRef} />
      </div>
      <ChatInput onEnviar={handleEnviar} placeholder={`Mensagem para ${LABEL_PAPEL[papelUsuario]}...`} />
    </div>
  )
}
