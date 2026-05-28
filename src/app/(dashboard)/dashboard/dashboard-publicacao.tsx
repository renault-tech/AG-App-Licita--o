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

export async function DashboardPublicacao({ userId, orgId, cargo, nome }: Props) {
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

  const lista          = (publ as any[]) ?? []
  const fila           = (filaData as any[]) ?? []
  const publicadosList = (publicadosData as any[]) ?? []

  const aguardando       = lista.filter((p: any) => p.fase_atual === 'publicacao').length
  const publicadosSemana = lista.filter((p: any) => p.status === 'publicado' && p.updated_at >= inicioSemana).length
  const totalPublicados  = lista.filter((p: any) => p.status === 'publicado').length
  const semPNCP          = lista.filter((p: any) => p.fase_atual === 'publicacao').length

  const fases: FaseNode[] = [
    { key: 'publicacao',     label: 'Aguardando', count: aguardando,       devolvidos: 0, parados: 0, href: '/processos?fase=publicacao',  isCurrent: true },
    { key: 'publicado_pncp', label: 'PNCP',       count: publicadosSemana, devolvidos: 0, parados: 0, href: '/processos?status=publicado' },
    { key: 'publicado',      label: 'Publicados', count: totalPublicados,  devolvidos: 0, parados: 0, href: '/processos?status=publicado' },
  ]

  const urgente = fila[0] ?? null

  const ctxLine = aguardando > 0
    ? `${aguardando} processo${aguardando > 1 ? 's' : ''} aguardando publicacao.`
    : 'Nada pendente.'

  return (
    <div className="space-y-8">
      <SectionHeader
        supTitle="Setor de Comunicacoes"
        title="Publicacoes pendentes."
        nome={nome}
        contextLine={ctxLine}
      />
      <FaseTimeline fases={fases} />
      <KPIBar items={[
        { label: 'Aguardando',       value: aguardando,       sub: 'para publicar',    sparkline: aguardando > 0 ? 'wave' : 'flat', delta: `${aguardando} pendente${aguardando !== 1 ? 's' : ''}`, deltaColor: aguardando > 0 ? 'warn' : 'muted' },
        { label: 'Publicados (sem)', value: publicadosSemana, sub: 'ultimos 7 dias',   sparkline: 'up',   delta: 'semana',    deltaColor: 'success' },
        { label: 'Total publicados', value: totalPublicados,  sub: 'acumulado',         sparkline: 'up',   delta: 'total',     deltaColor: 'blue' },
        { label: 'Pendentes PNCP',   value: semPNCP,          sub: 'na fila',           sparkline: semPNCP > 0 ? 'wave' : 'flat', delta: semPNCP > 0 ? 'pendente' : 'ok', deltaColor: semPNCP > 0 ? 'warn' : 'success', accent: semPNCP > 0 },
      ]} />
      <PendenciasCard userId={userId} orgId={orgId} faseAtual="publicacao" />

      {/* Layout duas colunas */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-6 items-start">

        {/* Coluna principal */}
        <div className="space-y-6">
          <ProcessosListSection
            title="Aguardando publicacao"
            rightLabel="Mais antigo primeiro"
          >
            {fila.length === 0 ? (
              <div className="glass rounded-[var(--r-lg)] px-6 py-10 text-center text-sm" style={{ color: 'var(--muted)' }}>
                Nenhum processo aguardando publicacao.
              </div>
            ) : (
              fila.map((p: any) => (
                <ProcessoRowDashboard key={p.id} {...p} href={`/processos/${p.id}/publicacao`} />
              ))
            )}
          </ProcessosListSection>

          {publicadosList.length > 0 && (
            <ProcessosListSection
              title="Historico de publicacoes"
              rightLabel="Recentes"
            >
              {publicadosList.map((p: any) => (
                <ProcessoRowDashboard key={p.id} {...p} />
              ))}
            </ProcessosListSection>
          )}
        </div>

        {/* Coluna lateral direita */}
        <div className="space-y-4">
          {urgente && (
            <DarkFeaturedCard
              titulo={`Processo ${urgente.numero_processo ?? urgente.id.slice(0, 8)} aguarda publicacao.`}
              descricao={urgente.objeto}
              href={`/processos/${urgente.id}/publicacao`}
              badge="Publicacao · Mais antigo na fila"
              meta={new Date(urgente.updated_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
            />
          )}
          <AiSuggestionCard
            texto={
              aguardando > 0
                ? `Ha ${aguardando} processo${aguardando > 1 ? 's' : ''} prontos para publicacao. Lembre-se de registrar no PNCP conforme exigido pela Lei 14.133/21.`
                : `Fila de publicacao vazia. Processos autorizados pelo gestor publico aparecerao aqui.`
            }
            hrefDetalhes={urgente ? `/processos/${urgente.id}/publicacao` : '/processos'}
          />
        </div>
      </div>

      <FooterEditorial />
    </div>
  )
}
