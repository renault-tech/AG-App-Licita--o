import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { obterTodasNotificacoes, marcarTodasComoLidas } from '@/lib/actions/notificacoes'
import ListaNotificacoes from './lista-notificacoes'

export default async function NotificacoesPage({
  searchParams,
}: {
  searchParams: Promise<{ filtro?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { filtro } = await searchParams
  const apenasPendentes = filtro === 'nao_lidas'

  const { notificacoes, naoLidas } = await obterTodasNotificacoes(apenasPendentes ? 'nao_lidas' : undefined)

  async function handleMarcarTodas() {
    'use server'
    await marcarTodasComoLidas()
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-ink tracking-tight">Notificacoes</h1>
          <p className="text-sm text-muted mt-1">
            {naoLidas > 0 ? `${naoLidas} nao lida${naoLidas !== 1 ? 's' : ''}` : 'Todas lidas'}
          </p>
        </div>
        {naoLidas > 0 && (
          <form action={handleMarcarTodas}>
            <button
              type="submit"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--r-md)] border border-hairline text-xs font-medium text-inkSoft hover:bg-surfaceAlt transition-colors"
            >
              Marcar todas como lidas
            </button>
          </form>
        )}
      </div>

      {/* Filtros */}
      <div className="flex gap-2">
        <a
          href="/notificacoes"
          className={`px-3 py-1.5 rounded-[var(--r-md)] text-xs font-medium transition-colors ${
            !apenasPendentes
              ? 'bg-primary text-primaryInk'
              : 'text-inkSoft hover:bg-surfaceAlt border border-hairline'
          }`}
        >
          Todas
        </a>
        <a
          href="/notificacoes?filtro=nao_lidas"
          className={`px-3 py-1.5 rounded-[var(--r-md)] text-xs font-medium transition-colors ${
            apenasPendentes
              ? 'bg-primary text-primaryInk'
              : 'text-inkSoft hover:bg-surfaceAlt border border-hairline'
          }`}
        >
          Nao lidas
          {naoLidas > 0 && !apenasPendentes && (
            <span className="ml-1.5 bg-red-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">
              {naoLidas}
            </span>
          )}
        </a>
      </div>

      <ListaNotificacoes notificacoes={notificacoes} />
    </div>
  )
}
