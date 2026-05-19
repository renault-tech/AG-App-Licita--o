import { buscarMetricasGlobais, listarOrganizacoes } from '@/lib/actions/admin-master'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { AtivarOrganizacaoDialog } from '@/components/admin/ativar-organizacao-dialog'
import { Building2, Users, FileText, FlaskConical } from 'lucide-react'

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
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--ink)', fontFamily: 'var(--font-heading)' }}>
            Painel Admin Master
          </h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>
            Gestao global da plataforma LicitaIA
          </p>
        </div>
        <Link href="/admin/modo-demo">
          <Button
            variant="outline"
            className="gap-2"
            style={{ borderColor: '#FED7AA', color: '#C2410C' }}
          >
            <FlaskConical className="w-4 h-4" />
            Modo Demo
          </Button>
        </Link>
      </div>

      {metricas && (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {[
            { label: 'Prefeituras', valor: metricas.totalOrgs, sub: `${metricas.orgsAtivas} ativas`, icon: Building2 },
            { label: 'Usuarios', valor: metricas.totalUsuarios, sub: `${metricas.usuariosAtivos} ativos`, icon: Users },
            { label: 'Processos', valor: metricas.totalProcessos, sub: null, icon: FileText },
          ].map(m => (
            <Card key={m.label} style={{ background: 'var(--surface)', borderColor: 'var(--hairline)' }}>
              <CardHeader className="pb-2 pt-4 px-4">
                <div className="flex items-center gap-2">
                  <m.icon className="w-4 h-4" style={{ color: 'var(--muted)' }} />
                  <CardTitle className="text-sm font-medium" style={{ color: 'var(--muted)' }}>{m.label}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="text-2xl font-bold" style={{ color: 'var(--ink)' }}>{m.valor}</div>
                {m.sub && <div className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{m.sub}</div>}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {orgsPendentes.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold" style={{ color: 'var(--ink)' }}>
              Aguardando ativacao
            </h2>
            <Badge variant="destructive">{orgsPendentes.length}</Badge>
          </div>
          <div
            className="rounded-[var(--r-lg)] border divide-y"
            style={{ borderColor: 'var(--hairline)', background: 'var(--surface)' }}
          >
            {orgsPendentes.map(org => (
              <div key={org.id} className="flex items-center justify-between p-4 gap-4">
                <div className="min-w-0">
                  <div className="font-medium text-sm" style={{ color: 'var(--ink)' }}>{org.nome}</div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                    {org.municipio}/{org.estado} — CNPJ: {org.cnpj}
                  </div>
                </div>
                <AtivarOrganizacaoDialog organizacaoId={org.id} nomeOrg={org.nome} />
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-base font-semibold" style={{ color: 'var(--ink)' }}>
          Prefeituras ativas ({orgsAtivas.length})
        </h2>
        <div
          className="rounded-[var(--r-lg)] border divide-y"
          style={{ borderColor: 'var(--hairline)', background: 'var(--surface)' }}
        >
          {orgsAtivas.map(org => (
            <div key={org.id} className="flex items-center justify-between p-4 gap-4">
              <div className="min-w-0">
                <div className="font-medium text-sm" style={{ color: 'var(--ink)' }}>{org.nome}</div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                  {org.municipio}/{org.estado}
                </div>
              </div>
              <div className="flex items-center gap-2">
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
            <div className="p-4 text-sm" style={{ color: 'var(--muted)' }}>
              Nenhuma prefeitura ativa ainda.
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
