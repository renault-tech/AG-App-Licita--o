import { createClient } from '@/lib/supabase/server'
import { KPIBar } from '@/components/dashboard/kpi-bar'
import { FaseTimeline } from '@/components/dashboard/fase-timeline'
import type { FaseNode } from '@/components/dashboard/fase-timeline'
import { PendenciasCard } from '@/components/dashboard/pendencias-card'
import { ProcessoRowDashboard } from '@/components/dashboard/processo-row-dashboard'
import { AlertCircle, Inbox, ArrowRight, Clock } from 'lucide-react'
import Link from 'next/link'
import {
  FooterEditorial, SectionHeader,
  ProcessosListSection, DarkFeaturedCard, AiSuggestionCard,
} from './shared'

const PRIORIDADE_LABEL: Record<string, string> = {
  baixa: 'Baixa', media: 'Media', alta: 'Alta', urgente: 'Urgente',
}
const PRIORIDADE_COR: Record<string, string> = {
  baixa: '#6B7280', media: '#3B82F6', alta: '#F59E0B', urgente: '#EF4444',
}

interface Props {
  userId: string
  orgId: string
  cargo: string | null
  nome?: string | null
}

const FASE_LABELS: Record<string, string> = {
  requisitante: 'Requisitante',
  setor_compras: 'Compras',
  setor_licitacao: 'Licitações',
  procurador: 'Procuradoria',
  gestor_publico: 'Autorização',
  publicacao: 'Publicação',
}
const FASE_KEYS = ['requisitante', 'setor_compras', 'setor_licitacao', 'procurador', 'gestor_publico', 'publicacao']

