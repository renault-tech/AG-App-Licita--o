import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { PapelUsuario } from '@/types/database'
import { DashboardRequisitante } from './dashboard-requisitante'
import { DashboardCompras } from './dashboard-compras'
import { DashboardLicitacoes } from './dashboard-licitacoes'
import { DashboardProcurador } from './dashboard-procurador'
import { DashboardGestorPublico } from './dashboard-gestor-publico'
import { DashboardPublicacao } from './dashboard-publicacao'
import { DashboardAdminOrg } from './dashboard-admin-org'
import { DashboardAdminMaster } from './dashboard-admin-master'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: usuarioData } = await (supabase as any)
    .from('usuarios')
    .select('papel, organizacao_id, cargo')
    .eq('id', user.id)
    .maybeSingle()

  if (!usuarioData) redirect('/login')

  const papel  = (usuarioData as any).papel as string
  const orgId  = (usuarioData as any).organizacao_id as string
  const cargo  = (usuarioData as any).cargo as string | null
  const userId = user.id

  if (!orgId && papel !== 'admin_plataforma') redirect('/onboarding')

  const { data: orgData } = orgId
    ? await (supabase as any).from('organizacoes').select('nome').eq('id', orgId).maybeSingle()
    : { data: null }
  const orgNome = (orgData as any)?.nome ?? ''

  switch (papel) {
    case 'requisitante':
      return <DashboardRequisitante userId={userId} orgId={orgId} cargo={cargo} />
    case 'setor_compras':
      return <DashboardCompras userId={userId} orgId={orgId} cargo={cargo} />
    case 'setor_licitacao':
      return <DashboardLicitacoes userId={userId} orgId={orgId} cargo={cargo} />
    case 'procurador':
      return <DashboardProcurador userId={userId} orgId={orgId} cargo={cargo} />
    case 'gestor_publico':
      return <DashboardGestorPublico userId={userId} orgId={orgId} cargo={cargo} />
    case 'publicacao':
      return <DashboardPublicacao userId={userId} orgId={orgId} cargo={cargo} />
    case 'admin_organizacao':
      return <DashboardAdminOrg userId={userId} orgId={orgId} orgNome={orgNome} cargo={cargo} />
    case 'admin_plataforma':
      return <DashboardAdminMaster userId={userId} />
    default:
      return <DashboardRequisitante userId={userId} orgId={orgId} cargo={cargo} />
  }
}
