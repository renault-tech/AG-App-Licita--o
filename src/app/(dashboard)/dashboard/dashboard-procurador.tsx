import { createClient } from '@/lib/supabase/server'
import { KPIBar } from '@/components/dashboard/kpi-bar'
import { FaseTimeline } from '@/components/dashboard/fase-timeline'
import type { FaseNode } from '@/components/dashboard/fase-timeline'
import { PendenciasCard } from '@/components/dashboard/pendencias-card'
import { ProcessoRowDashboard } from '@/components/dashboard/processo-row-dashboard'
import {
  FooterEditorial, SectionHeader,
  ProcessosListSection, DarkFeaturedCard, AiSuggestionCard,
} from './shared'

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

  const pendentes    = pareceresList.filter((p: any) => p.status === 'pendente').length
  const aprovados    = pareceresList.filter((p: any) => p.status === 'aprovado' && p.created_at >= inicioMes).length
  const aprovadosRes = pareceresList.filter((p: any) => p.status === 'aprovado_com_ressalvas').length
  const devolvidos   = pareceresList.filter((p: any) => p.status === 'devolvido').length

  const concluidos = pareceresList.filter((p: any) => p.status !== 'pendente' && p.updated_at && p.created_at)
  const tempoMedio = concluidos.length > 0
    ? Math.round(concluidos.reduce((acc: number, p: any) => {
        const diff = (new Date(p.updated_at).getTime() - new Date(p.created_at).getTime()) / 86400000
        return acc + diff
      }, 0) / concluidos.length)
    : 0

  const fases: FaseNode[] = [
    { key: 'pendente',               label: 'Pendente',     count: fila.length,   devolvidos: 0,         parados: 0, href: '/processos?fase=procurador', isCurrent: true },
    { key: 'aprovado',               label: 'Aprovado',     count: aprovados,     devolvidos: 0,         parados: 0, href: '/processos?fase=procurador' },
    { key: 'aprovado_com_ressalvas', label: 'C/ ressalvas', count: aprovadosRes,  devolvidos: 0,         parados: 0, href: '/processos?fase=procurador' },
    { key: 'devolvido',              label: 'Devolvido',    count: devolvidos,    devolvidos: devolvidos, parados: 0, href: '/processos?fase=procurador' },
  ]

  const urgente = fila[0] ?? null

  const ctxLine = pendentes > 0
    ? `${pendentes} parecer${pendentes > 1 ? 'es' : ''} aguardam voce.`
    : 'Fila vazia.'

  return (
    <div className="space-y-8">
      <SectionHeader
        supTitle="Procuradoria"
        title="Fila de pareceres."
        nome={nome}
        contextLine={ctxLine}
      />
      <FaseTimeline fases={fases} />
      <KPIBar items={[
        { label: 'Fila de analise', value: fila.length,    sub: 'aguardando parecer',   sparkline: fila.length > 0 ? 'wave' : 'flat', delta: `${fila.length} pendente${fila.length !== 1 ? 's' : ''}`, deltaColor: fila.length > 0 ? 'warn' : 'muted' },
        { label: 'Aprovados (mes)', value: aprovados,      sub: 'mes atual',             sparkline: 'up',   delta: 'aprovados',  deltaColor: 'success' },
        { label: 'Devolvidos',      value: devolvidos,     sub: 'para correcao',         sparkline: devolvidos > 0 ? 'down' : 'flat', delta: devolvidos > 0 ? 'atencao' : 'ok', deltaColor: devolvidos > 0 ? 'warn' : 'muted', accent: devolvidos > 0 },
        { label: 'Tempo medio',     value: tempoMedio > 0 ? `${tempoMedio}d` : '-', sub: 'dias por parecer', sparkline: 'flat', delta: 'media', deltaColor: 'muted' },
      ]} />
      <PendenciasCard userId={userId} orgId={orgId} faseAtual="procurador" />

      {/* Layout duas colunas */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-6 items-start">

        {/* Coluna principal */}
        <div className="space-y-6">
          <ProcessosListSection
            title="Fila de pareceres"
            rightLabel="Mais antigo primeiro"
          >
            {fila.length === 0 ? (
              <div className="glass rounded-[var(--r-lg)] px-6 py-10 text-center text-sm" style={{ color: 'var(--muted)' }}>
                Nenhum processo aguardando parecer.
              </div>
            ) : (
              fila.map((p: any) => (
                <ProcessoRowDashboard key={p.id} {...p} href={`/processos/${p.id}/parecer`} />
              ))
            )}
          </ProcessosListSection>

          {historico.length > 0 && (
            <ProcessosListSection
              title="Historico de pareceres"
              rightLabel="Apos analise"
            >
              {historico.map((p: any) => (
                <ProcessoRowDashboard key={p.id} {...p} />
              ))}
            </ProcessosListSection>
          )}
        </div>

        {/* Coluna lateral direita */}
        <div className="space-y-4">
          {urgente && (
            <DarkFeaturedCard
              titulo={`Processo ${urgente.numero_processo ?? urgente.id.slice(0, 8)} aguarda parecer.`}
              descricao={urgente.objeto}
              href={`/processos/${urgente.id}/parecer`}
              badge="Procuradoria · Art. 53 Lei 14.133/21"
              meta={new Date(urgente.updated_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
            />
          )}
          <AiSuggestionCard
            texto={
              pendentes > 0
                ? `Ha ${pendentes} processo${pendentes > 1 ? 's' : ''} aguardando parecer juridico. O Art. 53 da Lei 14.133/21 exige parecer antes da abertura do processo.`
                : `Fila vazia. Quando processos chegarem a esta fase, voce podera usar a IA para auxiliar na redacao do parecer juridico.`
            }
            hrefDetalhes={urgente ? `/processos/${urgente.id}/parecer` : '/procuradoria/pareceres-pendentes'}
          />
        </div>
      </div>

      <FooterEditorial />
    </div>
  )
}
