import { redirect } from 'next/navigation'
import Link from 'next/link'
import { PlusCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { listarSolicitacoes } from '@/lib/actions/solicitacoes'
import { ListaSolicitacoes } from './lista-solicitacoes'
import { EditorialKicker, HeadlineSerif } from '@/components/licita/editorial'

export default async function SolicitacoesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: usuarioRaw } = await supabase
    .from('usuarios')
    .select('papel')
    .eq('id', user.id)
    .maybeSingle()

  const usuario = usuarioRaw as { papel: string } | null
  const papeisGestao = ['setor_compras', 'setor_licitacao', 'admin_organizacao', 'admin_plataforma']
  const isGestao = papeisGestao.includes(usuario?.papel ?? '')

  // Requisitante ve apenas as proprias (filtro feito via RLS na action)
  const solicitacoes = await listarSolicitacoes()

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <EditorialKicker
        kicker="Solicitações de Compra"
        date={new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }).replaceAll('/', '·')}
      />
      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <HeadlineSerif size="md" as="h1">
            {isGestao ? 'Solicitações de Compra' : 'Minhas Solicitações'}
          </HeadlineSerif>
          <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
            {isGestao
              ? 'Gerencie as solicitações recebidas das secretarias.'
              : 'Acompanhe o status das suas solicitações de compra.'}
          </p>
        </div>
        <Link
          href="/solicitacoes/nova"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-[var(--r-md)] text-sm font-semibold transition-all hover:brightness-110 shadow-[0_2px_8px_rgba(0,0,0,0.12)]"
          style={{ background: 'var(--primary)', color: 'var(--primaryInk)' }}
        >
          <PlusCircle className="w-4 h-4" />
          Nova Solicitação
        </Link>
      </div>

      <ListaSolicitacoes solicitacoes={solicitacoes} isGestao={isGestao} />
    </div>
  )
}
