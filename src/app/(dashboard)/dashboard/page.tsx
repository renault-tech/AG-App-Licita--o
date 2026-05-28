import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { PapelUsuario } from '@/types/database'
import { obterPerfilAtivo } from '@/lib/perfil-session'
import { obterConfiguracoes } from '@/lib/actions/configuracoes-plataforma'
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
    .select('papel, organizacao_id, cargo, nome_completo')
    .eq('id', user.id)
    .maybeSingle()

  if (!usuarioData) redirect('/login')

  const papelReal    = (usuarioData as any).papel as PapelUsuario
  const orgId        = (usuarioData as any).organizacao_id as string
  const cargo        = (usuarioData as any).cargo as string | null
  const nomeCompleto = (usuarioData as any).nome_completo as string | null
  const userId       = user.id

  // Respeita perfil sobreposto (troca de perfil pelo admin)
  const configs           = await obterConfiguracoes()
  const adminOrgPodeTrocar = configs['admin_org_pode_trocar_perfil'] === 'true'
  const podeTracar         =
    papelReal === 'admin_plataforma' ||
    (papelReal === 'admin_organizacao' && adminOrgPodeTrocar)
  const perfilCookie = podeTracar ? await obterPerfilAtivo() : null
  const papel        = (perfilCookie ?? papelReal) as string

  if (!orgId && papelReal !== 'admin_plataforma') redirect('/onboarding')

  const { data: orgData } = orgId
    ? await (supabase as any).from('organizacoes').select('nome').eq('id', orgId).maybeSingle()
    : { data: null }
  const orgNome = (orgData as any)?.nome ?? ''

  switch (papel) {
    case 'requisitante':
      return <DashboardRequisitante userId={userId} orgId={orgId} cargo={cargo} nome={nomeCompleto} />
    case 'setor_compras':
      return <DashboardCompras userId={userId} orgId={orgId} cargo={cargo} nome={nomeCompleto} />
    case 'setor_licitacao':
      return <DashboardLicitacoes userId={userId} orgId={orgId} cargo={cargo} nome={nomeCompleto} />
    case 'procurador':
      return <DashboardProcurador userId={userId} orgId={orgId} cargo={cargo} nome={nomeCompleto} />
    case 'gestor_publico':
      return <DashboardGestorPublico userId={userId} orgId={orgId} cargo={cargo} nome={nomeCompleto} />
    case 'publicacao':
      return <DashboardPublicacao userId={userId} orgId={orgId} cargo={cargo} nome={nomeCompleto} />
    case 'admin_organizacao':
      return <DashboardAdminOrg userId={userId} orgId={orgId} orgNome={orgNome} cargo={cargo} nome={nomeCompleto} />
    case 'admin_plataforma':
      return <DashboardAdminMaster userId={userId} nome={nomeCompleto} />
    default:
      return <DashboardRequisitante userId={userId} orgId={orgId} cargo={cargo} nome={nomeCompleto} />
  }
}
