import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, FileText, Calculator, ClipboardList, ShieldAlert, ScrollText, BookOpen, Gavel, ChevronRight } from 'lucide-react'

const ETAPAS = [
  { slug: 'dfd',    label: 'DFD',          icon: FileText,      desc: 'Formalização da Demanda' },
  { slug: 'cotacao', label: 'Cotação',      icon: Calculator,    desc: 'Pesquisa de Preços' },
  { slug: 'etp',    label: 'ETP',          icon: ClipboardList, desc: 'Estudo Técnico Preliminar' },
  { slug: 'tr',     label: 'TR',           icon: ScrollText,    desc: 'Termo de Referência' },
  { slug: 'riscos', label: 'Riscos',        icon: ShieldAlert,   desc: 'Mapa de Riscos' },
  { slug: 'edital', label: 'Edital',        icon: BookOpen,      desc: 'Edital da Licitação' },
  { slug: 'parecer', label: 'Parecer',      icon: Gavel,         desc: 'Parecer Jurídico' },
]

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
    .select('id, objeto, modalidade, status, numero_processo')
    .eq('id', id)
    .maybeSingle()

  if (!processo) return notFound()

  const modalidadeLabel = processo.modalidade
    ?.replace(/_/g, ' ')
    .replace(/\b\w/g, (c: string) => c.toUpperCase()) ?? ''

  return (
    <div className="space-y-4">
      {/* Cabeçalho do processo */}
      <div className="flex items-start gap-3">
        <Link href="/dashboard" className="mt-1 p-1.5 rounded-md hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-100">
              {modalidadeLabel}
            </span>
            {processo.numero_processo && (
              <span className="text-xs text-gray-400">{processo.numero_processo}</span>
            )}
          </div>
          <h2 className="text-lg font-semibold text-gray-900 mt-1 truncate">{processo.objeto}</h2>
        </div>
      </div>

      {/* Navegação horizontal entre etapas */}
      <nav className="flex gap-1 overflow-x-auto pb-1 border-b border-gray-200">
        {ETAPAS.map((etapa, i) => {
          const Icon = etapa.icon
          return (
            <Link
              key={etapa.slug}
              href={`/processos/${id}/${etapa.slug}`}
              className="flex items-center gap-1.5 px-3 py-2 rounded-t text-sm font-medium whitespace-nowrap transition-colors text-gray-500 hover:text-blue-700 hover:bg-blue-50"
            >
              <Icon className="w-3.5 h-3.5" />
              {etapa.label}
              {i < ETAPAS.length - 1 && (
                <ChevronRight className="w-3 h-3 text-gray-300 ml-1" />
              )}
            </Link>
          )
        })}
      </nav>

      {/* Conteúdo da etapa */}
      <div>{children}</div>
    </div>
  )
}
