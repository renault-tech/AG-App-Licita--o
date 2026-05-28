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

  const [{ data: publ }, { data: filaData }, { data: publicadosData }] = await Promise.all([
    (supabase as any)
      .from('processos_licitatorios')
      .select('id, status, fase_atual, updated_at')
      .eq('organizacao_id', orgId)
      .or('fase_atual.eq.publicacao,status.eq.publicado,status.eq.assinado'),
    (supabase as any)
      .from('processos_licitatorios')
      .select('id, objeto, numero_processo, modalidade, status, fase_atual, updated_at')
      .eq('organizacao_id', orgId)
      .eq('fase_atual', 'publicacao')
      .order('updated_at', { ascending: true })
      .limit(20),
    (supabase as any)
      .from('processos_licitatorios')
      .select('id, objeto, numero_processo, modalidade, status, fase_atual, updated_at')
      .eq('organizacao_id', orgId)
      .in('status', ['publicado', 'assinado'])
      .order('updated_at', { ascending: false })
      .limit(10),
  ])

  const lista         = (publ as any[]) ?? []
  const fila          = (filaData as any[]) ?? []
  const publicadosList = (publicadosData as any[]) ?? []

  const aguardando       = lista.filter((p: any) => p.fase_atual === 'publicacao').length
  const publicadosSemana = lista.filter((p: any) => p.status === 'publicado' && p.updated_at >= inicioSemana).length
  const totalPublicados  = lista.filter((p: any) => p.status === 'publicado').length
  const semPNCP          = lista.filter((p: any) => p.fase_atual === 'publicacao').length

  const fases: FaseNode[] = [
    { key: 'publicacao',     label: 'Aguardando',  count: aguardando,       devolvidos: 0, parados: 0, href: '/processos?fase=publicacao',     isCurrent: true },
    { key: 'publicado_pncp', label: 'PNCP',        count: publicadosSemana, devolvidos: 0, parados: 0, href: '/processos?status=publicado' },
    { key: 'publicado',      label: 'Publicados',  count: totalPublicados,  devolvidos: 0, parados: 0, href: '/processos?status=publicado' },
  ]

  return (
    <div className="space-y-8">
      <SectionHeader supTitle="Setor de Comunicações" title="Publicações pendentes." contextLine={cargo ?? undefined} />
      <FaseTimeline fases={fases} />
      <KPIBar items={[
        { label: 'Aguardando',       value: aguardando },
        { label: 'Publicados (sem)', value: publicadosSemana, sub: 'últimos 7 dias' },
        { label: 'Total publicados', value: totalPublicados },
        { label: 'Pendentes PNCP',   value: semPNCP, accent: semPNCP > 0, sub: 'na fila' },
      ]} />
      <PendenciasCard userId={userId} orgId={orgId} faseAtual="publicacao" />
      <ListCard title="Aguardando publicação" subtitle="Mais antigo primeiro">
        {fila.length === 0
          ? <div className="px-6 py-10 text-center text-sm" style={{ color: 'var(--muted)' }}>Nenhum processo aguardando publicação.</div>
          : fila.map((p: any) => <ProcessoRowDashboard key={p.id} {...p} href={`/processos/${p.id}/publicacao`} />)
        }
      </ListCard>
      {publicadosList.length > 0 && (
        <ListCard title="Histórico de publicações" subtitle="Processos publicados recentemente">
          {publicadosList.map((p: any) => <ProcessoRowDashboard key={p.id} {...p} />)}
        </ListCard>
      )}
      <FooterEditorial />
    </div>
  )
}
