import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Bell, ShoppingCart } from 'lucide-react'
import { KPIBar } from '@/components/dashboard/kpi-bar'
import { FaseTimeline } from '@/components/dashboard/fase-timeline'
import { PendenciasCard } from '@/components/dashboard/pendencias-card'
import { ProcessoRowDashboard } from '@/components/dashboard/processo-row-dashboard'
import {
  FooterEditorial, SectionHeader, ProcessosListSection,
  NovoProcessoCTA, DarkFeaturedCard, AiSuggestionCard,
} from './shared'

interface Props {
  userId: string
  orgId: string
  cargo: string | null
  nome?: string | null
}

const FASE_LABELS: Record<string, string> = {
  requisitante: 'Requisitante', setor_compras: 'Compras', setor_licitacao: 'Licitações',
  procurador: 'Procuradoria', gestor_publico: 'Autorização', publicacao: 'Publicação',
}
const FASE_KEYS = ['requisitante','setor_compras','setor_licitacao','procurador','gestor_publico','publicacao']

export async function DashboardRequisitante({ userId, orgId, cargo, nome }: Props) {
  const supabase = await createClient()

  const inicioMes = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()

  const [{ data: processos }, { data: notifData }, { data: acoesIaData }] = await Promise.all([
    (supabase as any)
      .from('processos_licitatorios')
      .select('id, objeto, numero_processo, modalidade, status, fase_atual, updated_at, created_at, valor_estimado')
      .eq('criado_por', userId)
      .order('created_at', { ascending: false })
      .limit(50),
    (supabase as any)
      .from('notificacoes')
      .select('id')
      .eq('usuario_id', userId)
      .eq('lida', false),
    (supabase as any)
      .from('acoes_ia')
      .select('creditos_consumidos')
      .eq('usuario_id', userId)
      .gte('created_at', inicioMes),
  ])

  const lista = (processos as any[]) ?? []
  const notifCount = ((notifData as any[]) ?? []).length
  const creditosIaMes = ((acoesIaData as any[]) ?? []).reduce((acc: number, a: any) => acc + (a.creditos_consumidos ?? 0), 0)

  const contagens = {
    total:      lista.length,
    andamento:  lista.filter((p: any) => !['publicado','assinado'].includes(p.status)).length,
    concluidos: lista.filter((p: any) => ['publicado','assinado'].includes(p.status)).length,
    devolvidos: lista.filter((p: any) => p.status === 'devolvido').length,
  }

  const fases = FASE_KEYS.map((k) => ({
    key: k, label: FASE_LABELS[k],
    count: lista.filter((p: any) => p.fase_atual === k).length,
    devolvidos: lista.filter((p: any) => p.fase_atual === k && p.status === 'devolvido').length,
    parados: 0, href: `/processos?criado_por=me&fase=${k}`, isCurrent: k === 'requisitante',
  }))

  // Processo mais urgente para o card de destaque
  const urgente =
    lista.find((p: any) => p.status === 'devolvido') ??
    lista.find((p: any) => ['procurador','gestor_publico'].includes(p.fase_atual)) ??
    lista[0] ?? null

  // Contextual line para a saudacao
  const ctxLine = contagens.devolvidos > 0
    ? `${contagens.devolvidos} processo${contagens.devolvidos > 1 ? 's' : ''} devolvido${contagens.devolvidos > 1 ? 's' : ''} aguardam sua revisao.`
    : contagens.andamento > 0
      ? `${contagens.andamento} processo${contagens.andamento > 1 ? 's' : ''} em andamento.`
      : 'Nenhum processo pendente.'

  const recentes = lista.slice(0, 8)

  return (
    <div className="space-y-8">
      <SectionHeader
        supTitle="Painel · Requisitante"
        title="Seus processos."
        nome={nome}
        contextLine={ctxLine}
        subtitle={urgente ? `O processo ${urgente.numero_processo ?? urgente.id.slice(0, 8)} esta em tramitacao. Acompanhe o status abaixo.` : undefined}
        action={<NovoProcessoCTA />}
      />

      <FaseTimeline fases={fases} />

      <KPIBar items={[
        { label: 'Total criados',  value: contagens.total,     sub: 'processos',               sparkline: 'up',   delta: `${contagens.total} total`,     deltaColor: 'blue' },
        { label: 'Em andamento',   value: contagens.andamento, sub: 'na fila',                  sparkline: 'flat', delta: `${contagens.andamento} ativos`, deltaColor: 'muted' },
        { label: 'Concluidos',     value: contagens.concluidos, sub: 'publicados / assinados',  sparkline: 'up',   delta: 'concluidos',                    deltaColor: 'success' },
        { label: 'IA (mes)',       value: creditosIaMes.toLocaleString('pt-BR'), sub: 'creditos usados', sparkline: 'wave', delta: 'mes atual',           deltaColor: 'blue' },
      ]} />

      {/* Layout duas colunas: lista principal + coluna lateral */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-6 items-start">

        {/* Coluna principal */}
        <div className="space-y-6">
          <PendenciasCard userId={userId} orgId={orgId} faseAtual="requisitante" />

          {recentes.length > 0 ? (
            <ProcessosListSection
              title="Processos recentes"
              rightLabel={`${recentes.length} em curso`}
            >
              {recentes.map((p: any) => (
                <ProcessoRowDashboard key={p.id} {...p} />
              ))}
            </ProcessosListSection>
          ) : (
            <div className="glass rounded-[var(--r-lg)] px-6 py-12 text-center">
              <p className="text-sm" style={{ color: 'var(--muted)' }}>Nenhum processo criado ainda.</p>
              <Link href="/processos/novo" className="inline-flex items-center gap-1 mt-3 text-sm font-semibold" style={{ color: 'var(--primary)' }}>
                Iniciar primeiro processo
              </Link>
            </div>
          )}

          {/* Atalhos rapidos */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Link
              href="/notificacoes"
              className="glass lift rounded-[var(--r-lg)] flex items-center gap-4 p-5"
            >
              <div className="w-10 h-10 rounded-[var(--r-md)] flex items-center justify-center shrink-0" style={{ background: 'var(--primaryWash)' }}>
                <Bell className="w-5 h-5" style={{ color: 'var(--primary)' }} />
              </div>
              <div>
                <p className="font-semibold text-[14px]" style={{ color: 'var(--ink)', fontFamily: 'var(--font-heading)' }}>Notificacoes</p>
                <p className="text-[12px] mt-0.5" style={{ color: 'var(--muted)' }}>
                  {notifCount > 0 ? `${notifCount} nao lida${notifCount !== 1 ? 's' : ''}` : 'Nenhuma pendente'}
                </p>
              </div>
            </Link>
            <Link
              href="/compra-conjunta"
              className="glass lift rounded-[var(--r-lg)] flex items-center gap-4 p-5"
            >
              <div className="w-10 h-10 rounded-[var(--r-md)] flex items-center justify-center shrink-0" style={{ background: 'var(--primaryWash)' }}>
                <ShoppingCart className="w-5 h-5" style={{ color: 'var(--primary)' }} />
              </div>
              <div>
                <p className="font-semibold text-[14px]" style={{ color: 'var(--ink)', fontFamily: 'var(--font-heading)' }}>Compra Conjunta</p>
                <p className="text-[12px] mt-0.5" style={{ color: 'var(--muted)' }}>Demandas recebidas</p>
              </div>
            </Link>
          </div>
        </div>

        {/* Coluna lateral direita */}
        <div className="space-y-4">
          {urgente && (
            <DarkFeaturedCard
              titulo={`Processo ${urgente.numero_processo ?? urgente.id.slice(0, 8)} ${urgente.status === 'devolvido' ? 'foi devolvido para correcao.' : 'esta em tramitacao.'}`}
              descricao={urgente.objeto}
              href={`/processos/${urgente.id}/dfd`}
              badge={urgente.status === 'devolvido' ? 'Atencao · Devolvido' : `${FASE_LABELS[urgente.fase_atual] ?? 'Fase'} · Em andamento`}
              meta={new Date(urgente.updated_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}
            />
          )}

          <AiSuggestionCard
            texto={
              contagens.devolvidos > 0
                ? `Detectei ${contagens.devolvidos} processo${contagens.devolvidos > 1 ? 's' : ''} devolvido${contagens.devolvidos > 1 ? 's' : ''}. Posso ajudar a revisar os campos e melhorar o conteudo antes do reenvio.`
                : `Voce tem ${contagens.andamento} processo${contagens.andamento !== 1 ? 's' : ''} em andamento. Clique em qualquer documento para usar o Aprimorar com IA e acelerar a redacao.`
            }
            hrefDetalhes={urgente ? `/processos/${urgente.id}/dfd` : '/processos'}
          />
        </div>
      </div>

      <FooterEditorial />
    </div>
  )
}
