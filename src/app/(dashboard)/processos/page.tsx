import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { FileText, PlusCircle, ArrowRight, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { obterPapelUsuario } from '@/lib/actions/usuario'
import BotaoExcluirProcesso from './botao-excluir-processo'
import { StatusPill } from '@/components/licita/status-pill'
import type { StatusProcesso } from '@/components/licita/status-pill'
import { EditorialKicker, HeadlineSerif } from '@/components/licita/editorial'
import BuscaProcessos from './busca-processos'
import PaginacaoProcessos from './paginacao-processos'
import { EmptyState } from '@/components/licita/empty-state'
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

function aplicarFiltros(
  baseQuery: any,
  papel: string | null,
  userId: string,
  orgId: string,
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

  const papel = await obterPapelUsuario()

  const { data: usuarioData } = await supabase
    .from('usuarios')
    .select('organizacao_id')
    .eq('id', user.id)
    .maybeSingle()

  const organizacaoId = (usuarioData as any)?.organizacao_id
  if (!organizacaoId) redirect('/dashboard')

  const filtroStatus   = searchParams.status
  const filtroFase     = searchParams.fase
  const filtroCriadoPor = searchParams.criado_por
  const q    = searchParams.q?.trim() ?? ''
  const page = Math.max(1, parseInt(searchParams.page ?? '1', 10))
  const qSafe = q.replace(/[%_;\\]/g, '')

  const [{ count: totalCount }, { data: processos }] = await Promise.all([
    aplicarFiltros(
      (supabase as any).from('processos_licitatorios').select('id', { count: 'exact', head: true }),
      papel, user.id, organizacaoId, filtroStatus, filtroFase, qSafe, filtroCriadoPor
    ),
    aplicarFiltros(
      (supabase as any).from('processos_licitatorios').select('id, objeto, modalidade, status, numero_processo, valor_estimado, created_at'),
      papel, user.id, organizacaoId, filtroStatus, filtroFase, qSafe, filtroCriadoPor
    )
      .order('created_at', { ascending: false })
      .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1),
  ])

  const lista = (processos as any[] | null) ?? []
  const total = totalCount ?? 0

  // Calcular totais sem filtro para os KPIs (sem filtros de status/fase/q)
  const { data: todosProcessos } = await aplicarFiltros(
    (supabase as any).from('processos_licitatorios').select('status'),
    papel, user.id, organizacaoId
  )
  const todos = (todosProcessos as any[] | null) ?? []
  const totais = {
    total:      todos.length,
    rascunho:   todos.filter((p: any) => p.status === 'rascunho').length,
    emRevisao:  todos.filter((p: any) => p.status === 'em_revisao').length,
    concluidos: todos.filter((p: any) => p.status === 'publicado' || p.status === 'assinado').length,
  }

  const filtroAtivo = filtroStatus || filtroFase || qSafe || filtroCriadoPor
  const filtroLabel = filtroStatus
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
          <Link href="/processos/novo">
            <Button
              className="text-white h-9 px-5 text-sm font-semibold gap-2 rounded-[var(--r-md)]"
              style={{ background: 'var(--primary)' }}
            >
              <PlusCircle className="w-4 h-4" />
              Novo processo
            </Button>
          </Link>
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
      <div className="glass grid grid-cols-4 overflow-hidden rounded-[var(--r-lg)]">
        {[
          { label: 'Total', valor: totais.total, sub: 'processos', href: '/processos' },
          { label: 'Rascunho', valor: totais.rascunho, sub: 'em elaboração', href: '/processos?status=rascunho' },
          { label: 'Em revisão', valor: totais.emRevisao, sub: 'aguardando análise', href: '/processos?status=em_revisao' },
          { label: 'Concluídos', valor: totais.concluidos, sub: 'publicados/assinados', href: '/processos?status=concluido' },
        ].map((k, i, arr) => (
          <Link key={k.label} href={k.href} className="block transition-colors hover:bg-[var(--surfaceAlt)]">
            <div className="px-5 pt-4 pb-3.5" style={{ borderRight: i < arr.length - 1 ? '1px solid var(--hairline)' : 'none' }}>
              <div className="l-meta mb-2" style={{ color: 'var(--muted)' }}>{k.label}</div>
              <div
                className="l-h l-tnum"
                style={{ fontFamily: 'var(--font-heading)', fontSize: 40, lineHeight: 0.94, letterSpacing: '-0.03em', color: 'var(--ink)', fontWeight: 500 }}
              >
                {k.valor}
              </div>
              <div className="text-[11px] mt-2" style={{ color: 'var(--inkSoft)' }}>{k.sub}</div>
            </div>
          </Link>
        ))}
      </div>

      {/* Lista */}
      <div className="glass rounded-[var(--r-lg)] overflow-hidden">
        {/* Card header */}
        <div
          className="flex flex-row items-center justify-between px-6 py-5 border-b gap-4 flex-wrap"
          style={{ background: 'rgba(0,0,0,0.025)', borderColor: 'var(--glass-edge)' }}
        >
          <div>
            <h2 className="text-lg font-semibold" style={{ color: 'var(--ink)', fontFamily: 'var(--font-heading)' }}>
              Processos{filtroLabel ? ` · ${filtroLabel}` : ''}
            </h2>
            <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
              {papel === 'requisitante' ? 'Processos que você criou' : 'Todos os processos da organização'}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Suspense>
              <BuscaProcessos />
            </Suspense>
            <Link href="/processos/novo">
              <Button variant="outline" size="sm" className="gap-1.5 text-sm h-9" style={{ borderColor: 'var(--hairline)', color: 'var(--primary)' }}>
                <PlusCircle className="w-4 h-4" /> Novo
              </Button>
            </Link>
          </div>
        </div>

        {/* Conteudo */}
        {lista.length === 0 ? (
          !qSafe && !filtroStatus && !filtroFase ? (
            <EmptyState
              icon={FileText}
              titulo="Nenhum processo encontrado"
              descricao="Crie o primeiro processo licitatorio da sua organizacao."
              cta={{ label: 'Novo Processo', href: '/processos/novo' }}
            />
          ) : (
            <EmptyState
              icon={FileText}
              titulo="Nenhum resultado para esse filtro"
              descricao="Tente remover os filtros ou alterar o texto da busca."
              cta={{ label: 'Limpar filtros', href: '/processos' }}
            />
          )
        ) : (
          <div>
            {lista.map((p: any) => {
              const modalidade = MODALIDADE_LABEL[p.modalidade] ?? p.modalidade
              const status = (p.status as StatusProcesso) ?? 'rascunho'
              return (
                <div
                  key={p.id}
                  className="flex items-center gap-2 px-6 py-5 transition-colors group hover:bg-[var(--surfaceAlt)]"
                  style={{ borderBottom: '1px solid var(--hairline)' }}
                >
                  <Link href={`/processos/${p.id}/dfd`} className="flex items-center gap-4 flex-1 min-w-0">
                    <div
                      className="w-10 h-10 rounded-[var(--r-md)] flex items-center justify-center shrink-0"
                      style={{ background: 'var(--primaryWash)' }}
                    >
                      <FileText className="w-[18px] h-[18px]" style={{ color: 'var(--primary)' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[15px] font-semibold truncate" style={{ color: 'var(--ink)' }}>
                        {p.numero_processo ? `${p.numero_processo} - ` : ''}{p.objeto}
                      </p>
                      <div className="flex items-center gap-2.5 mt-1 flex-wrap">
                        <span className="text-sm" style={{ color: 'var(--muted)' }}>{modalidade}</span>
                        {p.valor_estimado > 0 && (
                          <>
                            <span style={{ color: 'var(--hairline)' }}>|</span>
                            <span className="text-sm font-medium" style={{ color: 'var(--inkSoft)' }}>
                              R$ {(p.valor_estimado as number).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span className="hidden sm:block">
                        <StatusPill status={status} size="sm" />
                      </span>
                      <ArrowRight className="w-4 h-4" style={{ color: 'var(--mutedSoft)' }} />
                    </div>
                  </Link>
                  {['admin_organizacao', 'admin_plataforma'].includes(papel ?? '') && (
                    <BotaoExcluirProcesso processoId={p.id} objeto={p.objeto} />
                  )}
                </div>
              )
            })}
            <div className="px-6">
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
          </div>
        )}
      </div>
    </div>
  )
}
