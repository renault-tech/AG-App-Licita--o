import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppHeader } from '@/components/layout/app-header'
import DemoSwitcher from '@/components/layout/demo-switcher'
import { ChatPanel } from '@/components/chat/chat-panel'
import { obterNotificacoes } from '@/lib/actions/notificacoes'
import { obterPapelUsuario } from '@/lib/actions/usuario'
import { seedClausulasPadrao } from '@/lib/actions/clausulas'
import { contarNaoLidas } from '@/lib/actions/chat'
import type { PapelUsuario } from '@/types/database'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  // Seed silencioso: so insere clausulas_padrao se tabela estiver vazia
  seedClausulasPadrao().catch(() => {})

  const [usuarioComOrgRes, creditosRes, { notificacoes, naoLidas }, papelAtual, contagem] = await Promise.all([
    supabase
      .from('usuarios')
      .select('id, nome_completo, cargo, organizacao_id, organizacoes(nome, cnpj, brasao_url)')
      .eq('id', user.id)
      .maybeSingle(),
    (supabase as any).from('creditos_usuario').select('saldo').eq('usuario_id', user.id).maybeSingle(),
    obterNotificacoes(),
    obterPapelUsuario(),
    contarNaoLidas(),
  ])

  const row = usuarioComOrgRes.data as {
    id?: string
    nome_completo?: string
    cargo?: string
    organizacao_id?: string
    organizacoes?: { nome?: string; cnpj?: string; brasao_url?: string } | null
  } | null
  const usuario = row
  const org = row?.organizacoes ?? null

  // Dados minimos para o ChatPanel (usuario autenticado com papel e organizacao)
  const usuarioChat = papelAtual && row?.id && row?.organizacao_id
    ? { id: row.id, papel: papelAtual, organizacao_id: row.organizacao_id }
    : null

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
      />
      <main 
        className="flex-1 max-w-[1400px] mx-auto w-full px-6 md:px-8 lg:px-12 py-10 pb-32"
        style={{ zoom: 'var(--zoom-level, 1)' }}
      >
        {children}
      </main>
      {papelAtual && <DemoSwitcher papelAtual={papelAtual as PapelUsuario} />}
      {usuarioChat && (
        <ChatPanel
          usuarioId={usuarioChat.id}
          papelUsuario={usuarioChat.papel}
          organizacaoId={usuarioChat.organizacao_id}
          naoLidasDireto={contagem.direto}
        />
      )}
    </div>
  )
}
