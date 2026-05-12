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

  return (
    <div className="max-w-[1100px] mx-auto">

      {/* Cabecalho */}
      <div className="mb-8 pb-6 border-b border-[#E3E2E6]">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: '#1A365D' }}
          >
            <Settings2 className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-[#B7935E] uppercase tracking-widest">
              Configuracoes
            </p>
            <h1
              className="text-xl font-bold text-[#1A365D] leading-tight"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              Sua Organizacao
            </h1>
          </div>
        </div>
      </div>

      <div className="flex gap-8">
        <SidebarConfiguracoes />
        <div className="flex-1 min-w-0">
          {children}
        </div>
      </div>
    </div>
  )
}