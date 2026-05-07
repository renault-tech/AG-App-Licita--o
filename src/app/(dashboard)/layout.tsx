import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Navbar from '@/components/layout/navbar'
import DemoSwitcher from '@/components/layout/demo-switcher'
import { obterNotificacoes } from '@/lib/actions/notificacoes'
import { obterPapelUsuario } from '@/lib/actions/usuario'
import type { PapelUsuario } from '@/types/database'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const [usuarioRes, creditosRes, { notificacoes, naoLidas }, papelAtual] = await Promise.all([
    supabase.from('usuarios').select('nome_completo, organizacao_id').eq('id', user.id).maybeSingle(),
    (supabase as any).from('creditos_usuario').select('saldo').eq('usuario_id', user.id).maybeSingle(),
    obterNotificacoes(),
    obterPapelUsuario(),
  ])

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar
        user={user}
        nomeUsuario={(usuarioRes.data as any)?.nome_completo ?? null}
        saldoCreditos={(creditosRes.data as any)?.saldo ?? null}
        notificacoes={notificacoes}
        naoLidas={naoLidas}
      />
      <main className="flex-1 container mx-auto px-4 py-6 max-w-7xl pb-24">
        {children}
      </main>
      {papelAtual && <DemoSwitcher papelAtual={papelAtual as PapelUsuario} />}
    </div>
  )
}
