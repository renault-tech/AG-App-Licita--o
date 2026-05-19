'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Bell, Check, ExternalLink } from 'lucide-react'
import { marcarComoLida, type Notificacao } from '@/lib/actions/notificacoes'

interface ListaNotificacoesProps {
  notificacoes: Notificacao[]
}

function formatarDataHora(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function formatarTempo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1) return 'agora'
  if (min < 60) return `${min}min`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h}h`
  const d = Math.floor(h / 24)
  return `${d}d`
}

export default function ListaNotificacoes({ notificacoes }: ListaNotificacoesProps) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [lista, setLista] = useState(notificacoes)

  function handleMarcarLida(id: string) {
    setLista(prev => prev.map(n => n.id === id ? { ...n, lida: true } : n))
    startTransition(() => marcarComoLida(id))
  }

  function handleClicar(item: Notificacao) {
    if (!item.lida) handleMarcarLida(item.id)
    if (item.link) router.push(item.link)
  }

  if (lista.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center rounded-[var(--r-lg)] border border-hairline bg-surface">
        <Bell className="w-12 h-12 mb-3" style={{ color: 'var(--hairline)' }} />
        <p className="text-sm font-medium text-inkSoft">Nenhuma notificacao</p>
        <p className="text-xs text-muted mt-1">Voce esta em dia com tudo.</p>
      </div>
    )
  }

  return (
    <div className="rounded-[var(--r-lg)] border border-hairline bg-surface overflow-hidden divide-y divide-hairlineSoft">
      {lista.map(item => (
        <div
          key={item.id}
          className={`flex gap-4 px-5 py-4 transition-colors ${
            item.lida ? 'bg-surface' : 'bg-blue-50/40'
          }`}
        >
          {/* Dot */}
          <div className="mt-1.5 shrink-0">
            {!item.lida
              ? <div className="w-2 h-2 rounded-full bg-blue-500" />
              : <div className="w-2 h-2" />
            }
          </div>

          {/* Conteudo */}
          <div className="flex-1 min-w-0">
            <p className={`text-sm font-medium leading-snug ${item.lida ? 'text-inkSoft' : 'text-ink'}`}>
              {item.titulo}
            </p>
            <p className="text-sm text-muted mt-0.5 leading-relaxed">
              {item.mensagem}
            </p>
            <p className="text-xs text-mutedSoft mt-1.5" title={formatarDataHora(item.created_at)}>
              {formatarTempo(item.created_at)} &middot; {formatarDataHora(item.created_at)}
            </p>
          </div>

          {/* Acoes */}
          <div className="flex items-start gap-1 shrink-0 mt-0.5">
            {item.link && (
              <button
                onClick={() => handleClicar(item)}
                className="p-1.5 rounded-[var(--r-sm)] text-muted hover:text-blue-600 hover:bg-blue-50 transition-colors"
                title="Ir para o documento"
              >
                <ExternalLink className="w-4 h-4" />
              </button>
            )}
            {!item.lida && (
              <button
                onClick={() => handleMarcarLida(item.id)}
                className="p-1.5 rounded-[var(--r-sm)] text-muted hover:text-green-600 hover:bg-green-50 transition-colors"
                title="Marcar como lida"
              >
                <Check className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
