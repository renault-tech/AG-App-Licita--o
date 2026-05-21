'use client'

import { useState, useRef, useEffect, useTransition } from 'react'
import { Send, Trash2, Zap, Bot } from 'lucide-react'
import { enviarMensagemAssistente, limparHistoricoAssistente } from '@/lib/actions/assistente-ia'
import type { MensagemAssistente } from '@/types/chat'

interface AssistenteIAPanelProps {
  processoId: string
  historicoInicial: MensagemAssistente[]
  saldoCreditos: number
}

export function AssistenteIAPanel({ processoId, historicoInicial, saldoCreditos }: AssistenteIAPanelProps) {
  const [historico, setHistorico] = useState<MensagemAssistente[]>(historicoInicial)
  const [texto, setTexto] = useState('')
  const [erro, setErro] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [historico.length])

  function enviar() {
    const conteudo = texto.trim()
    if (!conteudo || isPending) return
    setTexto('')
    setErro(null)

    const msgUsuario: MensagemAssistente = {
      role: 'user',
      content: conteudo,
      timestamp: new Date().toISOString(),
    }
    setHistorico(prev => [...prev, msgUsuario])

    startTransition(async () => {
      const result = await enviarMensagemAssistente(processoId, conteudo)
      if (result.success && result.resposta) {
        setHistorico(prev => [...prev, {
          role: 'assistant',
          content: result.resposta!,
          timestamp: new Date().toISOString(),
        }])
      } else {
        setErro(result.error ?? 'Erro desconhecido')
        setHistorico(prev => prev.slice(0, -1))
      }
    })
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar() }
  }

  function limpar() {
    setHistorico([])
    startTransition(() => limparHistoricoAssistente(processoId))
  }

  return (
    <div
      className="flex flex-col rounded-[var(--r-lg)] border overflow-hidden"
      style={{ background: 'var(--surface)', borderColor: 'var(--hairline)', minHeight: '500px' }}
    >
      {/* Header */}
      <div
        className="flex items-center justify-between px-4 py-3 border-b"
        style={{ background: 'var(--surfaceAlt)', borderColor: 'var(--hairline)' }}
      >
        <div className="flex items-center gap-2">
          <Bot className="w-4 h-4" style={{ color: 'var(--primary)' }} />
          <span className="text-sm font-semibold" style={{ color: 'var(--ink)', fontFamily: 'var(--font-heading)' }}>
            Assistente IA
          </span>
          <span className="text-[10px]" style={{ color: 'var(--muted)' }}>
            Art. 53, Lei 14.133/21
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1 text-xs font-semibold" style={{ color: 'var(--accent)' }}>
            <Zap className="w-3 h-3" /> {saldoCreditos} creditos
          </span>
          <button
            onClick={limpar}
            className="p-1.5 rounded-[var(--r-sm)] transition-colors hover:bg-surfaceAlt"
            style={{ color: 'var(--muted)' }}
            title="Limpar conversa"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Mensagens */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4" style={{ maxHeight: '55vh' }}>
        {historico.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center gap-3">
            <Bot className="w-10 h-10" style={{ color: 'var(--primary)', opacity: 0.4 }} />
            <p className="text-sm" style={{ color: 'var(--muted)' }}>
              Pergunte sobre este processo ou sobre a Lei 14.133/21.
            </p>
            <p className="text-xs" style={{ color: 'var(--muted)' }}>
              Cada pergunta consome 2 creditos.
            </p>
          </div>
        ) : (
          historico.map((m, i) => (
            <div key={i} className={`flex gap-2.5 ${m.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 text-[10px] font-bold"
                style={{
                  background: m.role === 'user' ? 'var(--primary)' : 'var(--accentWash)',
                  color: m.role === 'user' ? 'var(--primaryInk)' : 'var(--accent)',
                }}
              >
                {m.role === 'user' ? 'EU' : <Bot className="w-3.5 h-3.5" />}
              </div>
              <div
                className="max-w-[78%] px-3 py-2 text-sm leading-relaxed"
                style={{
                  background: m.role === 'user' ? 'var(--primary)' : 'var(--surfaceAlt)',
                  color: m.role === 'user' ? 'var(--primaryInk)' : 'var(--ink)',
                  whiteSpace: 'pre-wrap',
                  borderRadius: m.role === 'user' ? '12px 4px 12px 12px' : '4px 12px 12px 12px',
                }}
              >
                {m.content}
              </div>
            </div>
          ))
        )}
        {isPending && (
          <div className="flex gap-2.5">
            <div
              className="w-7 h-7 rounded-full flex items-center justify-center shrink-0"
              style={{ background: 'var(--accentWash)' }}
            >
              <Bot className="w-3.5 h-3.5" style={{ color: 'var(--accent)' }} />
            </div>
            <div
              className="px-3 py-2 rounded-[var(--r-md)] text-sm"
              style={{ background: 'var(--surfaceAlt)', color: 'var(--muted)' }}
            >
              Pensando...
            </div>
          </div>
        )}
        {erro && (
          <p className="text-xs text-center py-2" style={{ color: 'var(--danger)' }}>{erro}</p>
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="px-4 py-3 border-t" style={{ borderColor: 'var(--hairline)' }}>
        <div
          className="flex items-end gap-2 px-3 py-2 rounded-[var(--r-lg)] border"
          style={{ background: 'var(--surface)', borderColor: 'var(--hairline)' }}
        >
          <textarea
            value={texto}
            onChange={e => setTexto(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Pergunte sobre este processo ou a Lei 14.133/21..."
            rows={1}
            disabled={isPending || saldoCreditos < 2}
            className="flex-1 resize-none bg-transparent text-sm outline-none leading-relaxed"
            style={{ color: 'var(--ink)', maxHeight: '100px', overflow: 'auto' }}
          />
          <button
            onClick={enviar}
            disabled={!texto.trim() || isPending || saldoCreditos < 2}
            className="w-8 h-8 rounded-[var(--r-md)] flex items-center justify-center shrink-0 transition-all"
            style={{
              background: texto.trim() && !isPending ? 'var(--primary)' : 'var(--hairline)',
              color: texto.trim() && !isPending ? 'var(--primaryInk)' : 'var(--muted)',
            }}
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
        {saldoCreditos < 2 && (
          <p className="text-xs mt-1.5 text-center" style={{ color: 'var(--danger)' }}>
            Creditos insuficientes para usar o assistente.
          </p>
        )}
      </div>
    </div>
  )
}
