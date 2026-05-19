'use client'

import { useEffect, useRef, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ChatMensagem } from './chat-mensagem'
import { ChatInput } from './chat-input'
import { enviarMensagemDireta, buscarMensagensDiretas, buscarUsuariosDaOrg } from '@/lib/actions/chat'
import { toast } from 'sonner'
import type { MensagemDiretaRow, UsuarioListagemRow } from '@/types/database'
import { LABEL_PAPEL } from '@/lib/permissions'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { ChevronLeft } from 'lucide-react'

interface ChatAbaDiretoProps {
  usuarioId: string
  organizacaoId: string
}

function iniciais(nome: string) {
  return nome.split(' ').slice(0, 2).map(p => p[0]).join('').toUpperCase()
}

export function ChatAbaDireto({ usuarioId, organizacaoId }: ChatAbaDiretoProps) {
  const [usuarios, setUsuarios] = useState<UsuarioListagemRow[]>([])
  const [selecionado, setSelecionado] = useState<UsuarioListagemRow | null>(null)
  const [mensagens, setMensagens] = useState<MensagemDiretaRow[]>([])
  const [carregandoUsuarios, setCarregandoUsuarios] = useState(true)
  const [carregandoMsgs, setCarregandoMsgs] = useState(false)
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    buscarUsuariosDaOrg()
      .then(({ data }) => { if (data) setUsuarios(data as UsuarioListagemRow[]) })
      .finally(() => setCarregandoUsuarios(false))
  }, [])

  useEffect(() => {
    if (!selecionado) return
    setCarregandoMsgs(true)
    buscarMensagensDiretas(selecionado.id)
      .then(({ data }) => { if (data) setMensagens(data) })
      .finally(() => setCarregandoMsgs(false))

    const supabase = createClient()
    const channel = supabase
      .channel(`mensagens_diretas:${usuarioId}:${selecionado.id}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'mensagens_diretas', filter: `organizacao_id=eq.${organizacaoId}` },
        payload => {
          const msg = payload.new as MensagemDiretaRow
          const relevante =
            (msg.de_usuario_id === usuarioId && msg.para_usuario_id === selecionado.id) ||
            (msg.de_usuario_id === selecionado.id && msg.para_usuario_id === usuarioId)
          if (relevante) setMensagens(prev => [...prev, msg])
        }
      )
      .subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [selecionado, usuarioId, organizacaoId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensagens])

  async function handleEnviar(conteudo: string) {
    if (!selecionado) return
    const resultado = await enviarMensagemDireta(selecionado.id, conteudo)
    if (!resultado.success) toast.error(resultado.error)
  }

  if (!selecionado) {
    return (
      <div className="flex flex-col h-full">
        <div className="px-3 py-2 text-[11px] font-semibold text-muted-foreground uppercase tracking-wide border-b">
          Escolha com quem conversar
        </div>
        <div className="flex-1 overflow-y-auto">
          {carregandoUsuarios && <div className="text-xs text-muted-foreground text-center p-4">Carregando...</div>}
          {usuarios.map(u => (
            <button
              key={u.id}
              type="button"
              onClick={() => setSelecionado(u)}
              className="w-full flex items-center gap-2.5 px-3 py-2.5 hover:bg-accent text-left transition-colors"
            >
              <Avatar className="w-8 h-8 shrink-0">
                <AvatarFallback className="text-[10px] font-bold">{iniciais(u.nome_completo)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <div className="text-sm font-medium truncate">{u.nome_completo}</div>
                <div className="text-[11px] text-muted-foreground truncate">
                  {LABEL_PAPEL[u.papel]}{u.cargo ? ` -- ${u.cargo}` : ''}
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center gap-2 px-3 py-2 border-b">
        <button
          type="button"
          onClick={() => { setSelecionado(null); setMensagens([]) }}
          className="text-muted-foreground hover:text-foreground"
          aria-label="Voltar"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
        <Avatar className="w-6 h-6">
          <AvatarFallback className="text-[9px]">{iniciais(selecionado.nome_completo)}</AvatarFallback>
        </Avatar>
        <div className="min-w-0">
          <div className="text-sm font-semibold truncate">{selecionado.nome_completo}</div>
          <div className="text-[10px] text-muted-foreground">{LABEL_PAPEL[selecionado.papel]}</div>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
        {carregandoMsgs && <div className="text-xs text-muted-foreground text-center">Carregando...</div>}
        {!carregandoMsgs && mensagens.length === 0 && (
          <div className="text-xs text-muted-foreground text-center mt-4">Nenhuma mensagem ainda. Diga ola!</div>
        )}
        {mensagens.map(m => (
          <ChatMensagem
            key={m.id}
            nomeUsuario={m.nome_remetente}
            conteudo={m.conteudo}
            createdAt={m.created_at}
            isProprioUsuario={m.de_usuario_id === usuarioId}
          />
        ))}
        <div ref={bottomRef} />
      </div>
      <ChatInput onEnviar={handleEnviar} placeholder={`Mensagem para ${selecionado.nome_completo}...`} />
    </div>
  )
}
