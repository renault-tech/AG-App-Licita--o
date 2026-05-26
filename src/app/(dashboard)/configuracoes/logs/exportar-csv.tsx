'use client'

import { useState } from 'react'
import { Download, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { exportarAuditoriaCsv } from '@/lib/actions/audit'
import type { FiltrosAudit } from '@/lib/actions/audit'

export default function ExportarCsv({ filtros }: { filtros: FiltrosAudit }) {
  const [exportando, setExportando] = useState(false)

  async function handleExportar() {
    setExportando(true)
    const result = await exportarAuditoriaCsv(filtros)
    if (!result.success || !result.csv) {
      toast.error(result.error ?? 'Erro ao exportar.')
      setExportando(false)
      return
    }

    const blob = new Blob([result.csv], { type: 'text/csv;charset=utf-8;' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    const hoje = new Date().toISOString().slice(0, 10)
    a.href     = url
    a.download = `audit-log-${hoje}.csv`
    a.click()
    URL.revokeObjectURL(url)
    setExportando(false)
    toast.success('CSV exportado com sucesso.')
  }

  return (
    <button
      type="button"
      onClick={handleExportar}
      disabled={exportando}
      className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold rounded-[var(--r-md)] border transition-colors disabled:opacity-60"
      style={{ borderColor: 'var(--hairline)', color: 'var(--inkSoft)', background: 'var(--surface)' }}
    >
      {exportando
        ? <Loader2 className="w-4 h-4 animate-spin" />
        : <Download className="w-4 h-4" />
      }
      {exportando ? 'Exportando...' : 'Exportar CSV'}
    </button>
  )
}
