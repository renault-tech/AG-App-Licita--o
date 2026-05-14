import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { headers } from 'next/headers'
import {
  ArrowLeft, FileText, Calculator, ClipboardList, ShieldAlert,
  ScrollText, BookOpen, Gavel, CheckCircle2, ClipboardCheck,
  ShieldCheck, Globe, Scale, Mail,
} from 'lucide-react'
import { obterPapelUsuario } from '@/lib/actions/usuario'
import {
  ACESSO_RESTRITO_PROCESSO,
  getTabDesignada,
  LABEL_PAPEL,
} from '@/lib/permissions'
import { getPermissoesOrg } from '@/lib/cached-permissions'
import type { PapelUsuario } from '@/types/database'

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
    .select('id, objeto, modalidade, status, numero_processo, valor_estimado')
    .eq('id', id)
    .maybeSingle()

  if (!processo) return notFound()

  const papel = (await obterPapelUsuario()) as PapelUsuario | null

  // Detecta etapa ativa pelo pathname
  const headersList = await headers()
  const pathname = headersList.get('x-pathname') ?? ''
  const etapaAtiva = ETAPAS.find(e => pathname.includes(`/${e.slug}`))?.slug ?? 'dfd'

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

  const statusClasses: Record<string, string> = {
    rascunho:   'bg-[#F4F3F7] text-[#43474E] border-[#E3E2E6]',
    em_revisao: 'bg-[#FFF8EC] text-[#7A5A1E] border-[#F0D9A8]',
    assinado:   'bg-[#EFF4FF] text-[#1A365D] border-[#C4D4F0]',
    publicado:  'bg-[#F0FAF4] text-[#1A6637] border-[#B3DFC5]',
  }
  const statusLabel: Record<string, string> = {
    rascunho:   'Rascunho',
    em_revisao: 'Em Revisão',
    assinado:   'Assinado',
    publicado:  'Publicado',
  }

  // Layout simplificado para procurador e autoridade_competente
  const acessoRestrito = papel ? ACESSO_RESTRITO_PROCESSO.includes(papel) : false

  return (
    <div className="space-y-0">

      {/* Cabecalho do processo */}
      <div
        className="bg-white border border-[#E3E2E6] rounded-xl p-4 mb-4"
        style={{ boxShadow: '0 1px 4px rgba(26,54,93,0.04)' }}
      >
        <div className="flex items-start gap-3">
          <Link
            href="/dashboard"
            className="mt-0.5 p-1.5 rounded-lg hover:bg-[#F4F3F7] text-[#74777F] hover:text-[#1A365D] transition-colors shrink-0"
            title="Voltar ao Painel"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span
                className="text-xs font-medium px-2 py-0.5 border"
                style={{ backgroundColor: '#EFF4FF', color: '#1A365D', borderColor: '#C4D4F0', borderRadius: '2px' }}
              >
                {modalidade}
              </span>
              {processo.numero_processo && (
                <span className="text-xs text-[#74777F] font-mono">{processo.numero_processo}</span>
              )}
              <span
                className={`text-xs font-medium px-2 py-0.5 border ${statusClasses[processo.status] ?? statusClasses['rascunho']}`}
                style={{ borderRadius: '2px' }}
              >
                {statusLabel[processo.status] ?? processo.status}
              </span>
              {/* Badge do papel atual */}
              {papel && (
                <span
                  className="text-[10px] font-semibold px-2 py-0.5 border"
                  style={{ backgroundColor: '#B7935E10', color: '#B7935E', borderColor: '#B7935E40', borderRadius: '2px' }}
                >
                  {LABEL_PAPEL[papel]}
                </span>
              )}
            </div>
            <h2
              className="text-base font-semibold text-[#1A1C1E] mt-1 leading-snug"
              style={{ fontFamily: 'var(--font-heading)' }}
            >
              {processo.objeto}
            </h2>
            {processo.valor_estimado > 0 && (
              <p className="text-xs text-[#74777F] mt-0.5">
                Valor estimado: R$ {(processo.valor_estimado as number).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            )}
          </div>
        </div>

        {/* Navegacao por etapas */}
        <div className="mt-4 pt-4 border-t border-[#F4F3F7]">

          {/* Layout restrito: procurador e autoridade_competente */}
          {acessoRestrito ? (
            <div className="flex items-center gap-3">
              <div
                className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold"
                style={{ backgroundColor: '#1A365D0D', color: '#1A365D' }}
              >
                <Scale className="w-4 h-4" style={{ color: '#B7935E' }} />
                {papel === 'procurador' ? 'Parecer Jurídico' : 'Autorização da Autoridade Competente'}
              </div>
              <p className="text-xs text-[#74777F]">
                {papel === 'procurador'
                  ? 'Análise a regularidade do processo conforme Art. 53 da Lei 14.133/21.'
                  : 'Autorize ou devolva o processo conforme Art. 72 da Lei 14.133/21.'}
              </p>
            </div>
          ) : (
            <>
              {/* Desktop: etapas horizontais */}
              <nav className="hidden md:flex items-center" aria-label="Etapas do processo">
                {etapasVisiveis.map((etapa, i) => {
                  const Icon = etapa.icon
                  const isAtiva    = etapa.slug === etapaAtiva
                  const isConcluida = i < etapaAtivaIndex

                  return (
                    <div key={etapa.slug} className="flex items-center flex-1 min-w-0">
                      <Link
                        href={`/processos/${id}/${etapa.slug}`}
                        className={`flex flex-col items-center gap-1 px-2 py-1 rounded-lg transition-all flex-1 min-w-0 ${
                          isAtiva
                            ? 'text-[#1A365D]'
                            : isConcluida
                            ? 'text-[#1A6637] hover:text-[#1A6637]'
                            : 'text-[#74777F] hover:text-[#43474E]'
                        }`}
                      >
                        <div
                          className={`w-7 h-7 rounded-full flex items-center justify-center border-2 transition-all`}
                          style={
                            isAtiva
                              ? { backgroundColor: '#1A365D', borderColor: '#1A365D', color: '#fff' }
                              : isConcluida
                              ? { backgroundColor: '#F0FAF4', borderColor: '#B3DFC5', color: '#1A6637' }
                              : { backgroundColor: '#fff', borderColor: '#E3E2E6', color: '#74777F' }
                          }
                        >
                          {isConcluida ? (
                            <CheckCircle2 className="w-4 h-4" />
                          ) : (
                            <Icon className="w-3.5 h-3.5" />
                          )}
                        </div>
                        <span className={`text-xs font-medium whitespace-nowrap ${isAtiva ? 'text-[#1A365D] font-semibold' : ''}`}>
                          {etapa.label}
                        </span>
                      </Link>
                      {i < etapasVisiveis.length - 1 && (
                        <div
                          className="h-0.5 flex-1 mx-1 rounded-full transition-all"
                          style={{ backgroundColor: isConcluida ? '#B3DFC5' : '#E3E2E6' }}
                        />
                      )}
                    </div>
                  )
                })}
              </nav>

              {/* Mobile: tabs scrollaveis */}
              <nav className="md:hidden flex gap-1 overflow-x-auto pb-1 -mx-1 px-1" aria-label="Etapas do processo">
                {etapasVisiveis.map((etapa, i) => {
                  const isAtiva    = etapa.slug === etapaAtiva
                  const isConcluida = i < etapaAtivaIndex
                  return (
                    <Link
                      key={etapa.slug}
                      href={`/processos/${id}/${etapa.slug}`}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-all"
                      style={
                        isAtiva
                          ? { backgroundColor: '#1A365D', color: '#fff', borderColor: '#1A365D' }
                          : isConcluida
                          ? { backgroundColor: '#F0FAF4', color: '#1A6637', borderColor: '#B3DFC5' }
                          : { backgroundColor: '#fff', color: '#74777F', borderColor: '#E3E2E6' }
                      }
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

      {/* Conteudo da etapa */}
      <div>{children}</div>
    </div>
  )
}