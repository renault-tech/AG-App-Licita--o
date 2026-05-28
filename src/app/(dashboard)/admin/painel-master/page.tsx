import { buscarMetricasGlobais, listarOrganizacoes } from '@/lib/actions/admin-master'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { AtivarOrganizacaoDialog } from '@/components/admin/ativar-organizacao-dialog'
import { Building2, Users, FileText, FlaskConical } from 'lucide-react'
import { EditorialKicker, HeadlineSerif } from '@/components/licita/editorial'
import { KPIBar } from '@/components/dashboard/kpi-bar'
import { FooterEditorial } from '../../dashboard/shared'

export default async function PainelMasterPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: usuario } = await (supabase as any)
    .from('usuarios')
    .select('papel')
    .eq('id', user.id)
    .maybeSingle()

  if (!usuario || (usuario as any).papel !== 'admin_plataforma') {
    redirect('/dashboard')
  }

  const [metricas, { data: organizacoes }] = await Promise.all([
    buscarMetricasGlobais(),
    listarOrganizacoes(),
  ])

  type OrgItem = { id: string; nome: string; cnpj: string; municipio: string; estado: string; ativo: boolean; is_demo: boolean; is_cataguases: boolean; created_at: string }
  const orgs = (organizacoes ?? []) as OrgItem[]
  const orgsPendentes = orgs.filter(o => !o.ativo && !o.is_demo && !o.is_cataguases)
  const orgsAtivas = orgs.filter(o => o.ativo && !o.is_demo && !o.is_cataguases)

  return (
    <div className="space-y-8">
      {/* Masthead editorial */}
      <div>
        <div
          className="flex items-center justify-between pb-3.5 mb-6"
          style={{ borderBottom: '2px solid var(--rule)' }}
        >
          <EditorialKicker
            kicker="Administracao da Plataforma"
            edition="Painel Master"
            date={new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }).replaceAll('/', '·')}
          />
          <Link href="/admin/modo-demo">
            <Button
              variant="outline"
              size="sm"
              className="gap-2 text-sm h-9"
              style={{ borderColor: 'var(--warnWash)', color: 'var(--warn)' }}
            >
              <FlaskConical className="w-4 h-4" />
              Modo Demo
            </Button>
          </Link>
        </div>

        <HeadlineSerif size="md" as="h1">
          Gestao global da plataforma.
        </HeadlineSerif>
        <p className="mt-2 text-[15px]" style={{ color: 'var(--inkSoft)', fontFamily: 'var(--font-heading)', fontStyle: 'italic' }}>
          Prefeituras, usuarios e processos em tempo real.
        </p>
      </div>

      {/* KPIs */}
      {metricas && (
        <KPIBar items={[
          { label: 'Prefeituras', value: metricas.totalOrgs, sub: `${metricas.orgsAtivas} ativas`, sparkline: 'up', delta: 'ativas', deltaColor: 'blue' },
          { label: 'Usuarios', value: metricas.totalUsuarios, sub: `${metricas.usuariosAtivos} ativos`, sparkline: 'wave', delta: 'total', deltaColor: 'muted' },
          { label: 'Processos', value: metricas.totalProcessos, sub: 'licitatorios', sparkline: 'up', delta: 'total', deltaColor: 'blue' },
        ]} />
      )}

      {/* Pendentes de ativacao */}
      {orgsPendentes.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <h2 className="text-[15px] font-semibold" style={{ color: 'var(--ink)', fontFamily: 'var(--font-heading)' }}>
              Aguardando ativacao
            </h2>
            <Badge variant="destructive" className="text-xs">{orgsPendentes.length}</Badge>
          </div>
          <div className="glass rounded-[var(--r-lg)] overflow-hidden">
            {orgsPendentes.map((org, i) => (
              <div
                key={org.id}
                className="flex items-center justify-between px-5 py-4"
                style={{ borderBottom: i < orgsPendentes.length - 1 ? '1px solid var(--hairline)' : undefined }}
              >
                <div className="min-w-0">
                  <div className="font-medium text-sm" style={{ color: 'var(--ink)' }}>{org.nome}</div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                    {org.municipio}/{org.estado} · CNPJ: {org.cnpj}
                  </div>
                </div>
                <AtivarOrganizacaoDialog organizacaoId={org.id} nomeOrg={org.nome} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Prefeituras ativas */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-[15px] font-semibold" style={{ color: 'var(--ink)', fontFamily: 'var(--font-heading)' }}>
            Prefeituras ativas
          </h2>
          <span className="font-mono text-[9.5px] font-bold uppercase" style={{ color: 'var(--muted)', letterSpacing: '0.14em' }}>
            {orgsAtivas.length} registros
          </span>
        </div>
        <div className="glass rounded-[var(--r-lg)] overflow-hidden">
          {orgsAtivas.map((org, i) => (
            <div
              key={org.id}
              className="flex items-center justify-between px-5 py-4"
              style={{ borderBottom: i < orgsAtivas.length - 1 ? '1px solid var(--hairline)' : undefined }}
            >
              <div className="min-w-0">
                <div className="font-medium text-sm" style={{ color: 'var(--ink)' }}>{org.nome}</div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                  {org.municipio}/{org.estado}
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge
                  variant="outline"
                  className="text-xs"
                  style={{ color: 'var(--success)', borderColor: 'var(--success)' }}
                >
                  Ativa
                </Badge>
                <AtivarOrganizacaoDialog
                  organizacaoId={org.id}
                  nomeOrg={org.nome}
                  modo="suspender"
                />
              </div>
            </div>
          ))}
          {orgsAtivas.length === 0 && (
            <div className="px-5 py-8 text-sm text-center" style={{ color: 'var(--muted)' }}>
              Nenhuma prefeitura ativa ainda.
            </div>
          )}
        </div>
      </div>

      <FooterEditorial />
    </div>
  )
}
