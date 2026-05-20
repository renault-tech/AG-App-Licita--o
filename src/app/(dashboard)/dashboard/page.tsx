import { createClient, createServiceClient } from '@/lib/supabase/server'
import {
  FileText, PlusCircle, Clock, CheckCircle, ArrowRight,
  AlertCircle, Gavel, Zap, Scale, ShieldCheck,
  Filter, CheckCircle2, Share2, Send, Globe, Building2, Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import type { PapelUsuario } from '@/types/database'
import { KPICard } from '@/components/licita/kpi-card'
import { StatusPill } from '@/components/licita/status-pill'
import type { StatusProcesso } from '@/components/licita/status-pill'

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

const PARECER_STATUS_CONFIG: Record<string, { label: string; bg: string; color: string }> = {
  pendente:               { label: 'Aguardando Parecer',    bg: 'var(--warnWash)',    color: 'var(--warn)'    },
  aprovado:               { label: 'Aprovado',              bg: 'var(--successWash)', color: 'var(--success)' },
  aprovado_com_ressalvas: { label: 'Aprovado c/ Ressalvas', bg: 'var(--primaryWash)', color: 'var(--primary)' },
  devolvido:              { label: 'Devolvido',             bg: 'var(--dangerWash)',  color: 'var(--danger)'  },
}

const AUTORIZACAO_STATUS: Record<string, { label: string; bg: string; color: string }> = {
  pendente:   { label: 'Aguardando Autorização', bg: 'var(--warnWash)',    color: 'var(--warn)'    },
  autorizado: { label: 'Autorizado',             bg: 'var(--successWash)', color: 'var(--success)' },
  devolvido:  { label: 'Devolvido',              bg: 'var(--dangerWash)',  color: 'var(--danger)'  },
}

function SectionHeader({
  supTitle, title, subtitle, action,
}: {
  supTitle: string; title: string; subtitle?: string; action?: React.ReactNode
}) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
      <div>
        <p className="text-xs font-semibold uppercase tracking-widest mb-1.5" style={{ color: 'var(--accent)' }}>
          {supTitle}
        </p>
        <h1
          className="text-3xl font-bold leading-tight"
          style={{ color: 'var(--ink)', fontFamily: 'var(--font-heading)' }}
        >
          {title}
        </h1>
        {subtitle && (
          <p className="text-[15px] mt-1.5" style={{ color: 'var(--muted)' }}>{subtitle}</p>
        )}
      </div>
      {action}
    </div>
  )
}

function ListCard({
  title, subtitle, action, children,
}: {
  title: string; subtitle?: string; action?: React.ReactNode; children: React.ReactNode
}) {
  return (
    <div
      className="rounded-[var(--r-lg)] border overflow-hidden"
      style={{ background: 'var(--surface)', borderColor: 'var(--hairline)', boxShadow: '0 1px 4px rgba(0,0,0,0.04)' }}
    >
      <div
        className="flex flex-row items-center justify-between px-6 py-5 border-b"
        style={{ background: 'var(--surfaceAlt)', borderColor: 'var(--hairline)' }}
      >
        <div>
          <h2 className="text-lg font-semibold" style={{ color: 'var(--ink)', fontFamily: 'var(--font-heading)' }}>
            {title}
          </h2>
          {subtitle && <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>{subtitle}</p>}
        </div>
        {action}
      </div>
      {children}
    </div>
  )
}

function EmptyState({ icon: Icon, title, body, cta }: {
  icon: React.ElementType; title: string; body: string; cta?: React.ReactNode
}) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center px-6">
      <div
        className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4"
        style={{ background: 'var(--primaryWash)' }}
      >
        <Icon className="w-6 h-6" style={{ color: 'var(--primary)' }} />
      </div>
      <p className="text-[15px] font-semibold mb-1.5" style={{ color: 'var(--ink)', fontFamily: 'var(--font-heading)' }}>
        {title}
      </p>
      <p className="text-sm max-w-sm leading-relaxed" style={{ color: 'var(--muted)' }}>{body}</p>
      {cta && <div className="mt-6">{cta}</div>}
    </div>
  )
}