export async function DashboardCompras({ userId, orgId, cargo, nome }: Props) {
  const supabase = await createClient()
  const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()

  const [
    { data: todosProcessos },
    { data: filaCompleta },
    { data: cotacoesFeitasData },
    { data: concluidosData },
    { data: acoesIaData },
    { data: solicitacoesPendentesData },
  ] = await Promise.all([
    (supabase as any)
      .from('processos_licitatorios')
      .select('id, fase_atual, status, valor_estimado')
      .eq('organizacao_id', orgId),
    (supabase as any)
      .from('processos_licitatorios')
      .select('id, objeto, numero_processo, modalidade, status, fase_atual, updated_at, valor_estimado')
      .eq('organizacao_id', orgId)
      .eq('fase_atual', 'setor_compras')
      .order('updated_at', { ascending: true })
      .limit(20),
    (supabase as any)
      .from('cotacoes')
      .select('id')
      .eq('organizacao_id', orgId)
      .gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString()),
    (supabase as any)
      .from('processos_licitatorios')
      .select('id, objeto, numero_processo, modalidade, status, fase_atual, updated_at')
      .eq('organizacao_id', orgId)
      .not('fase_atual', 'eq', 'setor_compras')
      .not('fase_atual', 'eq', 'requisitante')
      .order('updated_at', { ascending: false })
      .limit(10),
    (supabase as any)
      .from('acoes_ia')
      .select('creditos_consumidos')
      .eq('organizacao_id', orgId)
      .gte('created_at', inicioMes),
    (supabase as any)
      .from('solicitacoes_compra')
      .select('id, objeto, prioridade, created_at, secretarias(nome), usuarios(nome_completo)')
      .eq('organizacao_id', orgId)
      .in('status', ['enviada', 'em_analise'])
      .order('created_at', { ascending: true })
      .limit(5),
  ])

  const todos = (todosProcessos as any[]) ?? []
  const fila = (filaCompleta as any[]) ?? []
  const cotacoesSemana = ((cotacoesFeitasData as any[]) ?? []).length
  const concluidosList = (concluidosData as any[]) ?? []
  const creditosIaMes = ((acoesIaData as any[]) ?? []).reduce((acc: number, a: any) => acc + (a.creditos_consumidos ?? 0), 0)
  const solicitacoesPendentes = (solicitacoesPendentesData as any[]) ?? []
  const totalSolicitacoes = solicitacoesPendentes.length

  const valorEmFila = todos
    .filter((p: any) => p.fase_atual === 'setor_compras')
    .reduce((acc: number, p: any) => acc + (p.valor_estimado ?? 0), 0)

  const fases: FaseNode[] = FASE_KEYS.map((k) => ({
    key: k,
    label: FASE_LABELS[k],
    count: todos.filter((p: any) => p.fase_atual === k).length,
    devolvidos: todos.filter((p: any) => p.fase_atual === k && p.status === 'devolvido').length,
    parados: 0,
    href: `/processos?fase=${k}`,
    isCurrent: k === 'setor_compras',
  }))

  const naFila = fila.length
  const urgente = fila[0] ?? null

  const ctxLine = naFila > 0
    ? `${naFila} processo${naFila > 1 ? 's' : ''} aguardando cotacao.`
    : 'Fila vazia.'

  return (
    <div className="space-y-8">
      <SectionHeader
        supTitle="Setor de Compras"
        title="Fila de cotacoes."
        nome={nome}
        contextLine={ctxLine}
      />

      <FaseTimeline fases={fases} />

      <KPIBar items={[
        { label: 'Solicitacoes',      value: totalSolicitacoes, sub: 'aguardando analise', sparkline: totalSolicitacoes > 0 ? 'wave' : 'flat', delta: `${totalSolicitacoes} nova${totalSolicitacoes !== 1 ? 's' : ''}`, deltaColor: totalSolicitacoes > 0 ? 'warn' : 'muted' },
        { label: 'Na fila',           value: naFila,     sub: 'aguardando cotacao',   sparkline: naFila > 0 ? 'wave' : 'flat', delta: `${naFila} pendente${naFila !== 1 ? 's' : ''}`, deltaColor: naFila > 0 ? 'warn' : 'muted' },
        { label: 'Cotacoes (semana)', value: cotacoesSemana, sub: 'ultimos 7 dias',   sparkline: 'up',   delta: 'semana',    deltaColor: 'success' },
        { label: 'Valor em cotacao',  value: valorEmFila > 0 ? `R$ ${(valorEmFila / 1000).toFixed(0)}k` : 'R$ 0', sub: 'estimado', sparkline: 'up', delta: 'total', deltaColor: 'blue' },
      ]} />

      {naFila > 0 && (
        <div
          className="flex items-start gap-3 p-4 rounded-[var(--r-lg)] border"
          style={{ background: 'var(--warnWash)', borderColor: 'var(--warn)' }}
        >
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--warn)' }} />
          <p className="text-sm" style={{ color: 'var(--ink)' }}>
            A pesquisa de precos deve observar os parametros do Art. 23 da Lei 14.133/21,
            incluindo cotacoes de fornecedores, painel de precos e contratos anteriores.
          </p>
        </div>
      )}

      {/* Solicitacoes de compra pendentes das secretarias */}
      {totalSolicitacoes > 0 && (
        <div className="glass rounded-[var(--r-lg)] border border-amber-200 bg-amber-50/60 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-amber-200">
            <div className="flex items-center gap-2.5">
              <Inbox className="w-4 h-4 text-amber-600" />
              <span className="text-sm font-semibold text-amber-900">
                {totalSolicitacoes} solicitacao{totalSolicitacoes !== 1 ? 'es' : ''} aguardando analise
              </span>
            </div>
            <Link
              href="/solicitacoes"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-amber-700 hover:text-amber-900 transition-colors"
            >
              Ver todas
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="divide-y divide-amber-100">
            {solicitacoesPendentes.map((s: any) => (
              <Link
                key={s.id}
                href="/solicitacoes"
                className="flex items-start justify-between gap-4 px-5 py-3 hover:bg-amber-100/50 transition-colors"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{s.objeto}</p>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {s.secretarias?.nome ?? 'Secretaria nao informada'}
                    {s.usuarios?.nome_completo ? ` · ${s.usuarios.nome_completo}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: `${PRIORIDADE_COR[s.prioridade] ?? '#6B7280'}20`, color: PRIORIDADE_COR[s.prioridade] ?? '#6B7280' }}
                  >
                    {PRIORIDADE_LABEL[s.prioridade] ?? s.prioridade}
                  </span>
                  <div className="flex items-center gap-1 text-xs text-gray-400">
                    <Clock className="w-3 h-3" />
                    {new Date(s.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      <PendenciasCard userId={userId} orgId={orgId} faseAtual="setor_compras" />

      {/* Layout duas colunas */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-6 items-start">

        {/* Coluna principal */}
        <div className="space-y-6">
          <ProcessosListSection
            title="Fila de cotacao"
            rightLabel="Mais antigo primeiro"
          >
            {fila.length === 0 ? (
              <div className="glass rounded-[var(--r-lg)] px-6 py-10 text-center text-sm" style={{ color: 'var(--muted)' }}>
                Nenhum processo aguardando cotacao.
              </div>
            ) : (
              fila.map((p: any) => (
                <ProcessoRowDashboard key={p.id} {...p} href={`/processos/${p.id}/cotacao`} />
              ))
            )}
          </ProcessosListSection>

          {concluidosList.length > 0 && (
            <ProcessosListSection
              title="Cotacoes concluidas recentes"
              rightLabel="Avancaram de fase"
            >
              {concluidosList.map((p: any) => (
                <ProcessoRowDashboard key={p.id} {...p} />
              ))}
            </ProcessosListSection>
          )}
        </div>

        {/* Coluna lateral direita */}
        <div className="space-y-4">
          {urgente && (
            <DarkFeaturedCard
              titulo={`Processo ${urgente.numero_processo ?? urgente.id.slice(0, 8)} aguarda cotacao.`}
              descricao={urgente.objeto}
              href={`/processos/${urgente.id}/cotacao`}
              badge="Cotacao · Mais antigo na fila"
              meta={new Date(urgente.updated_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
            />
          )}
          <AiSuggestionCard
            texto={
              naFila > 0
                ? `Ha ${naFila} processo${naFila > 1 ? 's' : ''} aguardando cotacao. Lembre-se: o Art. 23 exige minimo de 3 fornecedores consultados na pesquisa direta de precos.`
                : 'Fila de cotacao vazia. Processos aprovados pelo setor requisitante aparecao aqui assim que chegarem.'
            }
            hrefDetalhes={urgente ? `/processos/${urgente.id}/cotacao` : '/processos'}
          />
        </div>
      </div>

      <FooterEditorial />
    </div>
  )
}
