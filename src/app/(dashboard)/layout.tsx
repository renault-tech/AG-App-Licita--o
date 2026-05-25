import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppHeader } from '@/components/layout/app-header'
import { ChatLauncher } from '@/components/layout/chat-launcher'
import DemoSwitcher from '@/components/layout/demo-switcher'
import { DemoBanner } from '@/components/admin/demo-banner'
import { obterNotificacoes } from '@/lib/actions/notificacoes'
import { obterPapelUsuario } from '@/lib/actions/usuario'
import { seedClausulasPadrao } from '@/lib/actions/clausulas'
import { buscarEventosTicker, lerPreferenciasTicker } from '@/lib/actions/ticker'
import { contarNaoLidosTotal } from '@/lib/actions/chat'
import { obterConfiguracoes } from '@/lib/actions/configuracoes-plataforma'
import { getDemoSession, sairModoDemo } from '@/lib/demo-session'
import { obterPerfilAtivo } from '@/lib/perfil-session'
import type { PapelUsuario } from '@/types/database'
import type { ThemeName } from '@/lib/theme/provider'
import { OrgThemeApplicator } from '@/components/licita/org-theme-applicator'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Seed silencioso: so insere clausulas_padrao se tabela estiver vazia
  seedClausulasPadrao().catch(() => {})

  const demoSession = await getDemoSession()

  const [usuarioComOrgRes, creditosRes, { notificacoes, naoLidas }, papelReal, eventosTicker, tickerCategorias, naoLidosChat, perfilAtivoCookie, configs] = await Promise.all([
    supabase
      .from('usuarios')
      .select('id, nome_completo, cargo, organizacao_id, organizacoes(nome, cnpj, brasao_url, tema_padrao)')
      .eq('id', user.id)
      .maybeSingle(),
    (supabase as any).from('creditos_usuario').select('saldo').eq('usuario_id', user.id).maybeSingle(),
    obterNotificacoes(),
    obterPapelUsuario(),
    buscarEventosTicker(),
    lerPreferenciasTicker(),
    contarNaoLidosTotal(),
    obterPerfilAtivo(),
    obterConfiguracoes(),
  ])

  const adminOrgPodeTrocar = configs['admin_org_pode_trocar_perfil'] === 'true'
  const podeTracarPerfil =
    papelReal === 'admin_plataforma' ||
    (papelReal === 'admin_organizacao' && adminOrgPodeTrocar)

  const papelAtual = (podeTracarPerfil && perfilAtivoCookie) ? perfilAtivoCookie : papelReal

  const row = usuarioComOrgRes.data as {
    id?: string
    nome_completo?: string
    cargo?: string
    organizacao_id?: string
    organizacoes?: { nome?: string; cnpj?: string; brasao_url?: string; tema_padrao?: string } | null
  } | null
  const usuario = row
  const org = row?.organizacoes ?? null

  const temaPadraoOrg = (org as any)?.tema_padrao as ThemeName ?? 'petroleo'

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'var(--bg)' }}>
      <OrgThemeApplicator temaOrg={temaPadraoOrg} />
      {demoSession.ativo && demoSession.papelSimulado && (
        <>
          <DemoBanner
            papelSimulado={demoSession.papelSimulado}
            onSair={sairModoDemo}
          />
          <div style={{ paddingTop: 44 }} />
        </>
      )}
      <AppHeader
        orgNome={org?.nome ?? 'Prefeitura Municipal'}
        orgCnpj={org?.cnpj ?? ''}
        nomeUsuario={usuario?.nome_completo ?? null}
        cargo={usuario?.cargo ?? null}
        saldoCreditos={(creditosRes.data as any)?.saldo ?? null}
        notificacoes={notificacoes}
        naoLidas={naoLidas}
        papel={papelAtual}
        papelReal={papelReal}
        isAdminPlataforma={papelReal === 'admin_plataforma'}
        podeTracarPerfil={podeTracarPerfil}
        brasaoUrl={org?.brasao_url ?? null}
        usuarioId={user.id}
        eventosTicker={eventosTicker}
        tickerCategorias={tickerCategorias}
      />
      <main
        className="flex-1 max-w-[1400px] mx-auto w-full px-6 md:px-8 lg:px-12 py-10 pb-32"
        style={{ zoom: 'var(--zoom-level, 1)' }}
      >
        {children}
      </main>
      <ChatLauncher naoLidosChat={naoLidosChat} />
      {demoSession.ativo && papelAtual && <DemoSwitcher papelAtual={papelAtual as PapelUsuario} />}
    </div>
  )
}
