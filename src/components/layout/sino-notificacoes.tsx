'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Bell, Check, CheckCheck, ExternalLink, ArrowRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { createClient } from '@/lib/supabase/client'
import { marcarComoLida, marcarTodasComoLidas, type Notificacao } from '@/lib/actions/notificacoes'

interface SinoNotificacoesProps {
  notificacoes: Notificacao[]
  naoLidas: number
  usuarioId?: string
}

function formatarTempo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 60) return `${min}min`
  const h = Math.floor(min / 60)
  if (h < 24) return `${h}h`
  return `${Math.floor(h / 24)}d`
}

export default function SinoNotificacoes({ notificacoes, naoLidas, usuarioId }: SinoNotificacoesProps) {
  const router = useRouter()
  const [aberto, setAberto] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [listaLocal, setListaLocal] = useState(notificacoes)
  const [naoLidasLocal, setNaoLidasLocal] = useState(naoLidas)
  const [pulsando, setPulsando] = useState(false)

  useEffect(() => {
    if (!usuarioId) return
    const supabase = createClient()
    const channel = supabase
      .channel(`notificacoes-${usuarioId}`)
      .on(
        'postgres_changes' as any,
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notificacoes',
          filter: `usuario_id=eq.${usuarioId}`,
        },
        (payload: { new: Record<string, unknown> }) => {
          const nova = payload.new as unknown as Notificacao
          setListaLocal(prev => [nova, ...prev].slice(0, 30))
          setNaoLidasLocal(prev => prev + 1)
          setPulsando(true)
          setTimeout(() => setPulsando(false), 2500)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [usuarioId])

  function handleMarcarLida(id: string) {
    setListaLocal(prev => prev.map(n => n.id === id ? { ...n, lida: true } : n))
    setNaoLidasLocal(prev => Math.max(0, prev - 1))
    startTransition(() => marcarComoLida(id))
  }

  function handleMarcarTodas() {
    setListaLocal(prev => prev.map(n => ({ ...n, lida: true })))
    setNaoLidasLocal(0)
    startTransition(() => marcarTodasComoLidas())
  }

  function handleClicarNotificacao(item: Notificacao) {
    if (!item.lida) handleMarcarLida(item.id)
    if (item.link) {
      setAberto(false)
      router.push(item.link)
    }
  }

  return (
    <DropdownMenu open={aberto} onOpenChange={setAberto}>
      <DropdownMenuTrigger
        className="relative p-1.5 rounded-full text-gray-500 hover:bg-gray-100 hover:text-gray-700 transition-colors outline-none"
        aria-label={`Notificacoes${naoLidasLocal > 0 ? `, ${naoLidasLocal} nao lidas` : ''}`}
      >
        <Bell className={`w-4 h-4 transition-transform ${pulsando ? 'scale-125' : ''}`} />
        {naoLidasLocal > 0 && (
          <span
            className={`absolute -top-0.5 -right-0.5 min-w-[16px] h-4 flex items-center justify-center rounded-full bg-red-500 text-white text-[10px] font-bold px-0.5 transition-transform ${pulsando ? 'scale-110' : ''}`}
          >
            {naoLidasLocal > 99 ? '99+' : naoLidasLocal}
          </span>
        )}
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-80 p-0" sideOffset={8}>
        {/* Cabecalho */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <span className="text-sm font-semibold text-gray-900">Notificacoes</span>
          {naoLidasLocal > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs gap-1 text-blue-600 hover:text-blue-700 hover:bg-blue-50 px-2"
              onClick={handleMarcarTodas}
              disabled={isPending}
            >
              <CheckCheck className="w-3 h-3" />
              Marcar todas como lidas
            </Button>
          )}
        </div>

        {/* Lista */}
        <div className="max-h-[400px] overflow-y-auto divide-y divide-gray-50">
          {listaLocal.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center">
              <Bell className="w-8 h-8 text-gray-200 mb-2" />
              <p className="text-sm text-gray-400">Nenhuma notificacao</p>
            </div>
          ) : (
            listaLocal.map(item => (
              <div
                key={item.id}
                className={`flex gap-3 px-4 py-3 transition-colors ${
                  item.lida ? 'bg-white hover:bg-gray-50' : 'bg-blue-50/60 hover:bg-blue-50'
                }`}
              >
                {/* Indicador de nao lida */}
                <div className="mt-1.5 shrink-0">
                  {!item.lida ? (
                    <div className="w-2 h-2 rounded-full bg-blue-500" />
                  ) : (
                    <div className="w-2 h-2" />
                  )}
                </div>

                {/* Conteudo */}
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-medium leading-snug ${item.lida ? 'text-gray-600' : 'text-gray-900'}`}>
                    {item.titulo}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5 leading-snug line-clamp-2">
                    {item.mensagem}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-1">{formatarTempo(item.created_at)}</p>
                </div>

                {/* Acoes */}
                <div className="flex items-start gap-1 shrink-0 mt-1">
                  {item.link && (
                    <button
                      onClick={() => handleClicarNotificacao(item)}
                      className="p-1 rounded text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                      title="Ir para o documento"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  )}
                  {!item.lida && (
                    <button
                      onClick={() => handleMarcarLida(item.id)}
                      className="p-1 rounded text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors"
                      title="Marcar como lida"
                    >
                      <Check className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Rodape */}
        <div className="border-t border-gray-100 px-4 py-2.5 flex items-center justify-between">
          <p className="text-xs text-gray-400">
            {listaLocal.length} notificacao{listaLocal.length !== 1 ? 's' : ''}
          </p>
          <Link
            href="/notificacoes"
            onClick={() => setAberto(false)}
            className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium transition-colors"
          >
            Ver todas
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
