'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2, PenTool, ExternalLink, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { assinarDocumento } from '@/lib/actions/assinaturas'

type ProvedorAssinatura = 'interno' | 'zapsign' | 'govbr' | 'clicksign' | 'docusign'

interface Props {
  tabelaOrigem: string
  documentoId:  string
  processoId:   string
  provedor:     ProvedorAssinatura
  statusAtual:  string
  podeAssinar:  boolean
}

const LABEL_PROVEDOR: Record<ProvedorAssinatura, string> = {
  interno:   'Assinar internamente',
  zapsign:   'Assinar via ZapSign',
  govbr:     'Assinar via Gov.br',
  clicksign: 'Assinar via ClickSign',
  docusign:  'Assinar via DocuSign',
}

const ICONE_PROVEDOR: Record<ProvedorAssinatura, string> = {
  interno:   '🔐',
  zapsign:   '📝',
  govbr:     '🏛️',
  clicksign: '✍️',
  docusign:  '📄',
}

export default function BotaoAssinatura({
  tabelaOrigem,
  documentoId,
  processoId,
  provedor,
  statusAtual,
  podeAssinar,
}: Props) {
  const [loading, setLoading] = useState(false)

  const jaAssinado = statusAtual === 'assinado' || statusAtual === 'publicado'

  async function handleAssinar() {
    // Gov.br usa fluxo OAuth2 — redireciona para o endpoint de início
    if (provedor === 'govbr') {
      const params = new URLSearchParams({
        documento_id: documentoId,
        tabela:       tabelaOrigem,
        processo_id:  processoId,
      })
      window.location.href = `/api/assinatura/govbr/iniciar?${params.toString()}`
      return
    }

    setLoading(true)
    try {
      const res = await assinarDocumento(tabelaOrigem, documentoId, processoId)

      if (!res.success) {
        toast.error(res.error)
        return
      }

      // ZapSign retorna uma URL de assinatura — abre em nova aba
      if (provedor === 'zapsign' && res.data && typeof res.data === 'object' && 'urlAssinatura' in res.data) {
        const url = (res.data as { urlAssinatura?: string }).urlAssinatura
        if (url) {
          toast.success('Documento enviado para assinatura. Você será redirecionado.')
          window.open(url, '_blank', 'noopener,noreferrer')
          return
        }
      }

      toast.success('Documento assinado com sucesso.')
      window.location.reload()
    } finally {
      setLoading(false)
    }
  }

  if (jaAssinado) {
    return (
      <div className="flex items-center gap-2 text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
        <ShieldCheck className="w-4 h-4" />
        <span className="font-medium">Documento assinado</span>
      </div>
    )
  }

  if (!podeAssinar) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2">
        <PenTool className="w-4 h-4" />
        <span>Aguardando assinatura</span>
      </div>
    )
  }

  return (
    <Button
      onClick={handleAssinar}
      disabled={loading}
      variant="outline"
      className="gap-2 h-9 text-sm border-blue-200 text-blue-700 hover:bg-blue-50 hover:border-blue-300"
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <>
          <span>{ICONE_PROVEDOR[provedor]}</span>
          {provedor === 'govbr' || provedor === 'zapsign'
            ? <ExternalLink className="w-3.5 h-3.5" />
            : <PenTool className="w-3.5 h-3.5" />}
        </>
      )}
      {loading ? 'Processando...' : LABEL_PROVEDOR[provedor]}
    </Button>
  )
}
