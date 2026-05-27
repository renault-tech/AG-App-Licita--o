import { createClient } from '@/lib/supabase/server'
import { KPIBar } from '@/components/dashboard/kpi-bar'
import { FaseTimeline } from '@/components/dashboard/fase-timeline'
import type { FaseNode } from '@/components/dashboard/fase-timeline'
import { PendenciasCard } from '@/components/dashboard/pendencias-card'
import { ProcessoRowDashboard } from '@/components/dashboard/processo-row-dashboard'
import { FooterEditorial, SectionHeader, ListCard } from './shared'

interface Props { userId: string; orgId: string; cargo: string | null }

export async function DashboardProcurador({ userId, orgId, cargo }: Props) {
  const supabase = await createClient()
  const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()

  const [{ data: pareceres }, { data: filaData }] = await Promise.all([
    (supabase as any).from('pareceres').select('id, status, created_at').eq('organizacao_id', orgId),
    (supabase as any)
      .from('processos_licitatorios')
      .select('id, objeto, numero_processo, modalidade, status, fase_atual, updated_at')
      .eq('organizacao_id', orgId)
      .eq('fase_atual', 'procurador')
      .order('updated_at', { ascending: true })
      .limit(20),
  ])

  const pareceresList = (pareceres as any[]) ?? []
  const fila = (filaData as any[]) ?? []

  const pendentes  = pareceresList.filter((p: any) => p.status === 'pendente').length
  const aprovados  = pareceresList.filter((p: any) => p.status?.startsWith('aprovado') && p.created_at >= inicioMes).length
  const devolvidos = pareceresList.filter((p: any) => p.status === 'devolvido').length

  const fases: FaseNode[] = [
    { key: 'pendente',   label: 'Pendente',  count: fila.length,  devolvidos: 0,         parados: 0, href: '/processos?fase=procurador', isCurrent: true },
    { key: 'aprovado',   label: 'Aprovado',  count: aprovados,    devolvidos: 0,         parados: 0, href: '/processos?fase=procurador' },
    { key: 'devolvido',  label: 'Devolvido', count: devolvidos,   devolvidos: devolvidos, parados: 0, href: '/processos?fase=procurador' },
  ]

  return (
    <div className="space-y-8">
      <SectionHeader supTitle="Procuradoria" title="Fila de pareceres." contextLine={cargo ?? undefined} />
      <FaseTimeline fases={fases} />
      <KPIBar items={[
        { label: 'Fila de análise', value: fila.length },
        { label: 'Aprovados (mês)', value: aprovados },
        { label: 'Devolvidos',      value: devolvidos, accent: devolvidos > 0 },
      ]} />
      <PendenciasCard userId={userId} orgId={orgId} faseAtual="procurador" />
      <ListCard title="Fila de pareceres" subtitle="Mais antigo primeiro">
        {fila.length === 0
          ? <div className="px-6 py-10 text-center text-sm" style={{ color: 'var(--muted)' }}>Nenhum processo aguardando parecer.</div>
          : fila.map((p: any) => <ProcessoRowDashboard key={p.id} {...p} href={`/processos/${p.id}/parecer`} />)
        }
      </ListCard>
      <FooterEditorial />
    </div>
  )
}
