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

const FASE_LABELS: Record<string, string> = {
  requisitante: 'Requisitante',
  setor_compras: 'Compras',
  setor_licitacao: 'Licitações',
  procurador: 'Procuradoria',
  gestor_publico: 'Autorização',
  publicacao: 'Publicação',
}
const FASE_KEYS = ['requisitante', 'setor_compras', 'setor_licitacao', 'procurador', 'gestor_publico', 'publicacao']

export async function DashboardLicitacoes({ userId, orgId, cargo, nome }: Props) {
  const supabase = await createClient()

  const [
    { data: todosProcessos },
    { data: naFila },
    { data: emProcuradoria },
    { data: editais },
  ] = await Promise.all([
    (supabase as any).from('processos_licitatorios').select('id, fase_atual, status').eq('organizacao_id', orgId),
    (supabase as any)
      .from('processos_licitatorios')
      .select('id, objeto, numero_processo, modalidade, status, fase_atual, updated_at, valor_estimado')
      .eq('organizacao_id', orgId)
      .eq('fase_atual', 'setor_licitacao')
      .order('updated_at', { ascending: true })
      .limit(20),
    (supabase as any)
      .from('processos_licitatorios')
      .select('id, objeto, numero_processo, modalidade, status, fase_atual, updated_at')
      .eq('organizacao_id', orgId)
      .eq('fase_atual', 'procurador')
      .limit(5),
    (supabase as any)
      .from('edital')
      .select('id, status')
      .eq('organizacao_id', orgId),
  ])

  const todos       = (todosProcessos as any[]) ?? []
  const filaList    = (naFila as any[]) ?? []
  const procList    = (emProcuradoria as any[]) ?? []
  const editaisList = (editais as any[]) ?? []

  const fases: FaseNode[] = FASE_KEYS.map((k) => ({
    key: k,
    label: FASE_LABELS[k],
    count: todos.filter((p: any) => p.fase_atual === k).length,
    devolvidos: todos.filter((p: any) => p.fase_atual === k && p.status === 'devolvido').length,
    parados: 0,
    href: `/processos?fase=${k}`,
    isCurrent: k === 'setor_licitacao',
  }))

  const editaisAguardando   = editaisList.filter((e: any) => e.status === 'pendente_assinatura').length
  const editaisEmElaboracao = editaisList.filter((e: any) => e.status === 'rascunho').length
  const editaisPublicados   = editaisList.filter((e: any) => e.status === 'publicado').length
  const devolvidosCount     = todos.filter((p: any) => p.status === 'devolvido').length
  const publicadosCount     = todos.filter((p: any) => p.status === 'publicado').length

  const urgente =
    filaList.find((p: any) => p.status === 'devolvido') ??
    filaList[0] ?? null

  const ctxLine = filaList.length > 0
    ? `${filaList.length} processo${filaList.length !== 1 ? 's' : ''} na fila, ${procList.length} em procuradoria.`
    : 'Fila vazia.'

  return (
    <div className="space-y-8">
      <SectionHeader
        supTitle="Setor de Licitacoes"
        title="Processos em tramitacao."
        nome={nome}
        contextLine={ctxLine}
      />

      <FaseTimeline fases={fases} />

      <KPIBar items={[
        { label: 'Na minha fila',   value: filaList.length,   sub: 'setor licitacao',   sparkline: filaList.length > 0 ? 'wave' : 'flat', delta: `${filaList.length} na fila`, deltaColor: filaList.length > 0 ? 'warn' : 'muted' },
        { label: 'Em procuradoria', value: procList.length,   sub: 'aguardando parecer', sparkline: 'flat', delta: `${procList.length} aguardando`, deltaColor: 'blue' },
        { label: 'Devolvidos',      value: devolvidosCount,   sub: 'para correcao',      sparkline: devolvidosCount > 0 ? 'down' : 'flat', delta: devolvidosCount > 0 ? 'atencao' : 'ok', deltaColor: devolvidosCount > 0 ? 'warn' : 'muted', accent: devolvidosCount > 0 },
        { label: 'Publicados',      value: publicadosCount,   sub: 'concluidos',          sparkline: 'up',   delta: 'total',    deltaColor: 'success' },
      ]} />

      <PendenciasCard userId={userId} orgId={orgId} faseAtual="setor_licitacao" />

      {/* Layout duas colunas */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-6 items-start">

        {/* Coluna principal */}
        <div className="space-y-6">
          {/* Mini KPIs de editais */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Aguardando assinatura', value: editaisAguardando, href: '/processos?fase=setor_licitacao', warn: editaisAguardando > 0 },
              { label: 'Em elaboracao',          value: editaisEmElaboracao, href: '/processos?status=rascunho', warn: false },
              { label: 'Publicados',             value: editaisPublicados, href: '/processos?status=publicado', warn: false },
            ].map((item) => (
              <a
                key={item.label}
                href={item.href}
                className="glass lift rounded-[var(--r-lg)] p-4 text-center block"
              >
                <div
                  className="text-2xl font-semibold"
                  style={{ fontFamily: 'var(--font-heading)', color: item.warn ? 'var(--warn)' : 'var(--ink)' }}
                >
                  {item.value}
                </div>
                <div className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
                  {item.label}
                </div>
              </a>
            ))}
          </div>

          <ProcessosListSection
            title="Processos na fila"
            rightLabel="Mais antigo primeiro"
          >
            {filaList.length === 0 ? (
              <div className="glass rounded-[var(--r-lg)] px-6 py-10 text-center text-sm" style={{ color: 'var(--muted)' }}>
                Nenhum processo na fila.
              </div>
            ) : (
              filaList.map((p: any) => (
                <ProcessoRowDashboard key={p.id} {...p} />
              ))
            )}
          </ProcessosListSection>

          {procList.length > 0 && (
            <ProcessosListSection
              title="Em procuradoria"
              rightLabel="Aguardando parecer"
            >
              {procList.map((p: any) => (
                <ProcessoRowDashboard key={p.id} {...p} />
              ))}
            </ProcessosListSection>
          )}
        </div>

        {/* Coluna lateral direita */}
        <div className="space-y-4">
          {urgente && (
            <DarkFeaturedCard
              titulo={
                urgente.status === 'devolvido'
                  ? `Processo ${urgente.numero_processo ?? urgente.id.slice(0, 8)} foi devolvido para correcao.`
                  : `Processo ${urgente.numero_processo ?? urgente.id.slice(0, 8)} aguarda sua atencao.`
              }
              descricao={urgente.objeto}
              href={`/processos/${urgente.id}/edital`}
              badge={urgente.status === 'devolvido' ? 'Atencao · Devolvido' : 'Licitacoes · Mais antigo'}
              meta={new Date(urgente.updated_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
            />
          )}
          <AiSuggestionCard
            texto={
              devolvidosCount > 0
                ? `Ha ${devolvidosCount} processo${devolvidosCount > 1 ? 's' : ''} devolvido${devolvidosCount > 1 ? 's' : ''} para correcao. Verifique os campos sinalizados antes de reenviar.`
                : filaList.length > 0
                  ? `Ha ${filaList.length} processo${filaList.length !== 1 ? 's' : ''} na fila. Use o Aprimorar com IA nos documentos para agilizar a redacao do edital.`
                  : 'Fila vazia. Novos processos aprovados pelo setor de compras aparecao aqui.'
            }
            hrefDetalhes={urgente ? `/processos/${urgente.id}/edital` : '/processos'}
          />
        </div>
      </div>

      <FooterEditorial />
    </div>
  )
}
