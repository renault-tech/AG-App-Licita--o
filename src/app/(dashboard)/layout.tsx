import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Navbar from '@/components/layout/navbar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('nome_completo, organizacao_id')
    .eq('id', user.id)
    .maybeSingle()

  const { data: creditos } = await (supabase as any)
    .from('creditos_usuario')
    .select('saldo')
    .eq('usuario_id', user.id)
    .maybeSingle()

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <Navbar
        user={user}
        nomeUsuario={(usuario as any)?.nome_completo ?? null}
        saldoCreditos={(creditos as any)?.saldo ?? null}
      />
      <main className="flex-1 container mx-auto px-4 py-6 max-w-7xl">
        {children}
      </main>
    </div>
  )
}
