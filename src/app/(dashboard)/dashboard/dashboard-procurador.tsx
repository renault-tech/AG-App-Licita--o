import { createClient } from '@/lib/supabase/server'
import { KPIBar } from '@/components/dashboard/kpi-bar'
import { FaseTimeline } from '@/components/dashboard/fase-timeline'
import type { FaseNode } from '@/components/dashboard/fase-timeline'
import { PendenciasCard } from '@/components/dashboard/pendencias-card'
import { ProcessoRowDashboard } from '@/components/dashboard/processo-row-dashboard'
import { FooterEditorial, SectionHeader, ListCard } from './shared'

interface Props { userId: string; orgId: string; cargo: string | null; nome?: string | null }

export async function DashboardProcurador({ userId, orgId, cargo, nome }: Props) {
  const supabase = await createClient()
  const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()

  const [{ data: pareceres }, { data: filaData }, { data: historicoData }] = await Promise.all([
    (supabase as any).from('pareceres').select('id, status, created_at, updated_at').eq('organizacao_id', orgId),
    (supabase as any)
      .from('processos_licitatorios')
      .select('id, objeto, numero_processo, modalidade, status, fase_atual, updated_at')
      .eq('organizacao_id', orgId)
      .eq('fase_atual', 'procurador')
      .order('updated_at', { ascending: true })
      .limit(20),
    (supabase as any)
      .from('processos_licitatorios')
      .select('id, objeto, numero_processo, modalidade, status, fase_atual, updated_at')
      .eq('organizacao_id', orgId)
      .in('fase_atual', ['gestor_publico', 'publicacao'])
      .order('updated_at', { ascending: false })
      .limit(10),
  ])

  const pareceresList = (pareceres as any[]) ?? []
  const fila = (filaData as any[]) ?? []
  const historico = (historicoData as any[]) ?? []

  const pendentes        = pareceresList.filter((p: any) => p.status === 'pendente').length
  const aprovados        = pareceresList.filter((p: any) => p.status === 'aprovado' && p.created_at >= inicioMes).length
  const aprovadosRes     = pareceresList.filter((p: any) => p.status === 'aprovado_com_ressalvas').length
  const devolvidos       = pareceresList.filter((p: any) => p.status === 'devolvido').length

  // Tempo médio de resposta: diferenca em dias entre created_at e updated_at nos pareceres concluidos
  const concluidos = pareceresList.filter((p: any) => p.status !== 'pendente' && p.updated_at && p.created_at)
  const tempoMedio = concluidos.length > 0
    ? Math.round(concluidos.reduce((acc: number, p: any) => {
        const diff = (new Date(p.updated_at).getTime() - new Date(p.created_at).getTime()) / 86400000
        return acc + diff
      }, 0) / concluidos.length)
    : 0

  const fases: FaseNode[] = [
    { key: 'pendente',              label: 'Pendente',      count: fila.length,   devolvidos: 0,         parados: 0, href: '/processos?fase=procurador', isCurrent: true },
    { key: 'aprovado',              label: 'Aprovado',      count: aprovados,     devolvidos: 0,         parados: 0, href: '/processos?fase=procurador' },
    { key: 'aprovado_com_ressalvas',label: 'C/ ressalvas',  count: aprovadosRes,  devolvidos: 0,         parados: 0, href: '/processos?fase=procurador' },
    { key: 'devolvido',             label: 'Devolvido',     count: devolvidos,    devolvidos: devolvidos, parados: 0, href: '/processos?fase=procurador' },
  ]

  return (
    <div className="space-y-8">
      <SectionHeader
        supTitle="Procuradoria"
        title="Fila de pareceres."
        nome={nome}
        contextLine={pendentes > 0 ? `${pendentes} parecer${pendentes > 1 ? 'es' : ''} aguardam voce.` : 'Fila vazia.'}
      />
      <FaseTimeline fases={fases} />
      <KPIBar items={[
        { label: 'Fila de análise', value: fila.length },
        { label: 'Aprovados (mês)', value: aprovados },
        { label: 'Devolvidos',      value: devolvidos, accent: devolvidos > 0 },
        { label: 'Tempo médio',     value: tempoMedio > 0 ? `${tempoMedio}d` : '-', sub: 'dias por parecer' },
      ]} />
      <PendenciasCard userId={userId} orgId={orgId} faseAtual="procurador" />
      <ListCard title="Fila de pareceres" subtitle="Mais antigo primeiro">
        {fila.length === 0
          ? <div className="px-6 py-10 text-center text-sm" style={{ color: 'var(--muted)' }}>Nenhum processo aguardando parecer.</div>
          : fila.map((p: any) => <ProcessoRowDashboard key={p.id} {...p} href={`/processos/${p.id}/parecer`} />)
        }
      </ListCard>
      {historico.length > 0 && (
        <ListCard title="Histórico de pareceres" subtitle="Processos que avançaram após análise">
          {historico.map((p: any) => <ProcessoRowDashboard key={p.id} {...p} />)}
        </ListCard>
      )}
      <FooterEditorial />
    </div>
  )
}
