import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { FileText, PlusCircle, X, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { obterPapelEfetivo, obterPapelUsuario } from '@/lib/actions/usuario'
import { PODE_CRIAR_PROCESSO, podeFazer } from '@/lib/permissions'
import type { PapelUsuario } from '@/types/database'
import BotaoExcluirProcesso from './botao-excluir-processo'
import { EditorialKicker, HeadlineSerif } from '@/components/licita/editorial'
import BuscaProcessos from './busca-processos'
import PaginacaoProcessos from './paginacao-processos'
import { EmptyState } from '@/components/licita/empty-state'
import { ProcessoRowDashboard } from '@/components/dashboard/processo-row-dashboard'
import { Suspense } from 'react'

const PAGE_SIZE = 20

const MODALIDADE_LABEL: Record<string, string> = {
  pregao_eletronico:   'Pregão Eletrônico',
  pregao_presencial:   'Pregão Presencial',
  concorrencia:        'Concorrência',
  concurso:            'Concurso',
  leilao:              'Leilão',
  dialogo_competitivo: 'Diálogo Competitivo',
  dispensa:            'Dispensa',
  inexigibilidade:     'Inexigibilidade',
}

const FILTRO_STATUS_LABEL: Record<string, string> = {
  em_andamento: 'Em Andamento',
  concluido:    'Concluídos',
  publicado:    'Publicados',
  assinado:     'Assinados',
  rascunho:     'Rascunho',
  em_revisao:   'Em Revisão',
}

const FILTRO_FASE_LABEL: Record<string, string> = {
  requisitante:    'Requisitante',
  setor_compras:   'Setor de Compras',
  setor_licitacao: 'Setor de Licitações',
  procurador:      'Procuradoria',
  gestor_publico:  'Autoridade Competente',
  publicacao:      'Publicação',
}

// Papeis cujos usuários só enxergam processos que já chegaram ao seu setor
const PAPEIS_VISIBILIDADE_RESTRITA = new Set([
  'setor_compras', 'setor_licitacao', 'procurador', 'gestor_publico', 'publicacao',
])

function aplicarFiltros(
  baseQuery: any,
  papel: string | null,
  userId: string,
  orgId: string,
  visibleIds: string[],
  filtroStatus?: string,
  filtroFase?: string,
  qSafe?: string,
  filtroCriadoPor?: string
) {
  let q = baseQuery

  if (papel === 'requisitante' || filtroCriadoPor === 'me') {
    q = q.eq('criado_por', userId)
  } else {
    q = q.eq('organizacao_id', orgId)
  }

  // Visibilidade restrita: só mostra processos que já chegaram ao setor do usuário
  if (papel && PAPEIS_VISIBILIDADE_RESTRITA.has(papel) && filtroCriadoPor !== 'me') {
    if (visibleIds.length > 0) {
      q = q.or(`fase_atual.eq.${papel},id.in.(${visibleIds.join(',')})`)
    } else {
      q = q.eq('fase_atual', papel)
    }
  }

  if (filtroStatus === 'em_andamento') {
    q = q.in('status', ['rascunho', 'em_revisao'])
  } else if (filtroStatus === 'concluido') {
    q = q.in('status', ['publicado', 'assinado'])
  } else if (filtroStatus) {
    q = q.eq('status', filtroStatus)
  }

  if (filtroFase) {
    q = q.eq('fase_atual', filtroFase)
  }

  if (qSafe) {
    q = q.or(`objeto.ilike.%${qSafe}%,numero_processo.ilike.%${qSafe}%`)
  }

  return q
}

export default async function ProcessosPage({
  searchParams,
}: {
  searchParams: { status?: string; fase?: string; q?: string; page?: string; criado_por?: string }
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Usa papel efetivo (considera profile switcher) para filtros de visibilidade
  const [papel, papelReal] = await Promise.all([
    obterPapelEfetivo(),
    obterPapelUsuario(),
  ])

  const { data: usuarioData } = await supabase
    .from('usuarios')
    .select('organizacao_id, secretaria_id')
    .eq('id', user.id)
    .maybeSingle()

  const organizacaoId = (usuarioData as any)?.organizacao_id
  const secretariaId  = (usuarioData as any)?.secretaria_id
  if (!organizacaoId) redirect('/dashboard')

  // So requisitante e administradores originam processos (ver PODE_CRIAR_PROCESSO)
  const podeCriar = podeFazer(papel as PapelUsuario | null, PODE_CRIAR_PROCESSO)

  const filtroStatus    = searchParams.status
  const filtroFase      = searchParams.fase
  const filtroCriadoPor = searchParams.criado_por
  const q    = searchParams.q?.trim() ?? ''
  const page = Math.max(1, parseInt(searchParams.page ?? '1', 10))
  const qSafe = q.replace(/[%_;\\]/g, '')

  // Pré-busca IDs de processos que já chegaram ao setor do usuário (via tramitacao_historico)
  let visibleIds: string[] = []
  if (papel && PAPEIS_VISIBILIDADE_RESTRITA.has(papel)) {
    const { data: hist } = await (supabase as any)
      .from('tramitacao_historico')
      .select('processo_id')
      .eq('para_papel', papel)
    visibleIds = [...new Set(((hist ?? []) as any[]).map(h => h.processo_id))]
  }

  // Para requisitante: também busca processos de avisos onde é destinatária (compra conjunta)
  let processosConvidadosIds: string[] = []
  if (papel === 'requisitante' && secretariaId) {
    const { data: convites } = await (supabase as any)
      .from('avisos_destinatarias')
      .select('aviso:avisos_compra_conjunta!aviso_id(processo_id)')
      .eq('secretaria_id', secretariaId)
    processosConvidadosIds = ((convites ?? []) as any[])
      .map((c: any) => c.aviso?.processo_id)
      .filter(Boolean)
  }

  const [{ count: totalCount }, { data: processos }] = await Promise.all([
    aplicarFiltros(
      (supabase as any).from('processos_licitatorios').select('id', { count: 'exact', head: true }),
      papel, user.id, organizacaoId, visibleIds, filtroStatus, filtroFase, qSafe, filtroCriadoPor
    ),
    aplicarFiltros(
      (supabase as any).from('processos_licitatorios').select('id, objeto, modalidade, status, fase_atual, numero_processo, valor_estimado, created_at, updated_at, criado_por'),
      papel, user.id, organizacaoId, visibleIds, filtroStatus, filtroFase, qSafe, filtroCriadoPor
    )
      .order('created_at', { ascending: false })
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1),
  ])

  const lista = (processos as any[] | null) ?? []
  const total = totalCount ?? 0

  // Calcular totais sem filtro para os KPIs
  const { data: todosProcessos } = await aplicarFiltros(
    (supabase as any).from('processos_licitatorios').select('status'),
    papel, user.id, organizacaoId, visibleIds
  )
  const todos = (todosProcessos as any[] | null) ?? []
  const totais = {
    total:      todos.length,
    rascunho:   todos.filter((p: any) => p.status === 'rascunho').length,
    emRevisao:  todos.filter((p: any) => p.status === 'em_revisao').length,
    concluidos: todos.filter((p: any) => p.status === 'publicado' || p.status === 'assinado').length,
  }

  // Busca nomes dos criadores em batch
  const criadorIds = [...new Set(lista.map((p: any) => p.criado_por).filter(Boolean))]
  const criadoresMap: Record<string, string> = {}
  if (criadorIds.length > 0) {
    const { data: criadores } = await supabase
      .from('usuarios')
      .select('id, nome_completo')
      .in('id', criadorIds)
    for (const c of (criadores ?? []) as any[]) {
      criadoresMap[c.id] = c.nome_completo
    }
  }

  // Busca avisos vinculados aos processos da lista
  const processIds = lista.map((p: any) => p.id)
  const avisosMap: Record<string, { prazo_adesao: string; status: string }> = {}
  if (processIds.length > 0) {
    const { data: avisos } = await (supabase as any)
      .from('avisos_compra_conjunta')
      .select('id, processo_id, prazo_adesao, status')
      .in('processo_id', processIds)
    for (const a of (avisos ?? []) as any[]) {
      avisosMap[a.processo_id] = { prazo_adesao: a.prazo_adesao, status: a.status }
    }
  }

  // Busca processos de convite (compra conjunta) para requisitante
  let processosConvidados: any[] = []
  if (papel === 'requisitante' && processosConvidadosIds.length > 0) {
    const idsJaNaLista = new Set(lista.map((p: any) => p.id))
    const idsNovos = processosConvidadosIds.filter(id => !idsJaNaLista.has(id))
    if (idsNovos.length > 0) {
      const { data: convdProcessos } = await (supabase as any)
        .from('processos_licitatorios')
        .select('id, objeto, modalidade, status, fase_atual, numero_processo, valor_estimado, created_at, updated_at, criado_por')
        .in('id', idsNovos)
        .order('created_at', { ascending: false })
      processosConvidados = (convdProcessos as any[] | null) ?? []

      // Completar criadoresMap para processos convidados
      const convCriadorIds = processosConvidados.map(p => p.criado_por).filter((id: string) => id && !criadoresMap[id])
      if (convCriadorIds.length > 0) {
        const { data: convCriadores } = await supabase
          .from('usuarios')
          .select('id, nome_completo')
          .in('id', convCriadorIds)
        for (const c of (convCriadores ?? []) as any[]) {
          criadoresMap[c.id] = c.nome_completo
        }
      }
    }
  }

  const filtroAtivo  = filtroStatus || filtroFase || qSafe || filtroCriadoPor
  const filtroLabel  = filtroStatus
    ? (FILTRO_STATUS_LABEL[filtroStatus] ?? filtroStatus)
    : filtroFase
    ? (FILTRO_FASE_LABEL[filtroFase] ?? filtroFase)
    : filtroCriadoPor === 'me'
    ? 'Meus processos'
    : null

  return (
    <div className="space-y-8">
      {/* Masthead editorial */}
      <div>
        <div
          className="flex items-center justify-between pb-3.5 mb-6"
          style={{ borderBottom: '2px solid var(--rule)' }}
        >
          <EditorialKicker
            kicker="Processos Licitatórios"
            date={new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }).replaceAll('/', '·')}
          />
          {podeCriar && (
            <Link href="/processos/novo">
              <Button
                className="text-white h-9 px-5 text-sm font-semibold gap-2 rounded-[var(--r-md)]"
                style={{ background: 'var(--primary)' }}
              >
                <PlusCircle className="w-4 h-4" />
                Novo processo
              </Button>
            </Link>
          )}
        </div>

        <HeadlineSerif size="md" as="h1">
          Processos em elaboração.
        </HeadlineSerif>
        <div className="mt-2 flex items-center gap-3 flex-wrap">
          <p className="text-[15px]" style={{ color: 'var(--inkSoft)', fontFamily: 'var(--font-heading)' }}>
            {totais.total} processo{totais.total !== 1 ? 's' : ''} · {totais.emRevisao} em revisão
          </p>
          {filtroAtivo && filtroLabel && (
            <Link
              href="/processos"
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full border transition-colors hover:opacity-80"
              style={{ background: 'var(--primaryWash)', color: 'var(--primary)', borderColor: 'var(--primary)' + '40' }}
            >
              Filtro: {filtroLabel}
              <X className="w-3 h-3" />
            </Link>
          )}
        </div>
      </div>

      {/* KPI rail */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: 'Total',      valor: totais.total,      sub: 'processos',           href: '/processos' },
          { label: 'Rascunho',   valor: totais.rascunho,   sub: 'em elaboracao',       href: '/processos?status=rascunho' },
          { label: 'Em revisao', valor: totais.emRevisao,  sub: 'aguardando analise',  href: '/processos?status=em_revisao' },
          { label: 'Concluidos', valor: totais.concluidos, sub: 'publicados/assinados', href: '/processos?status=concluido' },
        ].map((k) => (
          <Link key={k.label} href={k.href} className="glass lift rounded-[var(--r-lg)] block px-5 pt-4 pb-3.5">
            <div className="l-meta mb-2" style={{ color: 'var(--muted)' }}>{k.label}</div>
            <div
              className="l-h l-tnum"
              style={{ fontFamily: 'var(--font-heading)', fontSize: 36, lineHeight: 0.94, letterSpacing: '-0.03em', color: 'var(--ink)', fontWeight: 500 }}
            >
              {k.valor}
            </div>
            <div className="text-[11px] mt-2" style={{ color: 'var(--inkSoft)' }}>{k.sub}</div>
          </Link>
        ))}
      </div>

      {/* Convites de Compra Conjunta (somente para requisitante com convites pendentes) */}
      {papel === 'requisitante' && processosConvidados.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" style={{ color: 'var(--primary)' }} />
            <h2 className="text-[14px] font-semibold" style={{ color: 'var(--ink)', fontFamily: 'var(--font-heading)' }}>
              Convites de Compra Conjunta
            </h2>
            <span
              className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: 'var(--primaryWash)', color: 'var(--primary)' }}
            >
              {processosConvidados.length}
            </span>
          </div>
          {processosConvidados.map((p: any) => {
            const aviso = avisosMap[p.id]
            return (
              <div key={p.id} className="flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <ProcessoRowDashboard
                    id={p.id}
                    objeto={p.objeto}
                    numero_processo={p.numero_processo}
                    modalidade={p.modalidade}
                    status={p.status}
                    fase_atual={p.fase_atual ?? null}
                    updated_at={p.updated_at ?? p.created_at}
                    valor_estimado={p.valor_estimado}
                    criadoPorNome={criadoresMap[p.criado_por] ?? null}
                    ehMeu={false}
                    compraConjunta
                    avisoPrazo={aviso?.prazo_adesao ?? null}
                  />
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Cabecalho da lista */}
      <div className="flex flex-row items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-[15px] font-semibold" style={{ color: 'var(--ink)', fontFamily: 'var(--font-heading)' }}>
            Processos{filtroLabel ? ` · ${filtroLabel}` : ''}
          </h2>
          <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>
            {papel === 'requisitante' ? 'Processos que voce criou' : 'Todos os processos da organizacao'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Suspense>
            <BuscaProcessos />
          </Suspense>
          {podeCriar && (
            <Link href="/processos/novo">
              <Button variant="outline" size="sm" className="gap-1.5 text-sm h-9" style={{ borderColor: 'var(--hairline)', color: 'var(--primary)' }}>
                <PlusCircle className="w-4 h-4" /> Novo
              </Button>
            </Link>
          )}
        </div>
      </div>

      {/* Lista de processos */}
      {lista.length === 0 ? (
        !qSafe && !filtroStatus && !filtroFase ? (
          <div className="glass rounded-[var(--r-lg)]">
            <EmptyState
              icon={FileText}
              titulo="Nenhum processo encontrado"
              descricao={podeCriar
                ? 'Crie o primeiro processo licitatorio da sua organizacao.'
                : 'Ainda nao ha processos que tenham chegado ao seu setor.'}
              cta={podeCriar ? { label: 'Novo Processo', href: '/processos/novo' } : undefined}
            />
          </div>
        ) : (
          <div className="glass rounded-[var(--r-lg)]">
            <EmptyState
              icon={FileText}
              titulo="Nenhum resultado para esse filtro"
              descricao="Tente remover os filtros ou alterar o texto da busca."
              cta={{ label: 'Limpar filtros', href: '/processos' }}
            />
          </div>
        )
      ) : (
        <div className="space-y-2">
          {lista.map((p: any) => {
            const aviso = avisosMap[p.id]
            return (
              <div key={p.id} className="flex items-center gap-2">
                <div className="flex-1 min-w-0">
                  <ProcessoRowDashboard
                    id={p.id}
                    objeto={p.objeto}
                    numero_processo={p.numero_processo}
                    modalidade={p.modalidade}
                    status={p.status}
                    fase_atual={p.fase_atual ?? null}
                    updated_at={p.updated_at ?? p.created_at}
                    valor_estimado={p.valor_estimado}
                    criadoPorNome={criadoresMap[p.criado_por] ?? null}
                    ehMeu={p.criado_por === user.id}
                    compraConjunta={!!aviso}
                    avisoPrazo={aviso?.prazo_adesao ?? null}
                  />
                </div>
                {['admin_organizacao', 'admin_plataforma'].includes(papelReal ?? '') && (
                  <BotaoExcluirProcesso processoId={p.id} objeto={p.objeto} />
                )}
              </div>
            )
          })}
          <PaginacaoProcessos
            total={total}
            page={page}
            pageSize={PAGE_SIZE}
            q={qSafe || undefined}
            status={filtroStatus}
            fase={filtroFase}
            criadoPor={filtroCriadoPor}
          />
        </div>
      )}
    </div>
  )
}
