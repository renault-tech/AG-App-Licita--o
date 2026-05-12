import { createClient } from '@/lib/supabase/server'
import {
  FileText, PlusCircle, Clock, CheckCircle, ArrowRight,
  AlertCircle, Gavel, Zap, Scale, ShieldCheck, Filter,
  Archive, CheckCircle2,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import type { PapelUsuario } from '@/types/database'

// ─── helpers compartilhados ───────────────────────────────────────────────────

const STATUS_CONFIG: Record<string, { label: string; bg: string; color: string; border: string }> = {
  rascunho:   { label: 'Rascunho',   bg: '#F4F3F7', color: '#43474E', border: '#E3E2E6' },
  em_revisao: { label: 'Em Revisao', bg: '#FFF8EC', color: '#7A5A1E', border: '#F0D9A8' },
  assinado:   { label: 'Assinado',   bg: '#EFF4FF', color: '#1A365D', border: '#C4D4F0' },
  publicado:  { label: 'Publicado',  bg: '#F0FAF4', color: '#1A6637', border: '#B3DFC5' },
}

const MODALIDADE_LABEL: Record<string, string> = {
  pregao_eletronico:   'Pregao Eletronico',
  pregao_presencial:   'Pregao Presencial',
  concorrencia:        'Concorrencia',
  concurso:            'Concurso',
  leilao:              'Leilao',
  dialogo_competitivo: 'Dialogo Competitivo',
  dispensa:            'Dispensa',
  inexigibilidade:     'Inexigibilidade',
}

const PARECER_STATUS_CONFIG: Record<string, { label: string; bg: string; color: string; border: string }> = {
  pendente:              { label: 'Aguardando Parecer', bg: '#FFF8EC', color: '#7A5A1E', border: '#F0D9A8'  },
  aprovado:              { label: 'Aprovado',           bg: '#F0FAF4', color: '#1A6637', border: '#B3DFC5'  },
  aprovado_com_ressalvas:{ label: 'Aprovado c/ Ressalvas', bg: '#EFF4FF', color: '#1A365D', border: '#C4D4F0' },
  devolvido:             { label: 'Devolvido',          bg: '#FFF0F0', color: '#BA1A1A', border: '#FFBBB5'  },
}

function StatusBadge({ status, config }: { status: string; config: typeof STATUS_CONFIG }) {
  const cfg = config[status] ?? config['rascunho']
  return (
    <span
      className="text-[11px] font-medium px-2 py-0.5 border shrink-0"
      style={{ backgroundColor: cfg.bg, color: cfg.color, borderColor: cfg.border, borderRadius: '2px' }}
    >
      {cfg.label}
    </span>
  )
}

function ProcessoRow({ p, href }: { p: any; href: string }) {
  const modalidade = MODALIDADE_LABEL[p.modalidade] ?? p.modalidade
  const statusCfg = STATUS_CONFIG[p.status] ?? STATUS_CONFIG['rascunho']

  return (
    <Link
      href={href}
      className="flex items-center gap-4 px-6 py-4 hover:bg-[#FAFAFA] transition-colors group"
    >
      <div
        className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
        style={{ backgroundColor: '#1A365D0D' }}
      >
        <FileText className="w-4 h-4" style={{ color: '#1A365D' }} />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-[#1A1C1E] truncate">
          {p.numero_processo ? `${p.numero_processo} - ` : ''}{p.objeto}
        </p>
        <div className="flex items-center gap-2 mt-0.5 flex-wrap">
          <span className="text-xs text-[#74777F]">{modalidade}</span>
          {p.valor_estimado > 0 && (
            <>
              <span className="text-[#C4C6CF]">|</span>
              <span className="text-xs text-[#43474E] font-medium">
                R$ {(p.valor_estimado as number).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </span>
            </>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3 shrink-0">
        <span
          className="text-[11px] font-medium px-2 py-0.5 border hidden sm:inline"
          style={{ backgroundColor: statusCfg.bg, color: statusCfg.color, borderColor: statusCfg.border, borderRadius: '2px' }}
        >
          {statusCfg.label}
        </span>
        <ArrowRight className="w-4 h-4" style={{ color: '#C4C6CF' }} />
      </div>
    </Link>
  )
}

function SectionKpi({ label, valor, sub, icon: Icon, color }: {
  label: string; valor: number | string; sub: string; icon: React.ElementType; color: string
}) {
  return (
    <div className="bg-white border border-[#E3E2E6] rounded-xl p-5 transition-shadow hover:shadow-[0_4px_12px_rgba(26,54,93,0.06)]">
      <div className="flex items-start justify-between mb-4">
        <p className="text-[10px] font-semibold uppercase tracking-widest" style={{ color: '#74777F' }}>{label}</p>
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: `${color}10` }}>
          <Icon className="w-4 h-4" style={{ color }} />
        </div>
      </div>
      <p className="text-3xl font-bold text-[#1A365D]" style={{ fontFamily: 'var(--font-heading)' }}>{valor}</p>
      <p className="text-xs text-[#74777F] mt-1">{sub}</p>
    </div>
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

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold text-[#B7935E] uppercase tracking-widest mb-1">Minhas Demandas</p>
          <h1 className="text-2xl font-bold text-[#1A365D]" style={{ fontFamily: 'var(--font-heading)' }}>
            {saudacao}, {primeiroNome}.
          </h1>
          {org && <p className="text-sm text-[#74777F] mt-1">{org.nome}&nbsp;&bull;&nbsp;{org.municipio} / {org.estado}</p>}
        </div>
        <Link href="/processos/novo">
          <Button
            className="text-white h-9 px-5 text-sm font-semibold gap-2 rounded-lg"
            style={{ backgroundColor: '#B7935E' }}
          >
            <PlusCircle className="w-4 h-4" />
            Nova Demanda
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <SectionKpi label="MINHAS DEMANDAS"  valor={processos.length} sub="Total criadas"   icon={FileText}     color="#1A365D" />
        <SectionKpi label="EM ELABORACAO"    valor={emAndamento}      sub="Em andamento"    icon={Clock}        color="#B7935E" />
        <SectionKpi label="CONCLUIDAS"       valor={concluidos}       sub="Publicadas ou assinadas" icon={CheckCircle} color="#1A6637" />
      </div>

      <Card className="border-[#E3E2E6] bg-white rounded-xl overflow-hidden" style={{ boxShadow: '0 1px 4px rgba(26,54,93,0.04)' }}>
        <CardHeader className="px-6 py-5 border-b border-[#E3E2E6] flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold text-[#1A365D]" style={{ fontFamily: 'var(--font-heading)' }}>
              Meus Processos
            </CardTitle>
            <CardDescription className="text-xs mt-0.5 text-[#74777F]">
              Processos licitatorios que voce criou
            </CardDescription>
          </div>
          {processos.length > 0 && (
            <Link href="/processos/novo">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8 border-[#E3E2E6] text-[#1A365D] hover:bg-[#F4F3F7]">
                <PlusCircle className="w-3.5 h-3.5" />
                Novo
              </Button>
            </Link>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {processos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-6">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5" style={{ backgroundColor: '#1A365D0D' }}>
                <Gavel className="w-7 h-7" style={{ color: '#1A365D' }} />
              </div>
              <h3 className="text-base font-semibold text-[#1A365D] mb-1" style={{ fontFamily: 'var(--font-heading)' }}>
                Nenhuma demanda ainda
              </h3>
              <p className="text-sm text-[#74777F] max-w-sm leading-relaxed">
                Clique em "Nova Demanda" para iniciar a formalizacao de uma necessidade de contratacao.
              </p>
              <Link href="/processos/novo" className="mt-6">
                <Button className="text-white gap-2 text-sm h-9 px-5 rounded-lg" style={{ backgroundColor: '#B7935E' }}>
                  <PlusCircle className="w-4 h-4" />
                  Criar primeira demanda
                </Button>
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-[#F4F3F7]">
              {processos.map((p: any) => (
                <ProcessoRow key={p.id} p={p} href={`/processos/${p.id}/dfd`} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {saldo < 10 && (
        <div className="flex items-start gap-3 p-4 rounded-xl text-sm border" style={{ backgroundColor: '#FFF8EC', borderColor: '#F0D9A8' }}>
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: '#B7935E' }} />
          <div>
            <p className="font-semibold text-[#7A5A1E]">Saldo de creditos baixo</p>
            <p className="text-[#9A7A4A] text-xs mt-0.5">
              Voce tem apenas {saldo} credito{saldo !== 1 ? 's' : ''} restante{saldo !== 1 ? 's' : ''}. As funcionalidades de IA ficam indisponiveis com saldo zerado.
            </p>
          </div>
        </div>
      )}
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
    .select('id, objeto, modalidade, status, numero_processo, valor_estimado, created_at')
    .eq('organizacao_id', organizacaoId)
    .order('created_at', { ascending: false })

  const processos = (todosProcessos as any[] | null) ?? []

  const ativos   = processos.filter((p: any) => p.status === 'rascunho' || p.status === 'em_revisao')
  const arquivo  = processos.filter((p: any) => p.status === 'publicado' || p.status === 'assinado')
  const emRevisao = processos.filter((p: any) => p.status === 'em_revisao').length

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold text-[#B7935E] uppercase tracking-widest mb-1">Setor de Licitacoes</p>
          <h1 className="text-2xl font-bold text-[#1A365D]" style={{ fontFamily: 'var(--font-heading)' }}>
            {saudacao}, {primeiroNome}.
          </h1>
          {org && <p className="text-sm text-[#74777F] mt-1">{org.nome}&nbsp;&bull;&nbsp;{org.municipio} / {org.estado}</p>}
        </div>
        <Link href="/processos/novo">
          <Button className="text-white h-9 px-5 text-sm font-semibold gap-2 rounded-lg" style={{ backgroundColor: '#B7935E' }}>
            <PlusCircle className="w-4 h-4" />
            Novo Processo
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SectionKpi label="PROCESSOS"      valor={processos.length} sub="Total na organizacao" icon={FileText}     color="#1A365D" />
        <SectionKpi label="EM ELABORACAO"  valor={ativos.length}    sub="Em andamento"         icon={Clock}        color="#B7935E" />
        <SectionKpi label="EM REVISAO"     valor={emRevisao}        sub="Aguardando analise"   icon={Filter}       color="#7A5A1E" />
        <SectionKpi label="PUBLICADOS"     valor={arquivo.length}   sub="Concluidos"           icon={CheckCircle}  color="#1A6637" />
      </div>

      {/* Processos em andamento */}
      <Card className="border-[#E3E2E6] bg-white rounded-xl overflow-hidden" style={{ boxShadow: '0 1px 4px rgba(26,54,93,0.04)' }}>
        <CardHeader className="px-6 py-5 border-b border-[#E3E2E6] flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold text-[#1A365D]" style={{ fontFamily: 'var(--font-heading)' }}>
              Em Andamento
            </CardTitle>
            <CardDescription className="text-xs mt-0.5 text-[#74777F]">
              Processos em elaboracao ou revisao
            </CardDescription>
          </div>
          {processos.length > 0 && (
            <Link href="/processos/novo">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8 border-[#E3E2E6] text-[#1A365D] hover:bg-[#F4F3F7]">
                <PlusCircle className="w-3.5 h-3.5" />
                Novo
              </Button>
            </Link>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {ativos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-center px-6">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ backgroundColor: '#1A365D0D' }}>
                <Gavel className="w-6 h-6" style={{ color: '#1A365D' }} />
              </div>
              <p className="text-sm font-semibold text-[#1A365D] mb-1">Nenhum processo em andamento</p>
              <p className="text-xs text-[#74777F] max-w-xs leading-relaxed">
                Todos os processos foram concluidos ou nenhum foi iniciado ainda.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#F4F3F7]">
              {ativos.map((p: any) => (
                <ProcessoRow key={p.id} p={p} href={`/processos/${p.id}/dfd`} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Arquivo */}
      {arquivo.length > 0 && (
        <Card className="border-[#E3E2E6] bg-white rounded-xl overflow-hidden" style={{ boxShadow: '0 1px 4px rgba(26,54,93,0.04)' }}>
          <CardHeader className="px-6 py-5 border-b border-[#E3E2E6]">
            <div className="flex items-center gap-2">
              <Archive className="w-4 h-4" style={{ color: '#74777F' }} />
              <div>
                <CardTitle className="text-base font-semibold text-[#1A365D]" style={{ fontFamily: 'var(--font-heading)' }}>
                  Arquivo
                </CardTitle>
                <CardDescription className="text-xs mt-0.5 text-[#74777F]">
                  Processos publicados ou concluidos
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-[#F4F3F7]">
              {arquivo.map((p: any) => (
                <ProcessoRow key={p.id} p={p} href={`/processos/${p.id}/publicacao`} />
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {saldo < 10 && (
        <div className="flex items-start gap-3 p-4 rounded-xl text-sm border" style={{ backgroundColor: '#FFF8EC', borderColor: '#F0D9A8' }}>
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: '#B7935E' }} />
          <div>
            <p className="font-semibold text-[#7A5A1E]">Saldo de creditos baixo</p>
            <p className="text-[#9A7A4A] text-xs mt-0.5">
              Voce tem apenas {saldo} credito{saldo !== 1 ? 's' : ''}. As funcionalidades de IA ficam indisponiveis com saldo zerado.
            </p>
          </div>
        </div>
      )}
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

  return (
    <div className="space-y-8">
      <div>
        <p className="text-[11px] font-semibold text-[#B7935E] uppercase tracking-widest mb-1">Procuradoria</p>
        <h1 className="text-2xl font-bold text-[#1A365D]" style={{ fontFamily: 'var(--font-heading)' }}>
          {saudacao}, {primeiroNome}.
        </h1>
        {org && <p className="text-sm text-[#74777F] mt-1">{org.nome}&nbsp;&bull;&nbsp;{org.municipio} / {org.estado}</p>}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <SectionKpi label="FILA DE PARECERES" valor={fila.length}      sub="Aguardando analise juridica" icon={Scale}        color="#1A365D" />
        <SectionKpi label="APROVADOS"         valor={historico.length} sub="Pareceres favoraveis"        icon={CheckCircle2} color="#1A6637" />
        <SectionKpi label="TOTAL"             valor={pareceresList.length} sub="Processos avaliados"     icon={Gavel}        color="#B7935E" />
      </div>

      {/* Fila de pareceres */}
      <Card className="border-[#E3E2E6] bg-white rounded-xl overflow-hidden" style={{ boxShadow: '0 1px 4px rgba(26,54,93,0.04)' }}>
        <CardHeader className="px-6 py-5 border-b border-[#E3E2E6]">
          <CardTitle className="text-base font-semibold text-[#1A365D]" style={{ fontFamily: 'var(--font-heading)' }}>
            Fila de Pareceres
          </CardTitle>
          <CardDescription className="text-xs mt-0.5 text-[#74777F]">
            Processos aguardando analise juridica (Art. 53, Lei 14.133/21)
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {fila.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-center px-6">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ backgroundColor: '#1A365D0D' }}>
                <Scale className="w-6 h-6" style={{ color: '#1A365D' }} />
              </div>
              <p className="text-sm font-semibold text-[#1A365D] mb-1">Nenhum processo aguardando</p>
              <p className="text-xs text-[#74777F] max-w-xs leading-relaxed">
                Quando um processo for encaminhado para a procuradoria, ele aparecera aqui.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#F4F3F7]">
              {fila.map((par: any) => {
                const proc = processosMap[par.processo_id]
                if (!proc) return null
                const parecerCfg = PARECER_STATUS_CONFIG[par.status] ?? PARECER_STATUS_CONFIG['pendente']
                return (
                  <Link
                    key={par.id}
                    href={`/processos/${par.processo_id}/parecer`}
                    className="flex items-center gap-4 px-6 py-4 hover:bg-[#FAFAFA] transition-colors group"
                  >
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: '#B7935E10' }}>
                      <Scale className="w-4 h-4" style={{ color: '#B7935E' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#1A1C1E] truncate">
                        {proc.numero_processo ? `${proc.numero_processo} - ` : ''}{proc.objeto}
                      </p>
                      <p className="text-xs text-[#74777F] mt-0.5">{MODALIDADE_LABEL[proc.modalidade] ?? proc.modalidade}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span
                        className="text-[11px] font-medium px-2 py-0.5 border hidden sm:inline"
                        style={{ backgroundColor: parecerCfg.bg, color: parecerCfg.color, borderColor: parecerCfg.border, borderRadius: '2px' }}
                      >
                        {parecerCfg.label}
                      </span>
                      <ArrowRight className="w-4 h-4" style={{ color: '#C4C6CF' }} />
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Historico */}
      {historico.length > 0 && (
        <Card className="border-[#E3E2E6] bg-white rounded-xl overflow-hidden" style={{ boxShadow: '0 1px 4px rgba(26,54,93,0.04)' }}>
          <CardHeader className="px-6 py-5 border-b border-[#E3E2E6]">
            <div className="flex items-center gap-2">
              <Archive className="w-4 h-4" style={{ color: '#74777F' }} />
              <div>
                <CardTitle className="text-base font-semibold text-[#1A365D]" style={{ fontFamily: 'var(--font-heading)' }}>
                  Historico de Pareceres
                </CardTitle>
                <CardDescription className="text-xs mt-0.5 text-[#74777F]">
                  Pareceres ja emitidos pela procuradoria
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-[#F4F3F7]">
              {historico.map((par: any) => {
                const proc = processosMap[par.processo_id]
                if (!proc) return null
                const parecerCfg = PARECER_STATUS_CONFIG[par.status]
                return (
                  <Link
                    key={par.id}
                    href={`/processos/${par.processo_id}/parecer`}
                    className="flex items-center gap-4 px-6 py-4 hover:bg-[#FAFAFA] transition-colors group"
                  >
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: '#1A6637' + '10' }}>
                      <CheckCircle2 className="w-4 h-4" style={{ color: '#1A6637' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#1A1C1E] truncate">
                        {proc.numero_processo ? `${proc.numero_processo} - ` : ''}{proc.objeto}
                      </p>
                      <p className="text-xs text-[#74777F] mt-0.5">{MODALIDADE_LABEL[proc.modalidade] ?? proc.modalidade}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {parecerCfg && (
                        <span
                          className="text-[11px] font-medium px-2 py-0.5 border hidden sm:inline"
                          style={{ backgroundColor: parecerCfg.bg, color: parecerCfg.color, borderColor: parecerCfg.border, borderRadius: '2px' }}
                        >
                          {parecerCfg.label}
                        </span>
                      )}
                      <ArrowRight className="w-4 h-4" style={{ color: '#C4C6CF' }} />
                    </div>
                  </Link>
                )
              })}
            </div>
          </CardContent>
        </Card>
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

  const pendentes    = autorizacoesList.filter((a: any) => a.status === 'pendente' || a.status === 'devolvido')
  const autorizados  = autorizacoesList.filter((a: any) => a.status === 'autorizado')

  const AUTORIZACAO_STATUS: Record<string, { label: string; bg: string; color: string; border: string }> = {
    pendente:   { label: 'Aguardando Autorizacao', bg: '#FFF8EC', color: '#7A5A1E', border: '#F0D9A8' },
    autorizado: { label: 'Autorizado',             bg: '#F0FAF4', color: '#1A6637', border: '#B3DFC5' },
    devolvido:  { label: 'Devolvido',              bg: '#FFF0F0', color: '#BA1A1A', border: '#FFBBB5' },
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-[11px] font-semibold text-[#B7935E] uppercase tracking-widest mb-1">Autoridade Competente</p>
        <h1 className="text-2xl font-bold text-[#1A365D]" style={{ fontFamily: 'var(--font-heading)' }}>
          {saudacao}, {primeiroNome}.
        </h1>
        {org && <p className="text-sm text-[#74777F] mt-1">{org.nome}&nbsp;&bull;&nbsp;{org.municipio} / {org.estado}</p>}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <SectionKpi label="AGUARDANDO"   valor={pendentes.length}   sub="Processos para autorizar" icon={Clock}        color="#B7935E" />
        <SectionKpi label="AUTORIZADOS"  valor={autorizados.length} sub="Processos autorizados"    icon={ShieldCheck}  color="#1A6637" />
        <SectionKpi label="TOTAL"        valor={autorizacoesList.length} sub="Processos avaliados" icon={FileText}     color="#1A365D" />
      </div>

      {/* Fila de autorizacao */}
      <Card className="border-[#E3E2E6] bg-white rounded-xl overflow-hidden" style={{ boxShadow: '0 1px 4px rgba(26,54,93,0.04)' }}>
        <CardHeader className="px-6 py-5 border-b border-[#E3E2E6]">
          <CardTitle className="text-base font-semibold text-[#1A365D]" style={{ fontFamily: 'var(--font-heading)' }}>
            Aguardando Autorizacao
          </CardTitle>
          <CardDescription className="text-xs mt-0.5 text-[#74777F]">
            Processos com parecer favoravel, aguardando sua decisao (Art. 72, Lei 14.133/21)
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          {pendentes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-14 text-center px-6">
              <div className="w-14 h-14 rounded-2xl flex items-center justify-center mb-4" style={{ backgroundColor: '#1A365D0D' }}>
                <ShieldCheck className="w-6 h-6" style={{ color: '#1A365D' }} />
              </div>
              <p className="text-sm font-semibold text-[#1A365D] mb-1">Nenhum processo aguardando</p>
              <p className="text-xs text-[#74777F] max-w-xs leading-relaxed">
                Quando um processo receber parecer favoravel, ele aparecera aqui para sua autorizacao.
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[#F4F3F7]">
              {pendentes.map((aut: any) => {
                const proc = processosMap[aut.processo_id]
                if (!proc) return null
                const autCfg = AUTORIZACAO_STATUS[aut.status] ?? AUTORIZACAO_STATUS['pendente']
                return (
                  <Link
                    key={aut.id}
                    href={`/processos/${aut.processo_id}/autorizacao`}
                    className="flex items-center gap-4 px-6 py-4 hover:bg-[#FAFAFA] transition-colors group"
                  >
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: '#1A365D0D' }}>
                      <ShieldCheck className="w-4 h-4" style={{ color: '#1A365D' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#1A1C1E] truncate">
                        {proc.numero_processo ? `${proc.numero_processo} - ` : ''}{proc.objeto}
                      </p>
                      <p className="text-xs text-[#74777F] mt-0.5">{MODALIDADE_LABEL[proc.modalidade] ?? proc.modalidade}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span
                        className="text-[11px] font-medium px-2 py-0.5 border hidden sm:inline"
                        style={{ backgroundColor: autCfg.bg, color: autCfg.color, borderColor: autCfg.border, borderRadius: '2px' }}
                      >
                        {autCfg.label}
                      </span>
                      <ArrowRight className="w-4 h-4" style={{ color: '#C4C6CF' }} />
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Historico de autorizacoes */}
      {autorizados.length > 0 && (
        <Card className="border-[#E3E2E6] bg-white rounded-xl overflow-hidden" style={{ boxShadow: '0 1px 4px rgba(26,54,93,0.04)' }}>
          <CardHeader className="px-6 py-5 border-b border-[#E3E2E6]">
            <div className="flex items-center gap-2">
              <Archive className="w-4 h-4" style={{ color: '#74777F' }} />
              <div>
                <CardTitle className="text-base font-semibold text-[#1A365D]" style={{ fontFamily: 'var(--font-heading)' }}>
                  Historico de Autorizacoes
                </CardTitle>
                <CardDescription className="text-xs mt-0.5 text-[#74777F]">
                  Processos ja autorizados pela autoridade competente
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-[#F4F3F7]">
              {autorizados.map((aut: any) => {
                const proc = processosMap[aut.processo_id]
                if (!proc) return null
                return (
                  <Link
                    key={aut.id}
                    href={`/processos/${aut.processo_id}/autorizacao`}
                    className="flex items-center gap-4 px-6 py-4 hover:bg-[#FAFAFA] transition-colors group"
                  >
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: '#1A6637' + '10' }}>
                      <ShieldCheck className="w-4 h-4" style={{ color: '#1A6637' }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold text-[#1A1C1E] truncate">
                        {proc.numero_processo ? `${proc.numero_processo} - ` : ''}{proc.objeto}
                      </p>
                      <p className="text-xs text-[#74777F] mt-0.5">{MODALIDADE_LABEL[proc.modalidade] ?? proc.modalidade}</p>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <span
                        className="text-[11px] font-medium px-2 py-0.5 border hidden sm:inline"
                        style={{ backgroundColor: '#F0FAF4', color: '#1A6637', borderColor: '#B3DFC5', borderRadius: '2px' }}
                      >
                        Autorizado
                      </span>
                      <ArrowRight className="w-4 h-4" style={{ color: '#C4C6CF' }} />
                    </div>
                  </Link>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

// ─── View: Admin / Setor (view completa) ──────────────────────────────────────

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

  const processos = (todosProcessos as any[] | null) ?? []
  const emAndamento = processos.filter((p: any) => p.status === 'rascunho' || p.status === 'em_revisao').length
  const publicados  = processos.filter((p: any) => p.status === 'publicado').length
  const arquivo     = processos.filter((p: any) => p.status === 'publicado' || p.status === 'assinado')

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div>
          <p className="text-[11px] font-semibold text-[#B7935E] uppercase tracking-widest mb-1">Painel de Controle</p>
          <h1 className="text-2xl font-bold text-[#1A365D]" style={{ fontFamily: 'var(--font-heading)' }}>
            {saudacao}, {primeiroNome}.
          </h1>
          {org && <p className="text-sm text-[#74777F] mt-1">{org.nome}&nbsp;&bull;&nbsp;{org.municipio} / {org.estado}</p>}
        </div>
        <Link href="/processos/novo">
          <Button className="text-white h-9 px-5 text-sm font-semibold gap-2 rounded-lg" style={{ backgroundColor: '#B7935E' }}>
            <PlusCircle className="w-4 h-4" />
            Novo Processo
          </Button>
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <SectionKpi label="PROCESSOS"     valor={processos.length} sub="Total criados"   icon={FileText}    color="#1A365D" />
        <SectionKpi label="EM ELABORACAO" valor={emAndamento}      sub="Em andamento"    icon={Clock}       color="#B7935E" />
        <SectionKpi label="PUBLICADOS"    valor={publicados}       sub={`de ${arquivo.length} concluidos`} icon={CheckCircle} color="#1A6637" />
        <SectionKpi label="CREDITOS IA"   valor={saldo}            sub="Disponiveis"     icon={Zap}         color="#4A7196" />
      </div>

      <Card className="border-[#E3E2E6] bg-white rounded-xl overflow-hidden" style={{ boxShadow: '0 1px 4px rgba(26,54,93,0.04)' }}>
        <CardHeader className="px-6 py-5 border-b border-[#E3E2E6] flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold text-[#1A365D]" style={{ fontFamily: 'var(--font-heading)' }}>
              Processos Licitatorios
            </CardTitle>
            <CardDescription className="text-xs mt-0.5 text-[#74777F]">
              Todos os processos da organizacao
            </CardDescription>
          </div>
          {processos.length > 0 && (
            <Link href="/processos/novo">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8 border-[#E3E2E6] text-[#1A365D] hover:bg-[#F4F3F7]">
                <PlusCircle className="w-3.5 h-3.5" />
                Novo
              </Button>
            </Link>
          )}
        </CardHeader>
        <CardContent className="p-0">
          {processos.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-center px-6">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mb-5" style={{ backgroundColor: '#1A365D0D' }}>
                <Gavel className="w-7 h-7" style={{ color: '#1A365D' }} />
              </div>
              <h3 className="text-base font-semibold text-[#1A365D] mb-1" style={{ fontFamily: 'var(--font-heading)' }}>
                Nenhum processo ainda
              </h3>
              <p className="text-sm text-[#74777F] max-w-sm leading-relaxed">
                Clique em "Novo Processo" para iniciar a elaboracao do primeiro processo licitatorio.
              </p>
              <Link href="/processos/novo" className="mt-6">
                <Button className="text-white gap-2 text-sm h-9 px-5 rounded-lg" style={{ backgroundColor: '#B7935E' }}>
                  <PlusCircle className="w-4 h-4" />
                  Criar primeiro processo
                </Button>
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-[#F4F3F7]">
              {processos.map((p: any) => (
                <ProcessoRow key={p.id} p={p} href={`/processos/${p.id}/dfd`} />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {saldo < 10 && (
        <div className="flex items-start gap-3 p-4 rounded-xl text-sm border" style={{ backgroundColor: '#FFF8EC', borderColor: '#F0D9A8' }}>
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: '#B7935E' }} />
          <div>
            <p className="font-semibold text-[#7A5A1E]">Saldo de creditos baixo</p>
            <p className="text-[#9A7A4A] text-xs mt-0.5">
              Voce tem apenas {saldo} credito{saldo !== 1 ? 's' : ''}. As funcionalidades de IA ficam indisponiveis com saldo zerado.
            </p>
          </div>
        </div>
      )}
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

  const usuario = usuarioData as { nome_completo: string; organizacao_id: string; papel: PapelUsuario } | null
  const organizacaoId = usuario?.organizacao_id
  if (!organizacaoId) return null

  const papel = usuario?.papel

  const [orgRes, creditosRes] = await Promise.all([
    supabase.from('organizacoes').select('nome, municipio, estado').eq('id', organizacaoId).maybeSingle(),
    (supabase as any).from('creditos_usuario').select('saldo').eq('usuario_id', user.id).maybeSingle(),
  ])

  const org   = orgRes.data as { nome: string; municipio: string; estado: string } | null
  const saldo = (creditosRes.data as any)?.saldo ?? 0

  const nomeUsuario  = usuario?.nome_completo || user.email || 'Gestor'
  const primeiroNome = nomeUsuario.split(' ')[0]
  const hora         = new Date().getHours()
  const saudacao     = hora < 12 ? 'Bom dia' : hora < 18 ? 'Boa tarde' : 'Boa noite'

  const props = { org, saldo, primeiroNome, saudacao, organizacaoId }

  if (papel === 'requisitante') {
    return <DashboardRequisitante userId={user.id} {...props} />
  }

  if (papel === 'procurador') {
    return <DashboardProcurador {...props} />
  }

  if (papel === 'autoridade_competente') {
    return <DashboardAutoridadeCompetente {...props} />
  }

  if (papel === 'setor_licitacao') {
    return <DashboardSetorLicitacao {...props} />
  }

  // admin_organizacao e admin_plataforma
  return <DashboardAdmin {...props} />
}