import { createClient } from '@/lib/supabase/server'
import { KPIBar } from '@/components/dashboard/kpi-bar'
import { FaseTimeline } from '@/components/dashboard/fase-timeline'
import type { FaseNode } from '@/components/dashboard/fase-timeline'
import { PendenciasCard } from '@/components/dashboard/pendencias-card'
import { ProcessoRowDashboard } from '@/components/dashboard/processo-row-dashboard'
import { FooterEditorial, SectionHeader, ListCard } from './shared'

interface Props { userId: string; orgId: string; cargo: string | null }

export async function DashboardGestorPublico({ userId, orgId, cargo }: Props) {
  const supabase = await createClient()
  const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()

  const [{ data: autorizacoes }, { data: filaData }, { data: historicoData }] = await Promise.all([
    (supabase as any)
      .from('processos_licitatorios')
      .select('id, status, valor_estimado, updated_at')
      .eq('organizacao_id', orgId)
      .eq('fase_atual', 'gestor_publico'),
    (supabase as any)
      .from('processos_licitatorios')
      .select('id, objeto, numero_processo, modalidade, status, fase_atual, updated_at')
      .eq('organizacao_id', orgId)
      .eq('fase_atual', 'gestor_publico')
      .order('updated_at', { ascending: true })
      .limit(20),
    (supabase as any)
      .from('processos_licitatorios')
      .select('id, objeto, numero_processo, modalidade, status, fase_atual, updated_at')
      .eq('organizacao_id', orgId)
      .eq('fase_atual', 'publicacao')
      .order('updated_at', { ascending: false })
      .limit(10),
  ])

  const lista     = (autorizacoes as any[]) ?? []
  const fila      = (filaData as any[]) ?? []
  const historico = (historicoData as any[]) ?? []

  const aguardando  = lista.filter((p: any) => p.status !== 'autorizado' && p.status !== 'devolvido').length
  const autorizados = lista.filter((p: any) => p.status === 'autorizado' && p.updated_at >= inicioMes).length
  const devolvidos  = lista.filter((p: any) => p.status === 'devolvido').length
  const valorTotal  = lista.filter((p: any) => p.status === 'autorizado').reduce((acc: number, p: any) => acc + (p.valor_estimado ?? 0), 0)

  const fases: FaseNode[] = [
    { key: 'aguardando', label: 'Aguardando', count: aguardando,  devolvidos: 0,         parados: 0, href: '/processos?fase=gestor_publico', isCurrent: true },
    { key: 'autorizado', label: 'Autorizado', count: autorizados, devolvidos: 0,         parados: 0, href: '/processos?fase=gestor_publico' },
    { key: 'devolvido',  label: 'Devolvido',  count: devolvidos,  devolvidos: devolvidos, parados: 0, href: '/processos?fase=gestor_publico' },
  ]

  return (
    <div className="space-y-8">
      <SectionHeader supTitle="Autoridade Competente" title="Autorizações pendentes." contextLine={cargo ?? undefined} />
      <FaseTimeline fases={fases} />
      <KPIBar items={[
        { label: 'Aguardando decisão', value: aguardando },
        { label: 'Autorizados (mês)',  value: autorizados },
        { label: 'Devolvidos',         value: devolvidos, accent: devolvidos > 0 },
        { label: 'Valor autorizado',   value: `R$ ${(valorTotal / 1000).toFixed(0)}k`, sub: 'total' },
      ]} />
      <PendenciasCard userId={userId} orgId={orgId} faseAtual="gestor_publico" />
      <ListCard title="Aguardando autorização" subtitle="Mais antigo primeiro">
        {fila.length === 0
          ? <div className="px-6 py-10 text-center text-sm" style={{ color: 'var(--muted)' }}>Nenhuma autorização pendente.</div>
          : fila.map((p: any) => <ProcessoRowDashboard key={p.id} {...p} href={`/processos/${p.id}/autorizacao`} />)
        }
      </ListCard>
      {historico.length > 0 && (
        <ListCard title="Histórico de autorizações" subtitle="Processos autorizados aguardando publicação">
          {historico.map((p: any) => <ProcessoRowDashboard key={p.id} {...p} />)}
        </ListCard>
      )}
      <FooterEditorial />
    </div>
  )
}
