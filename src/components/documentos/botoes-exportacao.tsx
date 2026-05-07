'use client'

import { useState } from 'react'
import { FileDown, FileText, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'

interface BotoesExportacaoProps {
  tipo: string
  processoId: string
  nomeDocumento?: string
}

export default function BotoesExportacao({ tipo, processoId, nomeDocumento }: BotoesExportacaoProps) {
  const [baixandoPdf, setBaixandoPdf]   = useState(false)
  const [baixandoDocx, setBaixandoDocx] = useState(false)

  async function baixar(formato: 'pdf' | 'docx') {
    const setLoading = formato === 'pdf' ? setBaixandoPdf : setBaixandoDocx
    setLoading(true)

    try {
      const url = `/api/documentos/exportar-${formato}?tipo=${tipo}&processoId=${processoId}`
      const res = await fetch(url)

      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: 'Erro ao gerar documento.' }))
        throw new Error(err.error ?? 'Erro desconhecido.')
      }

      const blob = await res.blob()
      const nomeArquivo = `${(nomeDocumento ?? tipo).toUpperCase()}-${processoId.substring(0, 8)}.${formato}`
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = nomeArquivo
      link.click()
      URL.revokeObjectURL(link.href)

      toast.success(`${formato.toUpperCase()} gerado com sucesso.`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Erro ao gerar documento.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 text-xs gap-1.5 text-red-700 border-red-200 bg-red-50 hover:bg-red-100"
        onClick={() => baixar('pdf')}
        disabled={baixandoPdf || baixandoDocx}
      >
        {baixandoPdf
          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
          : <FileDown className="w-3.5 h-3.5" />}
        PDF
      </Button>
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="h-8 text-xs gap-1.5 text-blue-700 border-blue-200 bg-blue-50 hover:bg-blue-100"
        onClick={() => baixar('docx')}
        disabled={baixandoPdf || baixandoDocx}
      >
        {baixandoDocx
          ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
          : <FileText className="w-3.5 h-3.5" />}
        Word
      </Button>
    </div>
  )
}
