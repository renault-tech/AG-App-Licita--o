import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { buscarCanaisComNaoLidos, garantirCanalPlataforma, garantirCanalSetor } from '@/lib/actions/chat'
import { SidebarCanais } from '@/components/chat/sidebar-canais'

export default async function ChatLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: usr } = await supabase
    .from('usuarios')
    .select('organizacao_id')
    .eq('id', user.id)
    .single()

  const orgId = (usr as any)?.organizacao_id
  if (orgId) {
    await garantirCanalPlataforma()
    const { data: secretarias } = await (supabase as any)
      .from('secretarias')
      .select('id, nome')
      .eq('organizacao_id', orgId)
      .eq('ativa', true)
    for (const s of (secretarias ?? []) as any[]) {
      await garantirCanalSetor(s.id, s.nome)
    }
  }

  const canais = await buscarCanaisComNaoLidos()

  return (
    <div
      className="flex rounded-[var(--r-lg)] border overflow-hidden"
      style={{
        background: 'var(--surface)',
        borderColor: 'var(--hairline)',
        height: 'calc(100vh - 180px)',
        minHeight: '500px',
      }}
    >
      <SidebarCanais canais={canais} />
      <div className="flex-1 min-w-0 overflow-hidden">
        {children}
      </div>
    </div>
  )
}
