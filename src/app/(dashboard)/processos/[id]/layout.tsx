import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { headers } from 'next/headers'
import { ArrowLeft, FileText, Calculator, ClipboardList, ShieldAlert, ScrollText, BookOpen, Gavel, CheckCircle2, Circle, ClipboardCheck, ShieldCheck, Globe } from 'lucide-react'

const ETAPAS = [
  { slug: 'dfd',         label: 'DFD',        icon: FileText,       desc: 'Formalizacao da Demanda' },
  { slug: 'cotacao',     label: 'Cotacao',    icon: Calculator,     desc: 'Pesquisa de Precos' },
  { slug: 'etp',         label: 'ETP',        icon: ClipboardList,  desc: 'Estudo Tecnico Preliminar' },
  { slug: 'tr',          label: 'TR',         icon: ScrollText,     desc: 'Termo de Referencia' },
  { slug: 'riscos',      label: 'Riscos',     icon: ShieldAlert,    desc: 'Mapa de Riscos' },
  { slug: 'edital',      label: 'Edital',     icon: BookOpen,       desc: 'Edital da Licitacao' },
  { slug: 'revisao',     label: 'Revisao',    icon: ClipboardCheck, desc: 'Revisao do Setor de Licitacoes' },
  { slug: 'parecer',     label: 'Parecer',    icon: Gavel,          desc: 'Parecer Juridico' },
  { slug: 'autorizacao', label: 'Autorizacao',icon: ShieldCheck,    desc: 'Autorizacao da Autoridade Competente' },
  { slug: 'publicacao',  label: 'Publicacao', icon: Globe,           desc: 'Publicacao do Processo' },
]

const MODALIDADE_LABEL: Record<string, string> = {
  pregao_eletronico:  'Pregao Eletronico',
  pregao_presencial:  'Pregao Presencial',
  concorrencia:       'Concorrencia',
  concurso:           'Concurso',
  leilao:             'Leilao',
  dialogo_competitivo:'Dialogo Competitivo',
  dispensa:           'Dispensa',
  inexigibilidade:    'Inexigibilidade',
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

  // Detecta etapa ativa pelo pathname
  const headersList = await headers()
  const pathname = headersList.get('x-pathname') ?? ''
  const etapaAtiva = ETAPAS.find(e => pathname.includes(`/${e.slug}`))?.slug ?? 'dfd'
  const etapaAtivaIndex = ETAPAS.findIndex(e => e.slug === etapaAtiva)

  const modalidade = MODALIDADE_LABEL[processo.modalidade] ?? processo.modalidade

  const statusClasses: Record<string, string> = {
    rascunho:   'bg-gray-100 text-gray-600 border-gray-200',
    em_revisao: 'bg-amber-50 text-amber-700 border-amber-200',
    assinado:   'bg-blue-50 text-blue-700 border-blue-200',
    publicado:  'bg-green-50 text-green-700 border-green-200',
  }
  const statusLabel: Record<string, string> = {
    rascunho:   'Rascunho',
    em_revisao: 'Em Revisao',
    assinado:   'Assinado',
    publicado:  'Publicado',
  }

  return (
    <div className="space-y-0">

      {/* Cabecalho do processo */}
      <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
        <div className="flex items-start gap-3">
          <Link
            href="/dashboard"
            className="mt-0.5 p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors shrink-0"
            title="Voltar ao Painel"
          >
            <ArrowLeft className="w-4 h-4" />
          </Link>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
                {modalidade}
              </span>
              {processo.numero_processo && (
                <span className="text-xs text-gray-400 font-mono">{processo.numero_processo}</span>
              )}
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${statusClasses[processo.status] ?? statusClasses['rascunho']}`}>
                {statusLabel[processo.status] ?? processo.status}
              </span>
            </div>
            <h2 className="text-base font-semibold text-gray-900 mt-1 leading-snug">{processo.objeto}</h2>
            {processo.valor_estimado > 0 && (
              <p className="text-xs text-gray-400 mt-0.5">
                Valor estimado: R$ {(processo.valor_estimado as number).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
              </p>
            )}
          </div>
        </div>

        {/* Barra de progresso das etapas */}
        <div className="mt-4 pt-4 border-t border-gray-100">

          {/* Desktop: etapas horizontais */}
          <nav className="hidden md:flex items-center" aria-label="Etapas do processo">
            {ETAPAS.map((etapa, i) => {
              const Icon = etapa.icon
              const isAtiva   = etapa.slug === etapaAtiva
              const isConcluida = i < etapaAtivaIndex
              const isProxima  = i > etapaAtivaIndex

              return (
                <div key={etapa.slug} className="flex items-center flex-1 min-w-0">
                  <Link
                    href={`/processos/${id}/${etapa.slug}`}
                    className={`flex flex-col items-center gap-1 px-2 py-1 rounded-lg transition-all flex-1 min-w-0 ${
                      isAtiva
                        ? 'text-blue-700'
                        : isConcluida
                        ? 'text-green-600 hover:text-green-700'
                        : 'text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    <div className={`w-7 h-7 rounded-full flex items-center justify-center border-2 transition-all ${
                      isAtiva
                        ? 'bg-blue-600 border-blue-600 text-white shadow-sm shadow-blue-200'
                        : isConcluida
                        ? 'bg-green-50 border-green-400 text-green-600'
                        : 'bg-white border-gray-200 text-gray-400'
                    }`}>
                      {isConcluida ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        <Icon className="w-3.5 h-3.5" />
                      )}
                    </div>
                    <span className={`text-xs font-medium whitespace-nowrap ${isAtiva ? 'text-blue-700' : ''}`}>
                      {etapa.label}
                    </span>
                  </Link>
                  {i < ETAPAS.length - 1 && (
                    <div className={`h-0.5 flex-1 mx-1 rounded-full transition-all ${
                      isConcluida ? 'bg-green-300' : 'bg-gray-200'
                    }`} />
                  )}
                </div>
              )
            })}
          </nav>

          {/* Mobile: tabs scrollaveis */}
          <nav className="md:hidden flex gap-1 overflow-x-auto pb-1 -mx-1 px-1" aria-label="Etapas do processo">
            {ETAPAS.map((etapa, i) => {
              const isAtiva    = etapa.slug === etapaAtiva
              const isConcluida = i < etapaAtivaIndex
              return (
                <Link
                  key={etapa.slug}
                  href={`/processos/${id}/${etapa.slug}`}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap border transition-all ${
                    isAtiva
                      ? 'bg-blue-600 text-white border-blue-600'
                      : isConcluida
                      ? 'bg-green-50 text-green-700 border-green-200'
                      : 'bg-white text-gray-500 border-gray-200'
                  }`}
                >
                  {isConcluida && <CheckCircle2 className="w-3 h-3" />}
                  {etapa.label}
                </Link>
              )
            })}
          </nav>
        </div>
      </div>

      {/* Conteudo da etapa */}
      <div>{children}</div>
    </div>
  )
}
