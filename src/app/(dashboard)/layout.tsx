import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppHeader } from '@/components/layout/app-header'
import DemoSwitcher from '@/components/layout/demo-switcher'
import { obterNotificacoes } from '@/lib/actions/notificacoes'
import { obterPapelUsuario } from '@/lib/actions/usuario'
import { seedClausulasPadrao } from '@/lib/actions/clausulas'
import { buscarEventosTicker, lerPreferenciasTicker } from '@/lib/actions/ticker'
import type { TickerEvento, TickerCategoriaId } from '@/lib/ticker/categorias'
import type { PapelUsuario } from '@/types/database'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Seed silencioso: so insere clausulas_padrao se tabela estiver vazia
  seedClausulasPadrao().catch(() => {})

  const [usuarioComOrgRes, creditosRes, { notificacoes, naoLidas }, papelAtual, eventosTicker, tickerCategorias] = await Promise.all([
    supabase
      .from('usuarios')
      .select('nome_completo, cargo, organizacoes(nome, cnpj, brasao_url)')
      .eq('id', user.id)
      .maybeSingle(),
    (supabase as any).from('creditos_usuario').select('saldo').eq('usuario_id', user.id).maybeSingle(),
    obterNotificacoes(),
    obterPapelUsuario(),
    buscarEventosTicker(),
    lerPreferenciasTicker(),
  ])

  const row = usuarioComOrgRes.data as {
    nome_completo?: string
    cargo?: string
    organizacoes?: { nome?: string; cnpj?: string; brasao_url?: string } | null
  } | null
  const usuario = row
  const org = row?.organizacoes ?? null

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)' }}>
      <AppHeader
        orgNome={org?.nome ?? 'Prefeitura Municipal'}
        orgCnpj={org?.cnpj ?? ''}
        nomeUsuario={usuario?.nome_completo ?? null}
        cargo={usuario?.cargo ?? null}
        saldoCreditos={(creditosRes.data as any)?.saldo ?? null}
        notificacoes={notificacoes}
        naoLidas={naoLidas}
        papel={papelAtual}
        isAdminPlataforma={papelAtual === 'admin_plataforma'}
        brasaoUrl={org?.brasao_url ?? null}
        eventosTicker={eventosTicker}
        tickerCategorias={tickerCategorias}
      />
      <main 
        className="flex-1 max-w-[1400px] mx-auto w-full px-6 md:px-8 lg:px-12 py-10 pb-32"
        style={{ zoom: 'var(--zoom-level, 1)' }}
      >
        {children}
      </main>
      {papelAtual && <DemoSwitcher papelAtual={papelAtual as PapelUsuario} />}
    </div>
  )
}
