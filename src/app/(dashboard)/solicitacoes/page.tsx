import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { listarSolicitacoes } from '@/lib/actions/solicitacoes'
import { ListaSolicitacoes } from './lista-solicitacoes'

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-900">
            {isGestao ? 'Solicitacoes de Compra' : 'Minhas Solicitacoes'}
          </h1>
          <p className="text-sm text-gray-500">
            {isGestao
              ? 'Gerencie as solicitacoes recebidas das secretarias.'
              : 'Acompanhe o status das suas solicitacoes de compra.'}
          </p>
        </div>
        <a
          href="/solicitacoes/nova"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1A365D] text-white text-sm font-medium hover:bg-[#1A365D]/90 transition-colors"
        >
          Nova Solicitacao
        </a>
      </div>

      <ListaSolicitacoes solicitacoes={solicitacoes} isGestao={isGestao} />
    </div>
  )
}
