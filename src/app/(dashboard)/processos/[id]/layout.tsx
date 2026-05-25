import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { headers } from 'next/headers'
import {
  ArrowLeft, FileText, Calculator, ClipboardList, ShieldAlert,
  ScrollText, BookOpen, Gavel, CheckCircle2, ClipboardCheck,
  ShieldCheck, Globe, Scale, Mail, MessageSquare, Bot,
} from 'lucide-react'
import { obterPapelUsuario } from '@/lib/actions/usuario'
import {
  ACESSO_RESTRITO_PROCESSO,
  getTabDesignada,
  LABEL_PAPEL,
} from '@/lib/permissions'
import { getPermissoesOrg } from '@/lib/cached-permissions'
import { StatusPill } from '@/components/licita/status-pill'
import type { StatusProcesso } from '@/components/licita/status-pill'
import type { PapelUsuario, FaseProcesso, TramitacaoHistoricoRow } from '@/types/database'
import { ProcessoTimelineWithSheet } from '@/components/processo/processo-timeline-with-sheet'

const ETAPAS = [
  { slug: 'dfd',         label: 'DFD',           icon: FileText,       desc: 'Formalização da Demanda' },
  { slug: 'cotacao',     label: 'Cotação',        icon: Calculator,     desc: 'Pesquisa de Preços' },
  { slug: 'etp',         label: 'ETP',            icon: ClipboardList,  desc: 'Estudo Técnico Preliminar' },
  { slug: 'tr',          label: 'TR',             icon: ScrollText,     desc: 'Termo de Referência' },
  { slug: 'riscos',      label: 'Riscos',         icon: ShieldAlert,    desc: 'Mapa de Riscos' },
  { slug: 'edital',      label: 'Edital',         icon: BookOpen,       desc: 'Edital da Licitação' },
  { slug: 'declaracao',  label: 'Declaração',     icon: Scale,          desc: 'Declaração do Setor Requisitante' },
  { slug: 'oficio',      label: 'Ofício',         icon: Mail,           desc: 'Ofício de Abertura' },
  { slug: 'revisao',     label: 'Revisão',        icon: ClipboardCheck, desc: 'Revisão do Setor de Licitações' },
  { slug: 'parecer',     label: 'Parecer',        icon: Gavel,          desc: 'Parecer Jurídico' },
  { slug: 'autorizacao', label: 'Autorização',    icon: ShieldCheck,    desc: 'Autorização da Autoridade Competente' },
  { slug: 'publicacao',  label: 'Publicação',     icon: Globe,          desc: 'Publicação do Processo' },
]

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