function ProcessoRow({ p, href }: { p: any; href: string }) {
  const modalidade = MODALIDADE_LABEL[p.modalidade] ?? p.modalidade
  const status = (p.status as StatusProcesso) ?? 'rascunho'

  return (
    <Link
      href={href}
      className="flex items-center gap-4 px-6 py-5 transition-colors group"
      style={{ borderBottom: '1px solid var(--hairline)' }}
      onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surfaceAlt)' }}
      onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
    >
      <div
        className="w-10 h-10 rounded-[var(--r-md)] flex items-center justify-center shrink-0"
        style={{ background: 'var(--primaryWash)' }}
      >
        <FileText className="w-[18px] h-[18px]" style={{ color: 'var(--primary)' }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-[15px] font-semibold truncate" style={{ color: 'var(--ink)' }}>
          {p.numero_processo ? `${p.numero_processo} — ` : ''}{p.objeto}
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
          {p.created_at && (
            <>
              <span style={{ color: 'var(--hairline)' }}>|</span>
              <span className="text-sm" style={{ color: 'var(--mutedSoft)' }}>
                {tempoRelativo(p.created_at)}
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
  )
}

function BadgePill({ label, bg, color }: { label: string; bg: string; color: string }) {
  return (
    <span
      className="text-xs font-medium px-2.5 py-1 rounded-[var(--r-pill)] hidden sm:inline"
      style={{ background: bg, color }}
    >
      {label}
    </span>
  )
}

function SaldoBaixoAlert({ saldo }: { saldo: number }) {
  return (
    <div
      className="flex items-start gap-3 p-4 rounded-[var(--r-md)] text-sm border"
      style={{ background: 'var(--warnWash)', borderColor: 'var(--warn)' + '40' }}
    >
      <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--warn)' }} />
      <div>
        <p className="font-semibold text-[15px]" style={{ color: 'var(--warn)' }}>Saldo de créditos baixo</p>
        <p className="text-sm mt-0.5" style={{ color: 'var(--inkSoft)' }}>
          Você tem apenas {saldo} crédito{saldo !== 1 ? 's' : ''} restante{saldo !== 1 ? 's' : ''}. As funcionalidades de IA ficam indisponíveis com saldo zerado.
        </p>
      </div>
    </div>
  )
}

function tempoRelativo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const dias = Math.floor(diff / 86400000)
  if (dias === 0) return 'Hoje'
  if (dias === 1) return 'Ontem'
  if (dias < 30) return `há ${dias} dias`
  const meses = Math.floor(dias / 30)
  return `há ${meses} ${meses === 1 ? 'mês' : 'meses'}`
}

