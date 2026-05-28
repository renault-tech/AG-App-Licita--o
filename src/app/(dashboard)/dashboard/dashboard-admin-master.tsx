import { createServiceClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ArrowRight, Building2 } from 'lucide-react'
import { KPIBar } from '@/components/dashboard/kpi-bar'
import { CardConfigShell } from '@/components/dashboard/card-config-shell'
import { FooterEditorial, SectionHeader, ListCard } from './shared'
import { buscarPreferenciaDashboard } from '@/lib/actions/dashboard'

interface Props { userId: string }

export async function DashboardAdminMaster({ userId: _userId }: Props) {
  // createServiceClient é async conforme src/lib/supabase/server.ts
  const supabase = await createServiceClient()

  const pref = await buscarPreferenciaDashboard('ia_periodo_dias', { dias: 30 })
  const diasIa = typeof (pref as any).dias === 'number' ? (pref as any).dias : 30
  const corte = new Date(Date.now() - diasIa * 86400000).toISOString()

  const [
    { data: orgs },
    { data: usuarios },
    { data: processos },
    { data: acoesIa },
  ] = await Promise.all([
    (supabase as any).from('organizacoes').select('id, nome, municipio, estado').order('nome'),
    (supabase as any).from('usuarios').select('id, organizacao_id, status_aprovacao').eq('status_aprovacao', 'ativo'),
    (supabase as any).from('processos_licitatorios').select('id, organizacao_id, status'),
    (supabase as any).from('acoes_ia').select('id, organizacao_id, creditos_consumidos').gte('created_at', corte),
  ])

  const orgsList      = (orgs as any[]) ?? []
  const usuariosList  = (usuarios as any[]) ?? []
  const processosList = (processos as any[]) ?? []
  const acoesList     = (acoesIa as any[]) ?? []

  const totalTokens = acoesList.reduce((acc: number, a: any) => acc + (a.creditos_consumidos ?? 0), 0)

  const orgsComDados = orgsList.map((org: any) => ({
    ...org,
    usuariosAtivos: usuariosList.filter((u: any) => u.organizacao_id === org.id).length,
    processos:      processosList.filter((p: any) => p.organizacao_id === org.id).length,
    tokens:         acoesList
      .filter((a: any) => a.organizacao_id === org.id)
      .reduce((acc: number, a: any) => acc + (a.creditos_consumidos ?? 0), 0),
  }))

  return (
    <div className="space-y-8">
      <SectionHeader
        supTitle="Administração da Plataforma"
        title="Visão global."
        contextLine="Dados consolidados de todas as organizações."
      />

      <KPIBar items={[
        { label: 'Prefeituras',     value: orgsList.length },
        { label: 'Usuários ativos', value: usuariosList.length },
        { label: 'Processos',       value: processosList.length },
        { label: `IA (${diasIa}d)`, value: totalTokens.toLocaleString('pt-BR'), sub: 'tokens' },
      ]} />

      <CardConfigShell
        configKey="ia_periodo_dias"
        configValue={{ dias: diasIa }}
        config={{
          type: 'select',
          label: 'Período de análise',
          field: 'dias',
          options: [7, 15, 30, 60, 90].map((d) => ({ value: d, label: `${d} dias` })),
        }}
      >
        <ListCard title="Prefeituras" subtitle={`${orgsList.length} organizações na plataforma`}>
          {orgsComDados.map((org: any) => (
            <Link
              key={org.id}
              href={`/admin/prefeituras/${org.id}`}
              className="flex items-center gap-4 px-6 py-4 border-b transition-colors hover:bg-[var(--surfaceAlt)] last:border-b-0"
              style={{ borderColor: 'var(--hairline)' }}
            >
              <div
                className="w-9 h-9 rounded-[var(--r-md)] flex items-center justify-center shrink-0"
                style={{ background: 'var(--primaryWash)' }}
              >
                <Building2 className="w-4 h-4" style={{ color: 'var(--primary)' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-[14px] font-semibold truncate" style={{ color: 'var(--ink)' }}>{org.nome}</p>
                <p className="text-xs" style={{ color: 'var(--muted)' }}>
                  {org.municipio} · {org.estado} · {org.usuariosAtivos} usuários · {org.processos} processos
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-xs font-mono" style={{ color: 'var(--muted)' }}>
                  {org.tokens.toLocaleString('pt-BR')} tok
                </span>
                <ArrowRight className="w-3.5 h-3.5" style={{ color: 'var(--mutedSoft)' }} />
              </div>
            </Link>
          ))}
        </ListCard>
      </CardConfigShell>

      <FooterEditorial />
    </div>
  )
}
