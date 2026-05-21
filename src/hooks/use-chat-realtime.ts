'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { MensagemChat } from '@/types/chat'

export function useChatRealtime(
  canalId: string | null,
  mensagensIniciais: MensagemChat[],
) {
  const [mensagens, setMensagens] = useState<MensagemChat[]>(mensagensIniciais)
  const canalIdRef = useRef(canalId)

  useEffect(() => {
    setMensagens(mensagensIniciais)
    canalIdRef.current = canalId
  }, [canalId, mensagensIniciais])

  useEffect(() => {
    if (!canalId) return

    const supabase = createClient()

    const channel = supabase
      .channel(`chat-canal-${canalId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'mensagens_chat',
          filter: `canal_id=eq.${canalId}`,
        },
        async (payload) => {
          const { data: autor } = await supabase
            .from('usuarios')
            .select('nome_completo, papel')
            .eq('id', payload.new.autor_id)
            .single()

          const nova: MensagemChat = {
            ...(payload.new as MensagemChat),
            autor: autor as any ?? null,
          }

          setMensagens(prev => {
            if (prev.some(m => m.id === nova.id)) return prev
            return [...prev, nova]
          })
        },
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [canalId])

  return mensagens
}
