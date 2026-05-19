'use client'

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { ChatAbaProcesso } from './chat-aba-processo'
import { ChatAbaSetor } from './chat-aba-setor'
import { ChatAbaDireto } from './chat-aba-direto'
import { MessageSquare, X, Minimize2, Pin } from 'lucide-react'
import type { PapelUsuario } from '@/types/database'

interface ChatPanelProps {
  usuarioId: string
  papelUsuario: PapelUsuario
  organizacaoId: string
  processoId?: string
  naoLidasDireto?: number
}

export function ChatPanel({
  usuarioId,
  papelUsuario,
  organizacaoId,
  processoId,
  naoLidasDireto = 0,
}: ChatPanelProps) {
  const [aberto, setAberto] = useState(false)
  const [fixado, setFixado] = useState(false)
  const [abaAtiva, setAbaAtiva] = useState<string>(processoId ? 'processo' : 'setor')

  if (fixado) {
    return (
      <div className="fixed right-0 top-0 h-screen w-[360px] bg-background border-l shadow-2xl z-40 flex flex-col">
        <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30">
          <div className="flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-primary" />
            <span className="text-sm font-semibold">Chat</span>
          </div>
          <div className="flex gap-1">
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setFixado(false)} title="Desfixar">
              <Pin className="w-3.5 h-3.5" />
            </Button>
            <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => { setFixado(false); setAberto(false) }} title="Fechar">
              <X className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
        <ChatTabsContent
          usuarioId={usuarioId} papelUsuario={papelUsuario} organizacaoId={organizacaoId}
          processoId={processoId} naoLidasDireto={naoLidasDireto} abaAtiva={abaAtiva} setAbaAtiva={setAbaAtiva}
        />
      </div>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-2">
      {aberto && (
        <div className="bg-background border rounded-2xl shadow-2xl flex flex-col overflow-hidden" style={{ width: 360, height: 520 }}>
          <div className="flex items-center justify-between px-3 py-2 border-b bg-muted/30">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-primary" />
              <span className="text-sm font-semibold">Chat</span>
            </div>
            <div className="flex gap-1">
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setFixado(true)} title="Fixar na lateral">
                <Pin className="w-3.5 h-3.5" />
              </Button>
              <Button size="icon" variant="ghost" className="h-7 w-7" onClick={() => setAberto(false)} title="Minimizar">
                <Minimize2 className="w-3.5 h-3.5" />
              </Button>
            </div>
          </div>
          <ChatTabsContent
            usuarioId={usuarioId} papelUsuario={papelUsuario} organizacaoId={organizacaoId}
            processoId={processoId} naoLidasDireto={naoLidasDireto} abaAtiva={abaAtiva} setAbaAtiva={setAbaAtiva}
          />
        </div>
      )}

      <div className="relative">
        <Button
          size="icon"
          className="h-12 w-12 rounded-full shadow-lg"
          onClick={() => setAberto(v => !v)}
          aria-label={aberto ? 'Fechar chat' : 'Abrir chat'}
        >
          {aberto ? <X className="w-5 h-5" /> : <MessageSquare className="w-5 h-5" />}
        </Button>
        {!aberto && naoLidasDireto > 0 && (
          <Badge
            className="absolute -top-1 -right-1 h-5 w-5 p-0 flex items-center justify-center text-[10px]"
            variant="destructive"
          >
            {naoLidasDireto > 9 ? '9+' : naoLidasDireto}
          </Badge>
        )}
      </div>
    </div>
  )
}

interface ChatTabsContentProps {
  usuarioId: string
  papelUsuario: PapelUsuario
  organizacaoId: string
  processoId?: string
  naoLidasDireto: number
  abaAtiva: string
  setAbaAtiva: (v: string) => void
}

function ChatTabsContent({
  usuarioId, papelUsuario, organizacaoId, processoId, naoLidasDireto, abaAtiva, setAbaAtiva
}: ChatTabsContentProps) {
  return (
    <Tabs value={abaAtiva} onValueChange={setAbaAtiva} className="flex flex-col flex-1 overflow-hidden">
      <TabsList className="mx-2 mt-2 mb-0 grid grid-cols-3 h-8">
        <TabsTrigger value="processo" disabled={!processoId} className="text-[11px]">Processo</TabsTrigger>
        <TabsTrigger value="setor" className="text-[11px]">Setor</TabsTrigger>
        <TabsTrigger value="direto" className="text-[11px] relative">
          Direto
          {naoLidasDireto > 0 && (
            <Badge className="ml-1 h-4 px-1 text-[9px]" variant="destructive">{naoLidasDireto}</Badge>
          )}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="processo" className="flex-1 overflow-hidden mt-0 data-[state=active]:flex flex-col">
        {processoId ? (
          <ChatAbaProcesso processoId={processoId} usuarioId={usuarioId} />
        ) : (
          <div className="flex-1 flex items-center justify-center text-xs text-muted-foreground p-4 text-center">
            Abra um processo para usar o chat do processo.
          </div>
        )}
      </TabsContent>

      <TabsContent value="setor" className="flex-1 overflow-hidden mt-0 data-[state=active]:flex flex-col">
        <ChatAbaSetor usuarioId={usuarioId} papelUsuario={papelUsuario} organizacaoId={organizacaoId} />
      </TabsContent>

      <TabsContent value="direto" className="flex-1 overflow-hidden mt-0 data-[state=active]:flex flex-col">
        <ChatAbaDireto usuarioId={usuarioId} organizacaoId={organizacaoId} />
      </TabsContent>
    </Tabs>
  )
}