function formatarMoeda(valor: number): string {
  if (valor >= 1_000_000) return `R$ ${(valor / 1_000_000).toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} M`
  if (valor >= 1_000) return `R$ ${(valor / 1_000).toLocaleString('pt-BR', { minimumFractionDigits: 0, maximumFractionDigits: 0 })} mil`
  return `R$ ${valor.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
}

function NewButton({ label, href }: { label: string; href: string }) {
  return (
    <Link href={href}>
      <Button
        className="text-white h-9 px-5 text-sm font-semibold gap-2 rounded-[var(--r-md)]"
        style={{ background: 'var(--primary)' }}
      >
        <PlusCircle className="w-4 h-4" />
        {label}
      </Button>
    </Link>
  )
}

// ─── View: Requisitante ───────────────────────────────────────────────────────

async function DashboardRequisitante({
  userId, org, saldo, primeiroNome, saudacao,
}: {
  userId: string; org: any; saldo: number; primeiroNome: string; saudacao: string
}) {
  const supabase = await createClient()
  const { data: meusProcessos } = await supabase
    .from('processos_licitatorios')
    .select('id, objeto, modalidade, status, numero_processo, valor_estimado, created_at')
    .eq('criado_por', userId)
    .order('created_at', { ascending: false })

  const processos = (meusProcessos as any[] | null) ?? []
  const emAndamento = processos.filter((p: any) => p.status === 'rascunho' || p.status === 'em_revisao').length
  const concluidos  = processos.filter((p: any) => p.status === 'publicado' || p.status === 'assinado').length

  const orgSub = org ? `${org.nome} · ${org.municipio} / ${org.estado}` : undefined

  return (
    <div className="space-y-8">
      <SectionHeader
        supTitle="Minhas Demandas"
        title={`${saudacao}, ${primeiroNome}.`}
        subtitle={orgSub}
        action={<NewButton label="Nova Demanda" href="/processos/novo" />}
      />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-5">
        <KPICard label="Minhas Demandas" value={processos.length} sub="Total criadas"           icon={<FileText className="w-5 h-5" />} />
        <KPICard label="Em Elaboração"   value={emAndamento}      sub="Em andamento"             icon={<Clock className="w-5 h-5" />}    accent />
        <KPICard label="Concluídas"      value={concluidos}       sub="Publicadas ou assinadas"  icon={<CheckCircle className="w-5 h-5" />} />
      </div>

      <ListCard
        title="Meus Processos"
        subtitle="Processos licitatórios que você criou"
        action={
          processos.length > 0 ? (
            <Link href="/processos/novo">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8" style={{ borderColor: 'var(--hairline)', color: 'var(--primary)' }}>
                <PlusCircle className="w-3.5 h-3.5" /> Novo
              </Button>
            </Link>
          ) : undefined
        }
      >
        {processos.length === 0 ? (
          <EmptyState
            icon={Gavel}
            title="Nenhuma demanda ainda"
            body='Clique em "Nova Demanda" para iniciar a formalização de uma necessidade de contratação.'
            cta={<NewButton label="Criar primeira demanda" href="/processos/novo" />}
          />
        ) : (
          <div>{processos.map((p: any) => <ProcessoRow key={p.id} p={p} href={`/processos/${p.id}/dfd`} />)}</div>
        )}
      </ListCard>

      {saldo < 10 && <SaldoBaixoAlert saldo={saldo} />}
    </div>
  )
}

// ─── View: Setor de Licitacoes ────────────────────────────────────────────────

async function DashboardSetorLicitacao({
  org, saldo, primeiroNome, saudacao, organizacaoId,
}: {
  org: any; saldo: number; primeiroNome: string; saudacao: string; organizacaoId: string
}) {
  const supabase = await createClient()

  const { data: todosProcessos } = await supabase
    .from('processos_licitatorios')
    .select('id, objeto, modalidade, status, numero_processo, valor_estimado, created_at, cotacao_pendente')
    .eq('organizacao_id', organizacaoId)
    .order('created_at', { ascending: false })

  const { data: avisosAbertosData } = await (supabase as any)
    .from('avisos_compra_conjunta')
    .select('id')
    .eq('organizacao_id', organizacaoId)
    .eq('status', 'aberto')

  const totalAvisosAbertos = (avisosAbertosData as any[] | null ?? []).length
  const processos = (todosProcessos as any[] | null) ?? []
  const ativos    = processos.filter((p: any) => p.status === 'rascunho' || p.status === 'em_revisao')
  const arquivo   = processos.filter((p: any) => p.status === 'publicado' || p.status === 'assinado')
  const emRevisao = processos.filter((p: any) => p.status === 'em_revisao').length
  const orgSub    = org ? `${org.nome} · ${org.municipio} / ${org.estado}` : undefined

  const valorTotalAtivo = ativos.reduce((s: number, p: any) => s + (Number(p.valor_estimado) || 0), 0)
  const cotacaoPendente = processos.filter((p: any) => p.cotacao_pendente && (p.status === 'rascunho' || p.status === 'em_revisao'))

  return (
    <div className="space-y-8">
      <SectionHeader
        supTitle="Setor de Licitações"
        title={`${saudacao}, ${primeiroNome}.`}
        subtitle={orgSub}
        action={<NewButton label="Novo Processo" href="/processos/novo" />}
      />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-5">
        {totalAvisosAbertos > 0 && (
          <Link href="/processos/aviso-compra-conjunta/novo" className="col-span-2 lg:col-span-5">
            <div
              className="flex items-center gap-3 p-4 rounded-[var(--r-md)] border cursor-pointer transition-opacity hover:opacity-80"
              style={{ background: 'var(--warnWash)', borderColor: 'var(--warn)' + '40' }}
            >
              <div className="w-9 h-9 rounded-[var(--r-sm)] flex items-center justify-center shrink-0" style={{ background: 'var(--warn)' + '20' }}>
                <Share2 className="w-4 h-4" style={{ color: 'var(--warn)' }} />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold" style={{ color: 'var(--warn)' }}>
                  {totalAvisosAbertos} aviso{totalAvisosAbertos !== 1 ? 's' : ''} de compra conjunta aberto{totalAvisosAbertos !== 1 ? 's' : ''}
                </p>
                <p className="text-xs" style={{ color: 'var(--muted)' }}>Clique para criar ou gerenciar avisos</p>
              </div>
              <ArrowRight className="w-4 h-4 shrink-0" style={{ color: 'var(--warn)' }} />
            </div>
          </Link>
        )}
        {cotacaoPendente.length > 0 && (
          <div className="col-span-2 lg:col-span-5 flex items-center gap-3 p-4 rounded-[var(--r-md)] border"
            style={{ background: 'var(--primaryWash)', borderColor: 'var(--primary)' + '40' }}
          >
            <div className="w-9 h-9 rounded-[var(--r-sm)] flex items-center justify-center shrink-0" style={{ background: 'var(--primary)' + '20' }}>
              <AlertCircle className="w-4 h-4" style={{ color: 'var(--primary)' }} />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold" style={{ color: 'var(--primary)' }}>
                {cotacaoPendente.length} processo{cotacaoPendente.length !== 1 ? 's' : ''} com cotação de preços pendente
              </p>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>
                A pesquisa de preços é obrigatória antes da elaboração do ETP (Art. 23, Lei 14.133/21)
              </p>
            </div>
          </div>
        )}
        <KPICard label="Processos"          value={processos.length}    sub="Total na organização"   icon={<FileText className="w-5 h-5" />} />
        <KPICard label="Em Elaboração"      value={ativos.length}       sub="Em andamento"            icon={<Clock className="w-5 h-5" />}    accent />
        <KPICard label="Em Revisão"         value={emRevisao}           sub="Aguardando análise"      icon={<Filter className="w-5 h-5" />} />
        <KPICard label="Publicados"         value={arquivo.length}      sub="Concluídos"              icon={<CheckCircle className="w-5 h-5" />} />
        <KPICard label="Valor em Elaboração" value={valorTotalAtivo > 0 ? formatarMoeda(valorTotalAtivo) : '—'} sub="Soma dos processos ativos" icon={<FileText className="w-5 h-5" />} />
      </div>

      <ListCard
        title="Em Andamento"
        subtitle="Processos em elaboração ou revisão"
        action={
          processos.length > 0 ? (
            <Link href="/processos/novo">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8" style={{ borderColor: 'var(--hairline)', color: 'var(--primary)' }}>
                <PlusCircle className="w-3.5 h-3.5" /> Novo
              </Button>
            </Link>
          ) : undefined
        }
      >
        {ativos.length === 0 ? (
          <EmptyState icon={Gavel} title="Nenhum processo em andamento" body="Todos os processos foram concluídos ou nenhum foi iniciado ainda." />
        ) : (
          <div>{ativos.map((p: any) => <ProcessoRow key={p.id} p={p} href={`/processos/${p.id}/dfd`} />)}</div>
        )}
      </ListCard>

      {arquivo.length > 0 && (
        <ListCard title="Arquivo" subtitle="Processos publicados ou concluídos">
          <div>{arquivo.map((p: any) => <ProcessoRow key={p.id} p={p} href={`/processos/${p.id}/publicacao`} />)}</div>
        </ListCard>
      )}

      {saldo < 10 && <SaldoBaixoAlert saldo={saldo} />}
    </div>
  )
}

// ─── View: Procurador ─────────────────────────────────────────────────────────

async function DashboardProcurador({
  org, primeiroNome, saudacao, organizacaoId,
}: {
  org: any; primeiroNome: string; saudacao: string; organizacaoId: string
}) {
  const supabase = await createClient()

  const { data: pareceres } = await (supabase as any)
    .from('pareceres')
    .select('id, status, processo_id, created_at')
    .eq('organizacao_id', organizacaoId)
    .order('created_at', { ascending: false })

  const pareceresList = (pareceres as any[] | null) ?? []
  const processoIds = pareceresList.map((p: any) => p.processo_id)
  let processosMap: Record<string, any> = {}
  if (processoIds.length > 0) {
    const { data: procs } = await supabase
      .from('processos_licitatorios')
      .select('id, objeto, modalidade, status, numero_processo, valor_estimado')
      .in('id', processoIds)
    ;(procs ?? []).forEach((p: any) => { processosMap[p.id] = p })
  }

  const fila     = pareceresList.filter((p: any) => p.status === 'pendente' || p.status === 'devolvido')
  const historico = pareceresList.filter((p: any) => p.status === 'aprovado' || p.status === 'aprovado_com_ressalvas')
  const orgSub   = org ? `${org.nome} · ${org.municipio} / ${org.estado}` : undefined

  return (
    <div className="space-y-8">
      <SectionHeader supTitle="Procuradoria" title={`${saudacao}, ${primeiroNome}.`} subtitle={orgSub} />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-5">
        <KPICard label="Fila de Pareceres" value={fila.length}          sub="Aguardando análise jurídica" icon={<Scale className="w-5 h-5" />}       accent />
        <KPICard label="Aprovados"         value={historico.length}     sub="Pareceres favoráveis"        icon={<CheckCircle2 className="w-5 h-5" />} />
        <KPICard label="Total"             value={pareceresList.length} sub="Processos avaliados"         icon={<Gavel className="w-5 h-5" />}        />
      </div>

      <ListCard
        title="Fila de Pareceres"
        subtitle="Processos aguardando análise jurídica (Art. 53, Lei 14.133/21)"
      >
        {fila.length === 0 ? (
          <EmptyState icon={Scale} title="Nenhum processo aguardando" body="Quando um processo for encaminhado para a procuradoria, ele aparecerá aqui." />
        ) : (
          <div>
            {fila.map((par: any) => {
              const proc = processosMap[par.processo_id]
              if (!proc) return null
              const cfg = PARECER_STATUS_CONFIG[par.status] ?? PARECER_STATUS_CONFIG['pendente']
              return (
                <Link
                  key={par.id}
                  href={`/processos/${par.processo_id}/parecer`}
                  className="flex items-center gap-4 px-6 py-4 transition-colors"
                  style={{ borderBottom: '1px solid var(--hairline)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surfaceAlt)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                >
                  <div className="w-9 h-9 rounded-[var(--r-md)] flex items-center justify-center shrink-0" style={{ background: 'var(--accentWash)' }}>
                    <Scale className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-semibold truncate" style={{ color: 'var(--ink)' }}>
                      {proc.numero_processo ? `${proc.numero_processo} — ` : ''}{proc.objeto}
                    </p>
                    <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>{MODALIDADE_LABEL[proc.modalidade] ?? proc.modalidade}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <BadgePill label={cfg.label} bg={cfg.bg} color={cfg.color} />
                    <ArrowRight className="w-4 h-4" style={{ color: 'var(--mutedSoft)' }} />
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </ListCard>

      {historico.length > 0 && (
        <ListCard title="Histórico de Pareceres" subtitle="Pareceres já emitidos pela procuradoria">
          <div>
            {historico.map((par: any) => {
              const proc = processosMap[par.processo_id]
              if (!proc) return null
              const cfg = PARECER_STATUS_CONFIG[par.status]
              return (
                <Link
                  key={par.id}
                  href={`/processos/${par.processo_id}/parecer`}
                  className="flex items-center gap-4 px-6 py-4 transition-colors"
                  style={{ borderBottom: '1px solid var(--hairline)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surfaceAlt)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                >
                  <div className="w-9 h-9 rounded-[var(--r-md)] flex items-center justify-center shrink-0" style={{ background: 'var(--successWash)' }}>
                    <CheckCircle2 className="w-4 h-4" style={{ color: 'var(--success)' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-semibold truncate" style={{ color: 'var(--ink)' }}>
                      {proc.numero_processo ? `${proc.numero_processo} — ` : ''}{proc.objeto}
                    </p>
                    <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>{MODALIDADE_LABEL[proc.modalidade] ?? proc.modalidade}</p>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {cfg && <BadgePill label={cfg.label} bg={cfg.bg} color={cfg.color} />}
                    <ArrowRight className="w-4 h-4" style={{ color: 'var(--mutedSoft)' }} />
                  </div>
                </Link>
              )
            })}
          </div>
        </ListCard>
      )}
    </div>
  )
}

// ─── View: Autoridade Competente ──────────────────────────────────────────────

async function DashboardAutoridadeCompetente({
  org, primeiroNome, saudacao, organizacaoId,
}: {
  org: any; primeiroNome: string; saudacao: string; organizacaoId: string
}) {
  const supabase = await createClient()

  const { data: autorizacoes } = await (supabase as any)
    .from('autorizacoes')
    .select('id, status, processo_id, autorizado_em, created_at')
    .eq('organizacao_id', organizacaoId)
    .order('created_at', { ascending: false })

  const autorizacoesList = (autorizacoes as any[] | null) ?? []
  const processoIds = autorizacoesList.map((a: any) => a.processo_id)
  let processosMap: Record<string, any> = {}
  if (processoIds.length > 0) {
    const { data: procs } = await supabase
      .from('processos_licitatorios')
      .select('id, objeto, modalidade, status, numero_processo, valor_estimado')
      .in('id', processoIds)
    ;(procs ?? []).forEach((p: any) => { processosMap[p.id] = p })
  }

  const pendentes   = autorizacoesList.filter((a: any) => a.status === 'pendente' || a.status === 'devolvido')
  const autorizados = autorizacoesList.filter((a: any) => a.status === 'autorizado')
  const orgSub      = org ? `${org.nome} · ${org.municipio} / ${org.estado}` : undefined

  function AutRow({ aut, icon: Icon, iconBg, iconColor }: { aut: any; icon: React.ElementType; iconBg: string; iconColor: string }) {
    const proc = processosMap[aut.processo_id]
    if (!proc) return null
    const cfg = AUTORIZACAO_STATUS[aut.status] ?? AUTORIZACAO_STATUS['pendente']
    return (
      <Link
        href={`/processos/${aut.processo_id}/autorizacao`}
        className="flex items-center gap-4 px-6 py-4 transition-colors"
        style={{ borderBottom: '1px solid var(--hairline)' }}
        onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surfaceAlt)' }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
      >
        <div className="w-9 h-9 rounded-[var(--r-md)] flex items-center justify-center shrink-0" style={{ background: iconBg }}>
          <Icon className="w-4 h-4" style={{ color: iconColor }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[15px] font-semibold truncate" style={{ color: 'var(--ink)' }}>
            {proc.numero_processo ? `${proc.numero_processo} — ` : ''}{proc.objeto}
          </p>
          <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>{MODALIDADE_LABEL[proc.modalidade] ?? proc.modalidade}</p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <BadgePill label={cfg.label} bg={cfg.bg} color={cfg.color} />
          <ArrowRight className="w-4 h-4" style={{ color: 'var(--mutedSoft)' }} />
        </div>
      </Link>
    )
  }

  return (
    <div className="space-y-8">
      <SectionHeader supTitle="Autoridade Competente" title={`${saudacao}, ${primeiroNome}.`} subtitle={orgSub} />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-5">
        <KPICard label="Aguardando"  value={pendentes.length}        sub="Processos para autorizar" icon={<Clock className="w-5 h-5" />}      accent />
        <KPICard label="Autorizados" value={autorizados.length}      sub="Processos autorizados"    icon={<ShieldCheck className="w-5 h-5" />} />
        <KPICard label="Total"       value={autorizacoesList.length} sub="Processos avaliados"      icon={<FileText className="w-5 h-5" />}    />
      </div>

      <ListCard
        title="Aguardando Autorização"
        subtitle="Processos com parecer favorável, aguardando sua decisão (Art. 72, Lei 14.133/21)"
      >
        {pendentes.length === 0 ? (
          <EmptyState
            icon={ShieldCheck}
            title="Nenhum processo aguardando"
            body="Quando um processo receber parecer favorável, ele aparecerá aqui para sua autorização."
          />
        ) : (
          <div>
            {pendentes.map((aut: any) => (
              <AutRow key={aut.id} aut={aut} icon={ShieldCheck} iconBg="var(--primaryWash)" iconColor="var(--primary)" />
            ))}
          </div>
        )}
      </ListCard>

      {autorizados.length > 0 && (
        <ListCard title="Histórico de Autorizações" subtitle="Processos já autorizados pela autoridade competente">
          <div>
            {autorizados.map((aut: any) => (
              <AutRow key={aut.id} aut={aut} icon={ShieldCheck} iconBg="var(--successWash)" iconColor="var(--success)" />
            ))}
          </div>
        </ListCard>
      )}
    </div>
  )
}

// ─── View: Admin ──────────────────────────────────────────────────────────────

async function DashboardAdmin({
  org, saldo, primeiroNome, saudacao, organizacaoId,
}: {
  org: any; saldo: number; primeiroNome: string; saudacao: string; organizacaoId: string
}) {
  const supabase = await createClient()

  const { data: todosProcessos } = await supabase
    .from('processos_licitatorios')
    .select('id, objeto, modalidade, status, numero_processo, valor_estimado, created_at')
    .eq('organizacao_id', organizacaoId)
    .order('created_at', { ascending: false })

  const processos   = (todosProcessos as any[] | null) ?? []
  const emAndamento = processos.filter((p: any) => p.status === 'rascunho' || p.status === 'em_revisao').length
  const publicados  = processos.filter((p: any) => p.status === 'publicado').length
  const arquivo     = processos.filter((p: any) => p.status === 'publicado' || p.status === 'assinado')
  const orgSub      = org ? `${org.nome} · ${org.municipio} / ${org.estado}` : undefined

  const ativos = processos.filter((p: any) => p.status === 'rascunho' || p.status === 'em_revisao')
  const valorTotalAtivo = ativos.reduce((s: number, p: any) => s + (Number(p.valor_estimado) || 0), 0)

  const dataInicio30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const { count: acoesIA30d } = await (supabase as any)
    .from('acoes_ia')
    .select('id', { count: 'exact', head: true })
    .eq('organizacao_id', organizacaoId)
    .gte('created_at', dataInicio30d)

  return (
    <div className="space-y-8">
      <SectionHeader
        supTitle="Painel de Controle"
        title={`${saudacao}, ${primeiroNome}.`}
        subtitle={orgSub}
        action={<NewButton label="Novo Processo" href="/processos/novo" />}
      />

      <div className="grid grid-cols-2 lg:grid-cols-5 gap-5">
        <KPICard label="Processos"     value={processos.length} sub="Total criados"             icon={<FileText className="w-5 h-5" />} />
        <KPICard label="Em Elaboração" value={emAndamento}      sub="Em andamento"               icon={<Clock className="w-5 h-5" />}    accent />
        <KPICard label="Publicados"    value={publicados}       sub={`de ${arquivo.length} concluídos`} icon={<CheckCircle className="w-5 h-5" />} />
        <KPICard label="Créditos IA"   value={saldo}            sub={`${acoesIA30d ?? 0} ações nos últimos 30 dias`} icon={<Zap className="w-5 h-5" />} />
        <KPICard label="Valor em Elaboração" value={valorTotalAtivo > 0 ? formatarMoeda(valorTotalAtivo) : '—'} sub="Soma dos processos ativos" icon={<FileText className="w-5 h-5" />} />
      </div>

      <ListCard
        title="Processos Licitatórios"
        subtitle="Todos os processos da organização"
        action={
          processos.length > 0 ? (
            <Link href="/processos/novo">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8" style={{ borderColor: 'var(--hairline)', color: 'var(--primary)' }}>
                <PlusCircle className="w-3.5 h-3.5" /> Novo
              </Button>
            </Link>
          ) : undefined
        }
      >
        {processos.length === 0 ? (
          <EmptyState
            icon={Gavel}
            title="Nenhum processo ainda"
            body='Clique em "Novo Processo" para iniciar a elaboração do primeiro processo licitatório.'
            cta={<NewButton label="Criar primeiro processo" href="/processos/novo" />}
          />
        ) : (
          <div>{processos.map((p: any) => <ProcessoRow key={p.id} p={p} href={`/processos/${p.id}/dfd`} />)}</div>
        )}
      </ListCard>

      {saldo < 10 && <SaldoBaixoAlert saldo={saldo} />}
    </div>
  )
}

// ─── View: Setor de Compras ───────────────────────────────────────────────────

async function DashboardSetorCompras({
  org, saldo, primeiroNome, saudacao, organizacaoId,
}: {
  org: any; saldo: number; primeiroNome: string; saudacao: string; organizacaoId: string
}) {
  const supabase = await createClient()

  const { data: naFila } = await supabase
    .from('processos_licitatorios')
    .select('id, objeto, modalidade, status, numero_processo, valor_estimado, created_at')
    .eq('organizacao_id', organizacaoId)
    .eq('fase_atual', 'setor_compras')
    .order('created_at', { ascending: false })

  const { data: recentes } = await supabase
    .from('processos_licitatorios')
    .select('id, objeto, modalidade, status, numero_processo, valor_estimado, created_at')
    .eq('organizacao_id', organizacaoId)
    .neq('fase_atual', 'setor_compras')
    .eq('cotacao_pendente', false)
    .order('created_at', { ascending: false })
    .limit(10)

  const fila     = (naFila as any[] | null) ?? []
  const passados = (recentes as any[] | null) ?? []
  const orgSub   = org ? `${org.nome} · ${org.municipio} / ${org.estado}` : undefined

  return (
    <div className="space-y-8">
      <SectionHeader
        supTitle="Setor de Compras"
        title={`${saudacao}, ${primeiroNome}.`}
        subtitle={orgSub}
      />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-5">
        <KPICard label="Na Fila"        value={fila.length}     sub="Aguardando pesquisa de precos" icon={<Clock className="w-5 h-5" />}    accent />
        <KPICard label="Cotacoes Feitas" value={passados.length} sub="Processos encaminhados"        icon={<CheckCircle className="w-5 h-5" />} />
        <KPICard label="Creditos IA"    value={saldo}           sub="Saldo disponivel"               icon={<Zap className="w-5 h-5" />} />
      </div>

      {fila.length > 0 && (
        <div
          className="flex items-start gap-3 p-4 rounded-[var(--r-md)] border text-sm"
          style={{ background: 'var(--primaryWash)', borderColor: 'var(--primary)' + '40' }}
        >
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: 'var(--primary)' }} />
          <p style={{ color: 'var(--primary)' }}>
            A pesquisa de precos e obrigatoria antes da elaboracao do ETP, conforme Art. 23 da Lei 14.133/21.
          </p>
        </div>
      )}

      <ListCard
        title="Aguardando Pesquisa de Precos"
        subtitle="Processos encaminhados ao setor para cotacao (Art. 23, Lei 14.133/21)"
      >
        {fila.length === 0 ? (
          <EmptyState
            icon={Filter}
            title="Nenhum processo aguardando"
            body="Quando um processo chegar para pesquisa de precos, ele aparecera aqui."
          />
        ) : (
          <div>{fila.map((p: any) => <ProcessoRow key={p.id} p={p} href={`/processos/${p.id}/cotacao`} />)}</div>
        )}
      </ListCard>

      {passados.length > 0 && (
        <ListCard title="Processados Recentemente" subtitle="Processos com cotacao concluida e encaminhados">
          <div>{passados.map((p: any) => <ProcessoRow key={p.id} p={p} href={`/processos/${p.id}/cotacao`} />)}</div>
        </ListCard>
      )}

      {saldo < 10 && <SaldoBaixoAlert saldo={saldo} />}
    </div>
  )
}

// ─── View: Publicacao ─────────────────────────────────────────────────────────

async function DashboardPublicacao({
  org, primeiroNome, saudacao, organizacaoId,
}: {
  org: any; primeiroNome: string; saudacao: string; organizacaoId: string
}) {
  const supabase = await createClient()

  const { data: pendentes } = await supabase
    .from('processos_licitatorios')
    .select('id, objeto, modalidade, status, numero_processo, valor_estimado, created_at')
    .eq('organizacao_id', organizacaoId)
    .eq('fase_atual', 'publicacao')
    .order('created_at', { ascending: false })

  const { data: publicados } = await (supabase as any)
    .from('publicacoes')
    .select('id, processo_id, data_publicacao, pncp_numero, pncp_url, status, created_at')
    .eq('organizacao_id', organizacaoId)
    .order('data_publicacao', { ascending: false })
    .limit(20)

  const publicadosList = (publicados as any[] | null) ?? []
  const processoIds = publicadosList.map((pub: any) => pub.processo_id)
  let publicadosMap: Record<string, any> = {}
  if (processoIds.length > 0) {
    const { data: procs } = await supabase
      .from('processos_licitatorios')
      .select('id, objeto, modalidade, numero_processo, valor_estimado')
      .in('id', processoIds)
    ;(procs ?? []).forEach((p: any) => { publicadosMap[p.id] = p })
  }

  const fila   = (pendentes as any[] | null) ?? []
  const orgSub = org ? `${org.nome} · ${org.municipio} / ${org.estado}` : undefined

  return (
    <div className="space-y-8">
      <SectionHeader
        supTitle="Setor de Publicacao"
        title={`${saudacao}, ${primeiroNome}.`}
        subtitle={orgSub}
      />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-5">
        <KPICard label="Aguardando Publicacao" value={fila.length}           sub="Autorizados, pendentes de publicar" icon={<Send className="w-5 h-5" />}       accent />
        <KPICard label="Publicados"            value={publicadosList.length} sub="Registros de publicacao"            icon={<Globe className="w-5 h-5" />}       />
        <KPICard label="Total no PNCP"         value={publicadosList.filter((p: any) => p.pncp_numero).length} sub="Com numero PNCP registrado" icon={<CheckCircle className="w-5 h-5" />} />
      </div>

      <ListCard
        title="Aguardando Publicacao"
        subtitle="Processos autorizados pela autoridade competente (Art. 54, Lei 14.133/21)"
      >
        {fila.length === 0 ? (
          <EmptyState
            icon={Send}
            title="Nenhum processo aguardando"
            body="Quando um processo for autorizado e encaminhado para publicacao, ele aparecera aqui."
          />
        ) : (
          <div>{fila.map((p: any) => <ProcessoRow key={p.id} p={p} href={`/processos/${p.id}/publicacao`} />)}</div>
        )}
      </ListCard>

      {publicadosList.length > 0 && (
        <ListCard title="Historico de Publicacoes" subtitle="Publicacoes registradas no sistema">
          <div>
            {publicadosList.map((pub: any) => {
              const proc = publicadosMap[pub.processo_id]
              if (!proc) return null
              return (
                <Link
                  key={pub.id}
                  href={`/processos/${pub.processo_id}/publicacao`}
                  className="flex items-center gap-4 px-6 py-4 transition-colors"
                  style={{ borderBottom: '1px solid var(--hairline)' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'var(--surfaceAlt)' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                >
                  <div className="w-9 h-9 rounded-[var(--r-md)] flex items-center justify-center shrink-0" style={{ background: 'var(--successWash)' }}>
                    <Globe className="w-4 h-4" style={{ color: 'var(--success)' }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[15px] font-semibold truncate" style={{ color: 'var(--ink)' }}>
                      {proc.numero_processo ? `${proc.numero_processo} — ` : ''}{proc.objeto}
                    </p>
                    <div className="flex items-center gap-2.5 mt-0.5 flex-wrap">
                      <span className="text-sm" style={{ color: 'var(--muted)' }}>
                        {MODALIDADE_LABEL[proc.modalidade] ?? proc.modalidade}
                      </span>
                      {pub.pncp_numero && (
                        <>
                          <span style={{ color: 'var(--hairline)' }}>|</span>
                          <span className="text-sm font-medium" style={{ color: 'var(--inkSoft)' }}>PNCP {pub.pncp_numero}</span>
                        </>
                      )}
                      <span style={{ color: 'var(--hairline)' }}>|</span>
                      <span className="text-sm" style={{ color: 'var(--mutedSoft)' }}>
                        {new Date(pub.data_publicacao).toLocaleDateString('pt-BR')}
                      </span>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 shrink-0" style={{ color: 'var(--mutedSoft)' }} />
                </Link>
              )
            })}
          </div>
        </ListCard>
      )}
    </div>
  )
}

// ─── View: Admin Plataforma ───────────────────────────────────────────────────

async function DashboardAdminPlataforma({
  primeiroNome, saudacao,
}: {
  primeiroNome: string; saudacao: string
}) {
  const service = await createServiceClient()
  const supabase = await createClient()

  const dataInicio30d = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const [
    { count: totalOrgs },
    { count: totalProcessos },
    { count: totalUsuarios },
    { count: acoesIA30d },
    { data: orgsRecentes },
  ] = await Promise.all([
    (service as any).from('organizacoes').select('id', { count: 'exact', head: true }),
    (service as any).from('processos_licitatorios').select('id', { count: 'exact', head: true }),
    (service as any).from('usuarios').select('id', { count: 'exact', head: true }),
    (service as any).from('acoes_ia').select('id', { count: 'exact', head: true }).gte('created_at', dataInicio30d),
    (service as any).from('organizacoes')
      .select('id, nome, municipio, estado, created_at')
      .order('created_at', { ascending: false })
      .limit(8),
  ])

  const orgs = (orgsRecentes as any[] | null) ?? []

  return (
    <div className="space-y-8">
      <SectionHeader
        supTitle="Administracao da Plataforma"
        title={`${saudacao}, ${primeiroNome}.`}
        subtitle="Visao geral da plataforma LicitaIA"
        action={
          <Link href="/admin/painel">
            <Button
              className="text-white h-9 px-5 text-sm font-semibold gap-2 rounded-[var(--r-md)]"
              style={{ background: 'var(--primary)' }}
            >
              <ShieldCheck className="w-4 h-4" />
              Painel Admin
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        <KPICard label="Organizacoes"    value={totalOrgs ?? 0}      sub="Prefeituras cadastradas"     icon={<Building2 className="w-5 h-5" />}     />
        <KPICard label="Processos"       value={totalProcessos ?? 0} sub="Em toda a plataforma"         icon={<FileText className="w-5 h-5" />}      accent />
        <KPICard label="Usuarios"        value={totalUsuarios ?? 0}  sub="Usuários ativos"              icon={<Users className="w-5 h-5" />}         />
        <KPICard label="Acoes de IA"     value={acoesIA30d ?? 0}     sub="Nos ultimos 30 dias"          icon={<Zap className="w-5 h-5" />}           />
      </div>

      <ListCard
        title="Organizacoes Recentes"
        subtitle="Ultimas prefeituras cadastradas na plataforma"
      >
        {orgs.length === 0 ? (
          <EmptyState icon={Building2} title="Nenhuma organizacao" body="Nenhuma prefeitura cadastrada ainda." />
        ) : (
          <div>
            {orgs.map((org: any) => (
              <div
                key={org.id}
                className="flex items-center gap-4 px-6 py-4"
                style={{ borderBottom: '1px solid var(--hairline)' }}
              >
                <div className="w-9 h-9 rounded-[var(--r-md)] flex items-center justify-center shrink-0" style={{ background: 'var(--primaryWash)' }}>
                  <Building2 className="w-4 h-4" style={{ color: 'var(--primary)' }} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-[15px] font-semibold truncate" style={{ color: 'var(--ink)' }}>{org.nome}</p>
                  <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>
                    {org.municipio && org.estado ? `${org.municipio} / ${org.estado}` : 'Localizacao nao informada'}
                  </p>
                </div>
                <span className="text-sm shrink-0" style={{ color: 'var(--mutedSoft)' }}>
                  {tempoRelativo(org.created_at)}
                </span>
              </div>
            ))}
          </div>
        )}
      </ListCard>
    </div>
  )
}

// ─── Page raiz ────────────────────────────────────────────────────────────────

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: usuarioData } = await supabase
    .from('usuarios')
    .select('nome_completo, organizacao_id, papel')
    .eq('id', user.id)
    .maybeSingle()

  const usuario      = usuarioData as { nome_completo: string; organizacao_id: string; papel: PapelUsuario } | null
  const organizacaoId = usuario?.organizacao_id
  if (!organizacaoId) redirect('/onboarding')

  const papel = usuario?.papel

  const [orgRes, creditosRes] = await Promise.all([
    supabase.from('organizacoes').select('nome, municipio, estado').eq('id', organizacaoId).maybeSingle(),
    (supabase as any).from('creditos_usuario').select('saldo').eq('usuario_id', user.id).maybeSingle(),
  ])

  const org   = orgRes.data as { nome: string; municipio: string; estado: string } | null
  const saldo = (creditosRes.data as any)?.saldo ?? 0

  const nomeUsuario   = usuario?.nome_completo || user.email || 'Gestor'
  const primeiroNome  = nomeUsuario.split(' ')[0]
  const hora          = new Date().getHours()
  const saudacao      = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite'

  const props = { org, saldo, primeiroNome, saudacao, organizacaoId }
  const propsBase = { primeiroNome, saudacao }

  if (papel === 'requisitante')    return <DashboardRequisitante userId={user.id} {...props} />
  if (papel === 'setor_compras')   return <DashboardSetorCompras {...props} />
  if (papel === 'setor_licitacao') return <DashboardSetorLicitacao {...props} />
  if (papel === 'procurador')      return <DashboardProcurador {...props} />
  if (papel === 'gestor_publico')  return <DashboardAutoridadeCompetente {...props} />
  if (papel === 'publicacao')      return <DashboardPublicacao org={org} {...propsBase} organizacaoId={organizacaoId} />
  if (papel === 'admin_plataforma') return <DashboardAdminPlataforma {...propsBase} />
  return <DashboardAdmin {...props} />
}
