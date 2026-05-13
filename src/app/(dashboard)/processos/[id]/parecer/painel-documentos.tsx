'use client'

import { useState } from 'react'
import { ChevronDown, ChevronUp, ExternalLink, FileText } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

interface DocumentoLink {
  label: string
  href: string
  disponivel: boolean
}

export default function PainelDocumentos({
  processoId,
  documentosDisponiveis,
}: {
  processoId: string
  documentosDisponiveis: { dfd: boolean; etp: boolean; tr: boolean; edital: boolean }
}) {
  const [aberto, setAberto] = useState(false)

  const docs: DocumentoLink[] = [
    { label: 'DFD',    href: `/processos/${processoId}/dfd`,    disponivel: documentosDisponiveis.dfd    },
    { label: 'ETP',    href: `/processos/${processoId}/etp`,    disponivel: documentosDisponiveis.etp    },
    { label: 'TR',     href: `/processos/${processoId}/tr`,     disponivel: documentosDisponiveis.tr     },
    { label: 'Edital', href: `/processos/${processoId}/edital`, disponivel: documentosDisponiveis.edital },
  ]

  const disponiveis = docs.filter(d => d.disponivel)

  return (
    <Card className="border-gray-200 shadow-sm">
      <button
        onClick={() => setAberto(!aberto)}
        className="w-full flex items-center justify-between px-5 py-3.5 text-left hover:bg-gray-50/50 transition-colors rounded-xl"
      >
        <div className="flex items-center gap-2">
          <FileText className="w-4 h-4 text-gray-500" />
          <span className="text-sm font-semibold text-gray-800">Documentos do processo</span>
          <span className="text-[11px] text-gray-400">({disponiveis.length} disponivel{disponiveis.length !== 1 ? 'is' : ''})</span>
        </div>
        {aberto ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
      </button>

      {aberto && (
        <CardContent className="px-5 pb-5 pt-0 border-t border-gray-100">
          <ul className="mt-4 space-y-2">
            {docs.map(doc => (
              <li key={doc.label}>
                {doc.disponivel ? (
                  <a
                    href={doc.href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 text-sm text-blue-700 hover:underline"
                  >
                    <FileText className="w-3.5 h-3.5 shrink-0" />
                    {doc.label}
                    <ExternalLink className="w-3 h-3 text-gray-400" />
                  </a>
                ) : (
                  <span className="flex items-center gap-2 text-sm text-gray-400">
                    <FileText className="w-3.5 h-3.5 shrink-0" />
                    {doc.label} <span className="text-[11px]">(nao disponivel)</span>
                  </span>
                )}
              </li>
            ))}
          </ul>
        </CardContent>
      )}
    </Card>
  )
}
