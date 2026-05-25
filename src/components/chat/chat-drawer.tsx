'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import {
  MessageCircle, X, Pin, PinOff,
  Hash, Building2, Users, Loader2,
} from 'lucide-react'
import { buscarCanaisComNaoLidos, buscarMensagens, marcarCanalComoLido } from '@/lib/actions/chat'
import { useChatRealtime } from '@/hooks/use-chat-realtime'
import { MensagemChatItem } from './mensagem-chat'
import { InputMensagem } from './input-mensagem'
import type { CanalComNaoLidos, MensagemChat, TipoCanal } from '@/types/chat'

const CANAL_ICON: Record<TipoCanal, React.ElementType> = {
  plataforma: Hash,
  setor: Building2,
  processo: Users,
}

interface ChatDrawerProps {
  usuarioId: string
  naoLidosChat?: number
}

export function ChatDrawer({ usuarioId, naoLidosChat = 0 }: ChatDrawerProps) {
  const [aberto, setAberto] = useState(false)
  const [fixado, setFixado] = useState(false)
  const [canais, setCanais] = useState<CanalComNaoLidos[]>([])
  const [canalAtivo, setCanalAtivo] = useState<string | null>(null)
  const [mensagensBase, setMensagensBase] = useState<MensagemChat[]>([])
  const [carregando, setCarregando] = useState(false)
  const [carregandoCanais, setCarregandoCanais] = useState(false)
  const [inicializado, setInicializado] = useState(false)

  const bottomRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  const mensagens = useChatRealtime(canalAtivo, mensagensBase)

  // Restaura estado do localStorage apenas no cliente
  useEffect(() => {
    const eraFixado = localStorage.getItem('chat-fixado') === 'true'
    if (eraFixado) {
      setFixado(true)
      setAberto(true)
    }
    setInicializado(true)
  }, [])

  // Carrega canais quando o drawer abre pela primeira vez
  useEffect(() => {
    if (!aberto || canais.length > 0) return
    setCarregandoCanais(true)
    buscarCanaisComNaoLidos()
      .then(data => {
        setCanais(data)
        if (data.length > 0 && !canalAtivo) {
          setCanalAtivo(data[0].id)
        }
      })
      .finally(() => setCarregandoCanais(false))
  }, [aberto])

  // Carrega mensagens ao trocar de canal
  useEffect(() => {
    if (!canalAtivo) return
    setCarregando(true)
    setMensagensBase([])
    buscarMensagens(canalAtivo)
      .then(setMensagensBase)
      .finally(() => setCarregando(false))
    marcarCanalComoLido(canalAtivo).catch(() => {})
  }, [canalAtivo])

  // Scroll para o fim quando chegam mensagens novas
  useEffect(() => {
    if (aberto) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [mensagens.length, aberto])

  // Fecha ao clicar fora quando nao fixado
  useEffect(() => {
    if (!aberto || fixado) return
    function handleClickFora(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        setAberto(false)
      }
    }
    document.addEventListener('mousedown', handleClickFora)
    return () => document.removeEventListener('mousedown', handleClickFora)
  }, [aberto, fixado])

  function toggleFixado() {
    const novoValor = !fixado
    setFixado(novoValor)
    localStorage.setItem('chat-fixado', String(novoValor))
    if (!novoValor && !aberto) setAberto(false)
  }

  function fechar() {
    setAberto(false)
    if (fixado) {
      setFixado(false)
      localStorage.removeItem('chat-fixado')
    }
  }

  function toggleAberto() {
    setAberto(prev => !prev)
  }

  const canalAtivoData = canais.find(c => c.id === canalAtivo)

  // Aguarda hidratacao para evitar mismatch
  if (!inicializado) {
    return (
      <button
        className="fixed left-4 bottom-6 z-50 flex items-center justify-center w-12 h-12 rounded-full"
        style={{
          background: 'var(--surface)',
          border: '1.5px solid var(--hairline)',
          boxShadow: '0 2px 8px rgba(0,0,0,0.10)',
          color: 'var(--inkSoft)',
        }}
        aria-label="Chat"
        onClick={() => {}}
      >
        <MessageCircle className="w-5 h-5" />
      </button>
    )
  }

  return (
    <>
      {/* Backdrop sutil quando aberto e nao fixado */}
      <div
        aria-hidden
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 40,
          background: 'rgba(0,0,0,0.06)',
          pointerEvents: aberto && !fixado ? 'none' : 'none',
          opacity: aberto && !fixado ? 1 : 0,
          transition: 'opacity 200ms ease',
        }}
      />

      {/* Painel principal */}
      <div
        ref={panelRef}
        aria-label="Painel de mensagens"
        role="dialog"
        aria-modal={!fixado}
        style={{
          position: 'fixed',
          left: 14,
          top: 76,
          bottom: 76,
          width: 372,
          zIndex: 50,
          display: 'flex',
          flexDirection: 'column',
          background: 'var(--surface)',
          borderRadius: 'var(--r-lg)',
          border: '1px solid var(--hairline)',
          boxShadow: '0 12px 40px rgba(0,0,0,0.16), 0 2px 8px rgba(0,0,0,0.08)',
          transform: aberto ? 'translateX(0) scale(1)' : 'translateX(-410px) scale(0.97)',
          opacity: aberto ? 1 : 0,
          transition: 'transform 280ms cubic-bezier(0.32, 0.72, 0, 1), opacity 200ms ease',
          pointerEvents: aberto ? 'all' : 'none',
          overflow: 'hidden',
        }}
      >
        {/* Cabecalho */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 12px',
            borderBottom: '1px solid var(--hairline)',
            background: 'var(--surfaceAlt)',
            flexShrink: 0,
          }}
        >
          <MessageCircle style={{ width: 15, height: 15, color: 'var(--primary)', flexShrink: 0 }} />
          <span
            style={{
              flex: 1,
              fontSize: 13,
              fontWeight: 600,
              color: 'var(--ink)',
              fontFamily: 'var(--font-heading)',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {canalAtivoData ? canalAtivoData.nome : 'Mensagens'}
          </span>

          <button
            onClick={toggleFixado}
            title={fixado ? 'Desafixar painel' : 'Fixar painel'}
            style={{
              width: 28,
              height: 28,
              borderRadius: 'var(--r-md)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              transition: 'background 150ms',
              color: fixado ? 'var(--primary)' : 'var(--muted)',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--hairline)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            {fixado
              ? <Pin style={{ width: 13, height: 13 }} />
              : <PinOff style={{ width: 13, height: 13 }} />
            }
          </button>

          <button
            onClick={fechar}
            title="Fechar"
            style={{
              width: 28,
              height: 28,
              borderRadius: 'var(--r-md)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              transition: 'background 150ms',
              color: 'var(--muted)',
            }}
            onMouseEnter={e => (e.currentTarget.style.background = 'var(--hairline)')}
            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
          >
            <X style={{ width: 13, height: 13 }} />
          </button>
        </div>

        {/* Seletor de canais */}
        {canais.length > 1 && (
          <div
            style={{
              display: 'flex',
              gap: 4,
              padding: '8px 12px',
              borderBottom: '1px solid var(--hairline)',
              background: 'var(--surfaceAlt)',
              overflowX: 'auto',
              flexShrink: 0,
              scrollbarWidth: 'none',
            }}
          >
            {canais.map(canal => {
              const Icon = CANAL_ICON[canal.tipo] ?? Hash
              const ativo = canal.id === canalAtivo
              return (
                <button
                  key={canal.id}
                  onClick={() => setCanalAtivo(canal.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '4px 10px',
                    borderRadius: 'var(--r-md)',
                    fontSize: 11,
                    fontWeight: 500,
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                    cursor: 'pointer',
                    border: 'none',
                    transition: 'all 150ms',
                    background: ativo ? 'var(--primary)' : 'transparent',
                    color: ativo ? 'var(--primaryInk)' : 'var(--inkSoft)',
                    position: 'relative',
                  }}
                  onMouseEnter={e => {
                    if (!ativo) e.currentTarget.style.background = 'var(--hairline)'
                  }}
                  onMouseLeave={e => {
                    if (!ativo) e.currentTarget.style.background = 'transparent'
                  }}
                >
                  <Icon style={{ width: 11, height: 11 }} />
                  <span style={{ maxWidth: 110, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {canal.nome}
                  </span>
                  {canal.nao_lidos > 0 && (
                    <span
                      style={{
                        minWidth: 16,
                        height: 16,
                        borderRadius: '50%',
                        fontSize: 9,
                        fontWeight: 700,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'var(--danger)',
                        color: '#fff',
                        padding: '0 3px',
                      }}
                    >
                      {canal.nao_lidos > 9 ? '9+' : canal.nao_lidos}
                    </span>
                  )}
                </button>
              )
            })}
          </div>
        )}

        {/* Area de mensagens */}
        <div
          style={{
            flex: 1,
            overflowY: 'auto',
            padding: '16px 14px',
            display: 'flex',
            flexDirection: 'column',
            gap: 14,
            minHeight: 0,
          }}
        >
          {carregandoCanais || carregando ? (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', flex: 1 }}>
              <Loader2 style={{ width: 20, height: 20, color: 'var(--muted)', animation: 'spin 1s linear infinite' }} />
            </div>
          ) : mensagens.length === 0 ? (
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                flex: 1,
                gap: 8,
                textAlign: 'center',
              }}
            >
              <MessageCircle style={{ width: 32, height: 32, color: 'var(--hairline)' }} />
              <p style={{ fontSize: 13, color: 'var(--muted)', margin: 0 }}>
                Nenhuma mensagem ainda.
              </p>
              <p style={{ fontSize: 11, color: 'var(--muted)', margin: 0 }}>
                Seja o primeiro a escrever.
              </p>
            </div>
          ) : (
            mensagens.map(m => (
              <MensagemChatItem
                key={m.id}
                mensagem={m}
                eProprioUsuario={m.autor_id === usuarioId}
              />
            ))
          )}
          <div ref={bottomRef} />
        </div>

        {/* Input */}
        {canalAtivo && (
          <div
            style={{
              padding: '10px 12px',
              borderTop: '1px solid var(--hairline)',
              flexShrink: 0,
            }}
          >
            <InputMensagem canalId={canalAtivo} />
          </div>
        )}
      </div>

      {/* Botao flutuante de abertura */}
      <button
        onClick={toggleAberto}
        aria-label={`${aberto ? 'Fechar' : 'Abrir'} mensagens${naoLidosChat > 0 ? ` (${naoLidosChat} nao lidas)` : ''}`}
        style={{
          position: 'fixed',
          left: 16,
          bottom: 24,
          zIndex: 51,
          width: 46,
          height: 46,
          borderRadius: '50%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          cursor: 'pointer',
          border: '1.5px solid var(--hairline)',
          background: aberto ? 'var(--primary)' : 'var(--surface)',
          color: aberto ? 'var(--primaryInk)' : 'var(--inkSoft)',
          boxShadow: aberto
            ? '0 4px 16px color-mix(in srgb, var(--primary) 25%, transparent)'
            : '0 2px 10px rgba(0,0,0,0.12)',
          transition: 'all 200ms cubic-bezier(0.34, 1.56, 0.64, 1)',
          transform: 'scale(1)',
        }}
        onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.08)')}
        onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
        onMouseDown={e => (e.currentTarget.style.transform = 'scale(0.94)')}
        onMouseUp={e => (e.currentTarget.style.transform = 'scale(1.08)')}
      >
        <MessageCircle style={{ width: 19, height: 19 }} />
        {naoLidosChat > 0 && !aberto && (
          <span
            style={{
              position: 'absolute',
              top: -3,
              right: -3,
              minWidth: 16,
              height: 16,
              borderRadius: 8,
              fontSize: 9,
              fontWeight: 700,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'var(--danger)',
              color: '#fff',
              padding: '0 3px',
              lineHeight: 1,
            }}
          >
            {naoLidosChat > 99 ? '99+' : naoLidosChat}
          </span>
        )}
      </button>
    </>
  )
}
