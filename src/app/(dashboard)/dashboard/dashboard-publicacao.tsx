import { createClient } from '@/lib/supabase/server'
import { KPIBar } from '@/components/dashboard/kpi-bar'
import { FaseTimeline } from '@/components/dashboard/fase-timeline'
import type { FaseNode } from '@/components/dashboard/fase-timeline'
import { PendenciasCard } from '@/components/dashboard/pendencias-card'
import { ProcessoRowDashboard } from '@/components/dashboard/processo-row-dashboard'
import { FooterEditorial, SectionHeader, ListCard } from './shared'

interface Props { userId: string; orgId: string; cargo: string | null }

export async function DashboardPublicacao({ userId, orgId, cargo }: Props) {
  const supabase = await createClient()
  const inicioSemana = new Date(Date.now() - 7 * 86400000).toISOString()

  const [{ data: publ }, { data: filaData }] = await Promise.all([
    (supabase as any)
      .from('processos_licitatorios')
      .select('id, status, fase_atual, updated_at')
      .eq('organizacao_id', orgId)
      .in('fase_atual', ['publicacao', 'publicado']),
    (supabase as any)
      .from('processos_licitatorios')
      .select('id, objeto, numero_processo, modalidade, status, fase_atual, updated_at')
      .eq('organizacao_id', orgId)
      .eq('fase_atual', 'publicacao')
      .order('updated_at', { ascending: true })
      .limit(20),
  ])

  const lista = (publ as any[]) ?? []
  const fila  = (filaData as any[]) ?? []

  const aguardando       = lista.filter((p: any) => p.fase_atual === 'publicacao').length
  const publicadosSemana = lista.filter((p: any) => p.status === 'publicado' && p.updated_at >= inicioSemana).length

  const fases: FaseNode[] = [
    { key: 'publicacao', label: 'Aguardando', count: aguardando,       devolvidos: 0, parados: 0, href: '/processos?fase=publicacao', isCurrent: true },
    { key: 'publicado',  label: 'Publicados', count: publicadosSemana, devolvidos: 0, parados: 0, href: '/processos?status=publicado' },
  ]

  return (
    <div className="space-y-8">
      <SectionHeader supTitle="Setor de Comunicações" title="Publicações pendentes." contextLine={cargo ?? undefined} />
      <FaseTimeline fases={fases} />
      <KPIBar items={[
        { label: 'Aguardando',       value: aguardando },
        { label: 'Publicados (sem)', value: publicadosSemana },
      ]} />
      <PendenciasCard userId={userId} orgId={orgId} faseAtual="publicacao" />
      <ListCard title="Aguardando publicação" subtitle="Mais antigo primeiro">
        {fila.length === 0
          ? <div className="px-6 py-10 text-center text-sm" style={{ color: 'var(--muted)' }}>Nenhum processo aguardando publicação.</div>
          : fila.map((p: any) => <ProcessoRowDashboard key={p.id} {...p} href={`/processos/${p.id}/publicacao`} />)
        }
      </ListCard>
      <FooterEditorial />
    </div>
  )
}
