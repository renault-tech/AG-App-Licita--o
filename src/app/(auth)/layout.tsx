import { createServiceClient } from '@/lib/supabase/server'
import AuthLayoutClient from './layout-client'

export default async function AuthLayout({ children }: { children: React.ReactNode }) {
  // Busca logo e nome da primeira org cadastrada (single-tenant)
  // Usa service client pois o usuario ainda nao esta autenticado
  let brasaoUrl: string | null = null
  let orgNome: string | null = null
  let temaPadrao: string = 'petroleo'

  try {
    const supabase = await createServiceClient()
    const { data: org } = await (supabase as any)
      .from('organizacoes')
      .select('brasao_url, nome, tema_padrao')
      .order('created_at', { ascending: true })
      .limit(1)
      .maybeSingle()

    brasaoUrl = org?.brasao_url ?? null
    orgNome   = org?.nome ?? null
    temaPadrao = org?.tema_padrao ?? 'petroleo'
  } catch {
    // Fail gracefully — mostra identidade generica da plataforma
  }

  return (
    <AuthLayoutClient brasaoUrl={brasaoUrl} orgNome={orgNome} temaPadrao={temaPadrao}>
      {children}
    </AuthLayoutClient>
  )
}
