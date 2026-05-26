'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2, PenTool, CheckCircle, ShieldCheck, ExternalLink } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { assinarDocumento } from '@/lib/actions/assinaturas'
import type { ProvedorAssinatura } from '@/lib/assinatura/types'

const LABEL_PROVEDOR: Record<ProvedorAssinatura, string> = {
  interno:   'Assinar',
  zapsign:   'Assinar via ZapSign',
  govbr:     'Assinar via Gov.br',
  clicksign: 'Assinar via Clicksign',
  docusign:  'Assinar via DocuSign',
}

const DESC_PROVEDOR: Record<ProvedorAssinatura, string> = {
  interno:   'Registra a autoria e o timestamp via hash SHA-256. O documento ficara bloqueado para edicao apos a assinatura.',
  zapsign:   'Voce sera redirecionado para a plataforma ZapSign para concluir a assinatura eletronica.',
  govbr:     'Voce sera redirecionado para autenticacao no Gov.br. Compativel com certificado ICP-Brasil (token A1/A3).',
  clicksign: 'Voce sera redirecionado para a plataforma Clicksign para concluir a assinatura eletronica.',
  docusign:  'Voce sera redirecionado para a plataforma DocuSign para concluir a assinatura eletronica.',
}

interface BotaoAssinaturaProps {
  tabelaOrigem: string
  documentoId:  string
  processoId:   string
  statusAtual:  string
  provedor?:    ProvedorAssinatura
  podeAssinar?: boolean
}

export default function BotaoAssinatura({
  tabelaOrigem,
  documentoId,
  processoId,
  statusAtual,
  provedor = 'interno',
  podeAssinar = true,
}: BotaoAssinaturaProps) {
  const [aberto, setAberto]     = useState(false)
  const [assinando, setAssinando] = useState(false)

  const isAssinado = statusAtual === 'assinado' || statusAtual === 'publicado'
  const usaRedirect = provedor === 'govbr'
  const abreNovaAba = provedor === 'zapsign' || provedor === 'clicksign' || provedor === 'docusign'

  if (isAssinado) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 border border-green-200 text-green-700 rounded-lg text-xs font-medium">
        <CheckCircle className="w-3.5 h-3.5 shrink-0" />
        Documento assinado
      </div>
    )
  }

  if (!podeAssinar) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-gray-50 border border-gray-200 text-gray-500 rounded-lg text-xs font-medium">
        <PenTool className="w-3.5 h-3.5 shrink-0" />
        Aguardando assinatura
      </div>
    )
  }

  async function handleConfirmar() {
    if (usaRedirect) {
      const params = new URLSearchParams({
        documento_id: documentoId,
        tabela:       tabelaOrigem,
        processo_id:  processoId,
      })
      window.location.href = `/api/assinatura/govbr/iniciar?${params.toString()}`
      return
    }

    setAssinando(true)
    try {
      const res = await assinarDocumento(tabelaOrigem, documentoId, processoId)

      if (!res.success) {
        toast.error(res.error ?? 'Erro ao assinar documento.')
        return
      }

      if (abreNovaAba && res.data && 'urlAssinatura' in res.data && res.data.urlAssinatura) {
        toast.success('Documento enviado para assinatura. Abrindo plataforma externa.')
        window.open(res.data.urlAssinatura, '_blank', 'noopener,noreferrer')
        setAberto(false)
        return
      }

      toast.success('Documento assinado com sucesso.')
      setAberto(false)
      window.location.reload()
    } finally {
      setAssinando(false)
    }
  }

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5 h-9 text-sm text-emerald-700 border-emerald-200 hover:bg-emerald-50"
          >
            <PenTool className="w-3.5 h-3.5" />
            {LABEL_PROVEDOR[provedor]}
            {(usaRedirect || abreNovaAba) && <ExternalLink className="w-3 h-3 opacity-60" />}
          </Button>
        }
      />
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            Assinar Documento
          </DialogTitle>
          <DialogDescription className="pt-2">
            {DESC_PROVEDOR[provedor]}
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setAberto(false)}
            disabled={assinando}
          >
            Cancelar
          </Button>
          <Button
            size="sm"
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5"
            onClick={handleConfirmar}
            disabled={assinando}
          >
            {assinando
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Processando...</>
              : <><ShieldCheck className="w-3.5 h-3.5" /> Confirmar e Assinar</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
