import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { KPIBar } from '@/components/dashboard/kpi-bar'
import { CardConfigShell } from '@/components/dashboard/card-config-shell'
import { FooterEditorial, SectionHeader, ListCard } from './shared'
import { buscarPreferenciaDashboard } from '@/lib/actions/dashboard'

interface Props { userId: string; orgId: string; orgNome: string; cargo: string | null }

export async function DashboardAdminOrg({ userId, orgId, orgNome, cargo }: Props) {
  const supabase = await createClient()

  const pref = await buscarPreferenciaDashboard('ia_periodo_dias', { dias: 30 })
  const diasIa = typeof (pref as any).dias === 'number' ? (pref as any).dias : 30
  const corte = new Date(Date.now() - diasIa * 86400000).toISOString()

  const [
    { data: usuarios },
    { data: processos },
    { data: acoesIa },
    { data: creditos },
  ] = await Promise.all([
    (supabase as any).from('usuarios').select('id, nome_completo, papel, status_aprovacao').eq('organizacao_id', orgId),
    (supabase as any).from('processos_licitatorios').select('id, status').eq('organizacao_id', orgId),
    (supabase as any).from('acoes_ia').select('id, usuario_id, creditos_consumidos').eq('organizacao_id', orgId).gte('created_at', corte),
    (supabase as any).from('creditos_usuario').select('saldo').eq('usuario_id', userId).maybeSingle(),
  ])

  const usuariosList  = (usuarios as any[]) ?? []
  const processosList = (processos as any[]) ?? []
  const acoesList     = (acoesIa as any[]) ?? []
  const saldo         = (creditos as any)?.saldo ?? 0

  const ativos    = usuariosList.filter((u: any) => u.status_aprovacao === 'ativo').length
  const andamento = processosList.filter((p: any) => !['publicado','assinado'].includes(p.status)).length
  const tokensMes = acoesList.reduce((acc: number, a: any) => acc + (a.creditos_consumidos ?? 0), 0)

  return (
    <div className="space-y-8">
      <SectionHeader supTitle="Admin Organização" title={orgNome} contextLine="Visão gerencial da organização." />

      <KPIBar items={[
        { label: 'Usuários ativos',  value: ativos },
        { label: 'Em andamento',     value: andamento, sub: 'processos' },
        { label: `IA (${diasIa}d)`,  value: tokensMes.toLocaleString('pt-BR'), sub: 'tokens consumidos' },
        { label: 'Créditos disp.',   value: saldo, sub: 'saldo atual' },
      ]} />

      <CardConfigShell
        configKey="ia_periodo_dias"
        configValue={{ dias: diasIa }}
        config={{
          type: 'select',
          label: 'Período de análise de IA',
          field: 'dias',
          options: [7, 15, 30, 60, 90].map((d) => ({ value: d, label: `${d} dias` })),
        }}
      >
        <ListCard title={`Uso de IA — últimos ${diasIa} dias`}>
          <div>
            {usuariosList.slice(0, 10).map((u: any) => {
              const tokens = acoesList
                .filter((a: any) => a.usuario_id === u.id)
                .reduce((acc: number, a: any) => acc + (a.creditos_consumidos ?? 0), 0)
              return (
                <div key={u.id} className="flex items-center justify-between px-6 py-3 border-b last:border-b-0" style={{ borderColor: 'var(--hairline)' }}>
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>{u.nome_completo}</p>
                    <p className="text-xs" style={{ color: 'var(--muted)' }}>{u.papel}</p>
                  </div>
                  <span className="text-sm font-semibold" style={{ color: 'var(--ink)', fontFamily: 'var(--font-mono)' }}>
                    {tokens.toLocaleString('pt-BR')} tok
                  </span>
                </div>
              )
            })}
          </div>
        </ListCard>
      </CardConfigShell>

      <ListCard
        title="Usuários"
        action={
          <Link href="/configuracoes/usuarios" className="flex items-center gap-1.5 text-sm font-semibold" style={{ color: 'var(--primary)' }}>
            Gerenciar <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        }
      >
        {usuariosList.slice(0, 10).map((u: any) => (
          <div key={u.id} className="flex items-center justify-between px-6 py-3 border-b last:border-b-0" style={{ borderColor: 'var(--hairline)' }}>
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>{u.nome_completo}</p>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>{u.papel}</p>
            </div>
            <span
              className="text-xs px-2 py-0.5 rounded-full font-semibold"
              style={{
                background: u.status_aprovacao === 'ativo' ? 'var(--successWash)' : 'var(--warnWash)',
                color: u.status_aprovacao === 'ativo' ? 'var(--success)' : 'var(--warn)',
              }}
            >
              {u.status_aprovacao}
            </span>
          </div>
        ))}
      </ListCard>

      <FooterEditorial />
    </div>
  )
}
