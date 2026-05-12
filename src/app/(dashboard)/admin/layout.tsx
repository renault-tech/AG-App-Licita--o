import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ShieldCheck } from 'lucide-react'
import SidebarAdmin from './sidebar-admin'

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: usuarioData } = await supabase
    .from('usuarios')
    .select('papel')
    .eq('id', user.id)
    .maybeSingle()

  if ((usuarioData as any)?.papel !== 'admin_plataforma') redirect('/dashboard')

  return (
    <div className="max-w-[1200px] mx-auto">
      {/* Cabecalho da area administrativa */}
      <div className="mb-8 pb-6 border-b border-[#E3E2E6]">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: '#1A365D' }}
          >
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <div>
            <p className="text-[10px] font-semibold text-[#B7935E] uppercase tracking-widest">
              Administracao
            </p>
            <h1
              className="text-xl font-bold text-[#1A365D] leading-tight"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              Plataforma LicitaIA
            </h1>
          </div>
        </div>
      </div>

      <div className="flex gap-8">
        <SidebarAdmin />
        <div className="flex-1 min-w-0">
          {children}
        </div>
      </div>
    </div>
  )
}