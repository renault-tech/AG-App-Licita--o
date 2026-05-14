import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Settings2 } from 'lucide-react'
import { PODE_CONFIGURAR } from '@/lib/permissions'
import type { PapelUsuario } from '@/types/database'
import SidebarConfiguracoes from './sidebar-configuracoes'

export default async function ConfiguracoesLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: usuarioData } = await supabase
    .from('usuarios')
    .select('papel')
    .eq('id', user.id)
    .maybeSingle()

  const papel = (usuarioData as any)?.papel as PapelUsuario | undefined

  if (!papel || !PODE_CONFIGURAR.includes(papel)) {
    redirect('/dashboard')
  }

  /* Buscar brasao da org para exibir no cabecalho */
  const { data: orgData } = await (supabase as any)
    .from('organizacoes')
    .select('nome, brasao_url')
    .maybeSingle()

  const brasaoUrl: string | null = orgData?.brasao_url ?? null
  const orgNome: string = orgData?.nome ?? 'Sua Organizacao'

  return (
    <div className="max-w-[1100px] mx-auto">

      {/* Cabecalho */}
      <div className="mb-8 pb-6" style={{ borderBottom: '1px solid var(--hairline)' }}>
        <div className="flex items-center gap-3">
          {/* Logo da prefeitura (PNG ou icone fallback) */}
          {brasaoUrl ? (
            <div className="shrink-0 flex items-center" style={{ height: 44 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={brasaoUrl}
                alt="Logo da prefeitura"
                style={{ height: 44, width: 'auto', maxWidth: 32, objectFit: 'contain' }}
              />
            </div>
          ) : (
            <div
              className="w-10 h-10 rounded-[var(--r-md)] flex items-center justify-center shrink-0"
              style={{ background: 'var(--primary)' }}
            >
              <Settings2 className="w-5 h-5 text-white" />
            </div>
          )}
          <div>
            <p
              className="text-[10px] font-semibold uppercase tracking-widest"
              style={{ color: 'var(--accent)' }}
            >
              Configuracoes
            </p>
            <h1
              className="text-xl font-bold leading-tight"
              style={{ color: 'var(--primary)', fontFamily: 'var(--font-heading)' }}
            >
              {orgNome}
            </h1>
          </div>
        </div>
      </div>

      <div className="flex gap-8">
        <SidebarConfiguracoes brasaoUrl={brasaoUrl} orgNome={orgNome} />
        <div className="flex-1 min-w-0">
          {children}
        </div>
      </div>
    </div>
  )
}