export default async function ProcessoLayout({
  children,
  params,
}: {
  children: React.ReactNode
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: processo } = await (supabase
    .from('processos_licitatorios') as any)
    .select('id, objeto, modalidade, status, numero_processo, valor_estimado, fase_atual, organizacao_id')
    .eq('id', id)
    .maybeSingle()

  if (!processo) return notFound()

  // Busca historico de tramitacao para alimentar a timeline
  const { data: historicoRaw } = await (supabase
    .from('tramitacao_historico') as any)
    .select('id, processo_id, organizacao_id, usuario_id, nome_usuario, de_papel, para_papel, tipo, motivo, pendencias, created_at')
    .eq('processo_id', id)
    .order('created_at', { ascending: true })

  const historico = (historicoRaw ?? []) as TramitacaoHistoricoRow[]
  const faseAtual = (processo.fase_atual ?? 'requisitante') as FaseProcesso

  const papel = (await obterPapelUsuario()) as PapelUsuario | null

  // Detecta etapa ativa pelo pathname
  const headersList = await headers()
  const pathname = headersList.get('x-pathname') ?? ''
  const etapaAtiva = pathname.includes('/chat')
    ? 'chat'
    : pathname.includes('/assistente')
    ? 'assistente'
    : ETAPAS.find(e => pathname.includes(`/${e.slug}`))?.slug ?? 'dfd'

  // Papeis com acesso restrito sao redirecionados para a tab designada
  if (papel && ACESSO_RESTRITO_PROCESSO.includes(papel)) {
    const tabDesignada = getTabDesignada(papel)
    if (tabDesignada && etapaAtiva !== tabDesignada) {
      redirect(`/processos/${id}/${tabDesignada}`)
    }
  }

  const todasEtapas = ETAPAS.map(e => e.slug)
  const permissoesOrg = await getPermissoesOrg()

  // Admins veem tudo; papeis restritos nao tem nav; demais usam o banco
  const tabsPermitidas: string[] =
    !papel || ACESSO_RESTRITO_PROCESSO.includes(papel)
      ? []
      : ['admin_organizacao', 'admin_plataforma'].includes(papel)
      ? todasEtapas
      : permissoesOrg[papel]?.permissoes.filter(p => p.pode_ver).map(p => p.tab_slug) ?? todasEtapas

  // Redirecionar se a etapa ativa nao e visivel para o papel
  if (
    papel &&
    !ACESSO_RESTRITO_PROCESSO.includes(papel) &&
    tabsPermitidas.length > 0 &&
    !tabsPermitidas.includes(etapaAtiva)
  ) {
    redirect(`/processos/${id}/${tabsPermitidas[0]}`)
  }

  const etapasVisiveis = ETAPAS.filter(e => tabsPermitidas.includes(e.slug))
  const etapaAtivaIndex = etapasVisiveis.findIndex(e => e.slug === etapaAtiva)

  const modalidade = MODALIDADE_LABEL[processo.modalidade] ?? processo.modalidade
  const acessoRestrito = papel ? ACESSO_RESTRITO_PROCESSO.includes(papel) : false

  return (
    <div className="space-y-0">

      {/* Cabecalho do processo */}
      <div
        className="rounded-[var(--r-lg)] border mb-4 p-4"
        style={{
          background: 'var(--surface)',
          borderColor: 'var(--hairline)',
          boxShadow: '0 1px 4px rgba(0,0,0,0.04)',
        }}
      >
        <div className="flex items-start gap-3">
          <Link
            href="/dashboard"
            className="mt-0.5 p-1.5 rounded-[var(--r-md)] shrink-0 transition-colors"
            style={{ color: 'var(--muted)' }}
            onMouseEnter={undefined}
            title="Voltar ao Painel"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              {/* Badge modalidade */}
              <span
                className="text-xs font-medium px-2 py-0.5"
                style={{
                  background: 'var(--primaryWash)',
                  color: 'var(--primary)',
                  borderRadius: '2px',
                }}
              >
                {modalidade}
              </span>
              {processo.numero_processo && (
                <span className="text-xs font-mono" style={{ color: 'var(--muted)' }}>
                  {processo.numero_processo}
                </span>
              )}
              <StatusPill status={(processo.status as StatusProcesso) ?? 'rascunho'} size="sm" />
              {/* Badge do papel atual */}
              {papel && (
                <span
                  className="text-[10px] font-semibold px-2 py-0.5"
                  style={{
                    background: 'var(--accentWash)',
                    color: 'var(--accent)',
                    borderRadius: '2px',
                  }}
                >
                  {LABEL_PAPEL[papel]}
                </span>
              )}
            </div>
            <h2
              className="text-base font-semibold mt-1 leading-snug"
              style={{ color: 'var(--ink)', fontFamily: 'var(--font-heading)' }}
            >
              {processo.objeto}
            </h2>
            {processo.valor_estimado > 0 && (
              <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                Valor estimado: R$ {(processo.valor_estimado as number).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            )}
          </div>

          {/* Botoes Chat e Assistente IA */}
          <div className="flex items-center gap-1.5 shrink-0">
            <Link
              href={`/processos/${id}/chat`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--r-md)] text-xs font-medium border transition-colors"
              style={{
                background: etapaAtiva === 'chat' ? 'var(--primaryWash)' : 'transparent',
                color: etapaAtiva === 'chat' ? 'var(--primary)' : 'var(--inkSoft)',
                borderColor: 'var(--hairline)',
              }}
              title="Chat do processo"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Chat</span>
            </Link>
            <Link
              href={`/processos/${id}/assistente`}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--r-md)] text-xs font-medium border transition-colors"
              style={{
                background: etapaAtiva === 'assistente' ? 'var(--accentWash)' : 'transparent',
                color: etapaAtiva === 'assistente' ? 'var(--accent)' : 'var(--inkSoft)',
                borderColor: 'var(--hairline)',
              }}
              title="Assistente IA"
            >
              <Bot className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">IA</span>
            </Link>
          </div>
        </div>

        {/* Navegacao por etapas */}
        <div className="mt-4 pt-4" style={{ borderTop: '1px solid var(--hairline)' }}>

          {/* Layout restrito: procurador, gestor_publico e publicacao */}
          {acessoRestrito ? (
            <div className="flex items-center gap-3">
              <div
                className="flex items-center gap-2 px-4 py-2 rounded-[var(--r-md)] text-sm font-semibold"
                style={{ background: 'var(--primaryWash)', color: 'var(--primary)' }}
              >
                <Scale className="w-4 h-4" style={{ color: 'var(--accent)' }} />
                {papel === 'procurador' ? 'Parecer Jurídico' : papel === 'gestor_publico' ? 'Autorização do Gestor Público' : 'Publicação'}
              </div>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>
                {papel === 'procurador'
                  ? 'Analise a regularidade do processo conforme Art. 53 da Lei 14.133/21.'
                  : papel === 'gestor_publico'
                  ? 'Autorize ou devolva o processo conforme Art. 72 da Lei 14.133/21.'
                  : 'Registre a publicacao nos canais institucionais.'}
              </p>
            </div>
          ) : (
            <>
              {/* Desktop: etapas horizontais */}
              <nav className="hidden md:flex items-center" aria-label="Etapas do processo">
                {etapasVisiveis.map((etapa, i) => {
                  const Icon = etapa.icon
                  const isAtiva     = etapa.slug === etapaAtiva
                  const isConcluida = i < etapaAtivaIndex

                  const circleStyle = isAtiva
                    ? { backgroundColor: 'var(--primary)', borderColor: 'var(--primary)', color: '#fff' }
                    : isConcluida
                    ? { backgroundColor: 'var(--successWash)', borderColor: 'var(--success)', color: 'var(--success)' }
                    : { backgroundColor: 'var(--surface)', borderColor: 'var(--hairline)', color: 'var(--muted)' }

                  const labelColor = isAtiva
                    ? 'var(--primary)'
                    : isConcluida
                    ? 'var(--success)'
                    : 'var(--muted)'

                  return (
                    <div key={etapa.slug} className="flex items-center flex-1 min-w-0">
                      <Link
                        href={`/processos/${id}/${etapa.slug}`}
                        className="flex flex-col items-center gap-1 px-2 py-1 rounded-[var(--r-md)] transition-all flex-1 min-w-0"
                      >
                        <div
                          className="w-7 h-7 rounded-full flex items-center justify-center border-2 transition-all"
                          style={circleStyle}
                        >
                          {isConcluida ? (
                            <CheckCircle2 className="w-4 h-4" />
                          ) : (
                            <Icon className="w-3.5 h-3.5" />
                          )}
                        </div>
                        <span
                          className={`text-xs font-medium whitespace-nowrap ${isAtiva ? 'font-semibold' : ''}`}
                          style={{ color: labelColor }}
                        >
                          {etapa.label}
                        </span>
                      </Link>
                      {i < etapasVisiveis.length - 1 && (
                        <div
                          className="h-0.5 flex-1 mx-1 rounded-full transition-all"
                          style={{ backgroundColor: isConcluida ? 'var(--success)' : 'var(--hairline)' }}
                        />
                      )}
                    </div>
                  )
                })}
              </nav>

              {/* Mobile: tabs scrollaveis */}
              <nav className="md:hidden flex gap-1 overflow-x-auto pb-1 -mx-1 px-1" aria-label="Etapas do processo">
                {etapasVisiveis.map((etapa, i) => {
                  const isAtiva     = etapa.slug === etapaAtiva
                  const isConcluida = i < etapaAtivaIndex

                  const pillStyle = isAtiva
                    ? { backgroundColor: 'var(--primary)', color: '#fff', borderColor: 'var(--primary)' }
                    : isConcluida
                    ? { backgroundColor: 'var(--successWash)', color: 'var(--success)', borderColor: 'var(--success)' }
                    : { backgroundColor: 'var(--surface)', color: 'var(--muted)', borderColor: 'var(--hairline)' }

                  return (
                    <Link
                      key={etapa.slug}
                      href={`/processos/${id}/${etapa.slug}`}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-[var(--r-pill)] text-xs font-medium whitespace-nowrap border transition-all"
                      style={pillStyle}
                    >
                      {isConcluida && <CheckCircle2 className="w-3 h-3" />}
                      {etapa.label}
                    </Link>
                  )
                })}
              </nav>
            </>
          )}
        </div>
      </div>

      {/* Timeline de tramitacao — mostra por qual setor o processo passou */}
      <ProcessoTimelineWithSheet
        historico={historico}
        faseAtual={faseAtual}
        organizacaoId={processo.organizacao_id}
        className="mb-6"
      />

      {/* Conteudo da etapa */}
      <div>{children}</div>
    </div>
  )
}
