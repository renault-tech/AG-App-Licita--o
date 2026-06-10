import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Bell, ShoppingCart, Users, ArrowRight, Clock } from 'lucide-react'
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

  // Busca secretaria_id do usuario para consulta de compra conjunta
  const { data: usuarioData } = await (supabase as any)
    .from('usuarios')
    .select('secretaria_id')
    .eq('id', userId)
    .maybeSingle()
  const secretariaId: string | null = (usuarioData as any)?.secretaria_id ?? null

  const [{ data: processos }, { data: notifData }, { data: acoesIaData }, { data: avisosData }, { data: minhasSolicitacoesData }] = await Promise.all([
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
    // Convites de compra conjunta pendentes para a secretaria do usuario
    secretariaId
      ? (supabase as any)
          .from('avisos_destinatarias')
          .select('id, status, avisos_compra_conjunta(id, titulo, prazo_adesao, processo_id, criado_por, processos_licitatorios(objeto, numero_processo, modalidade))')
          .eq('secretaria_id', secretariaId)
          .eq('status', 'pendente')
          .limit(5)
      : Promise.resolve({ data: [] }),
    (supabase as any)
      .from('solicitacoes_compra')
      .select('id, objeto, status, prioridade, created_at')
      .eq('usuario_id', userId)
      .in('status', ['rascunho', 'enviada', 'em_analise'])
      .order('created_at', { ascending: false })
      .limit(3),
  ])

  const lista = (processos as any[]) ?? []
  const notifCount = ((notifData as any[]) ?? []).length
  const creditosIaMes = ((acoesIaData as any[]) ?? []).reduce((acc: number, a: any) => acc + (a.creditos_consumidos ?? 0), 0)
  const avisosConvite = ((avisosData as any[]) ?? []).filter((a: any) => a.avisos_compra_conjunta)
  const minhasSolicitacoes = (minhasSolicitacoesData as any[]) ?? []

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

          {/* Minhas solicitacoes de compra em aberto */}
          {minhasSolicitacoes.length > 0 && (
            <div className="glass rounded-[var(--r-lg)] overflow-hidden">
              <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--hairline)' }}>
                <div className="flex items-center gap-2">
                  <ShoppingCart className="w-4 h-4" style={{ color: 'var(--primary)' }} />
                  <span className="text-[13px] font-semibold" style={{ color: 'var(--ink)', fontFamily: 'var(--font-heading)' }}>
                    Minhas Solicitacoes
                  </span>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: 'var(--primaryWash)', color: 'var(--primary)' }}>
                    {minhasSolicitacoes.length}
                  </span>
                </div>
                <Link href="/solicitacoes" className="text-[11px] flex items-center gap-1" style={{ color: 'var(--primary)' }}>
                  Ver todas <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
              <div className="divide-y" style={{ borderColor: 'var(--hairline)' }}>
                {minhasSolicitacoes.map((s: any) => {
                  const STATUS_LABEL: Record<string, string> = { rascunho: 'Rascunho', enviada: 'Enviada', em_analise: 'Em analise' }
                  const STATUS_COR: Record<string, string> = { rascunho: 'var(--muted)', enviada: 'var(--primary)', em_analise: '#F59E0B' }
                  return (
                    <Link
                      key={s.id}
                      href="/solicitacoes"
                      className="flex items-center justify-between gap-3 px-5 py-3 transition-colors"
                      style={{ background: 'transparent' }}
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium truncate" style={{ color: 'var(--ink)' }}>{s.objeto}</p>
                        <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                          {new Date(s.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                        </p>
                      </div>
                      <span className="text-[11px] font-semibold shrink-0" style={{ color: STATUS_COR[s.status] ?? 'var(--muted)' }}>
                        {STATUS_LABEL[s.status] ?? s.status}
                      </span>
                    </Link>
                  )
                })}
              </div>
              <div className="px-5 py-3" style={{ borderTop: '1px solid var(--hairline)' }}>
                <Link
                  href="/solicitacoes/nova"
                  className="text-[13px] font-semibold flex items-center gap-1.5"
                  style={{ color: 'var(--primary)' }}
                >
                  <Bell className="w-3.5 h-3.5" />
                  Nova solicitacao de compra
                </Link>
              </div>
            </div>
          )}

          {/* Card de convites de compra conjunta */}
          {avisosConvite.length > 0 && (
            <div className="glass rounded-[var(--r-lg)] overflow-hidden">
              <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: '1px solid var(--hairline)' }}>
                <div className="flex items-center gap-2">
                  <Users className="w-4 h-4" style={{ color: 'var(--primary)' }} />
                  <span className="text-[13px] font-semibold" style={{ color: 'var(--ink)', fontFamily: 'var(--font-heading)' }}>
                    Convites de Compra Conjunta
                  </span>
                  <span
                    className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
                    style={{ background: 'var(--primaryWash)', color: 'var(--primary)' }}
                  >
                    {avisosConvite.length}
                  </span>
                </div>
                <Link href="/processos" className="text-[11px]" style={{ color: 'var(--primary)' }}>
                  Ver todos
                </Link>
              </div>
              <div className="divide-y" style={{ borderColor: 'var(--hairline)' }}>
                {avisosConvite.map((ad: any) => {
                  const aviso = ad.avisos_compra_conjunta
                  const proc = aviso?.processos_licitatorios
                  const prazo = aviso?.prazo_adesao ? new Date(aviso.prazo_adesao) : null
                  const diasRestantes = prazo ? Math.ceil((prazo.getTime() - Date.now()) / 86400000) : null
                  return (
                    <Link
                      key={ad.id}
                      href={`/processos/${aviso?.processo_id ?? ''}`}
                      className="flex items-center gap-3 px-5 py-3.5 hover:bg-[var(--surface)] transition-colors group"
                    >
                      <div className="flex-1 min-w-0">
                        <p className="text-[13px] font-medium truncate" style={{ color: 'var(--ink)' }}>
                          {aviso?.titulo ?? proc?.objeto ?? 'Compra conjunta'}
                        </p>
                        {proc && (
                          <p className="text-[11px] mt-0.5 truncate" style={{ color: 'var(--muted)' }}>
                            {proc.numero_processo ? `${proc.numero_processo} · ` : ''}{proc.objeto}
                          </p>
                        )}
                      </div>
                      {diasRestantes !== null && (
                        <div className="flex items-center gap-1 shrink-0">
                          <Clock className="w-3 h-3" style={{ color: diasRestantes <= 2 ? 'var(--danger)' : 'var(--warn)' }} />
                          <span
                            className="text-[10px] font-bold"
                            style={{ color: diasRestantes <= 2 ? 'var(--danger)' : 'var(--warn)' }}
                          >
                            {diasRestantes <= 0 ? 'hoje' : `${diasRestantes}d`}
                          </span>
                        </div>
                      )}
                      <ArrowRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--muted)' }} />
                    </Link>
                  )
                })}
              </div>
            </div>
          )}

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
