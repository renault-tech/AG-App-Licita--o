'use client'

import Link from 'next/link'
import { FilePlus2, Calculator } from 'lucide-react'

// Atalhos do Painel do Setor de Compras (primeira area):
// 1) Criar Processo: reaproveita o fluxo do wizard existente (/processos/novo)
// 2) Cotacao de Precos: abre o modulo unico de pesquisa de precos (PNCP)
export function BotoesCompras() {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Link
        href="/processos/novo"
        className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-[var(--r-md)] transition-opacity hover:opacity-90"
        style={{ background: 'var(--primary)', color: 'white' }}
      >
        <FilePlus2 className="w-4 h-4" />
        Criar Processo
      </Link>
      <Link
        href="/cotacao"
        className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-semibold rounded-[var(--r-md)] border transition-colors hover:opacity-80"
        style={{ borderColor: 'var(--primary)', color: 'var(--primary)', background: 'var(--surface)' }}
      >
        <Calculator className="w-4 h-4" />
        Cotacao de Precos
      </Link>
    </div>
  )
}
