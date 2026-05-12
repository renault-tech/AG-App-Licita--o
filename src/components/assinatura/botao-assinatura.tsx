'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2, PenTool, CheckCircle, ShieldCheck } from 'lucide-react'
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

interface BotaoAssinaturaProps {
  tabelaOrigem: string
  documentoId: string
  processoId: string
  statusAtual: string
  desabilitado?: boolean
}

export default function BotaoAssinatura({
  tabelaOrigem,
  documentoId,
  processoId,
  statusAtual,
  desabilitado,
}: BotaoAssinaturaProps) {
  const [aberto, setAberto] = useState(false)
  const [assinando, setAssinando] = useState(false)

  const isAssinado = statusAtual === 'assinado' || statusAtual === 'publicado'

  async function handleAssinar() {
    setAssinando(true)
    const res = await assinarDocumento(tabelaOrigem, documentoId, processoId)
    if (res.success) {
      toast.success('Documento assinado com sucesso.')
      setAberto(false)
    } else {
      toast.error(res.error ?? 'Erro ao assinar.')
    }
    setAssinando(false)
  }

  if (isAssinado) {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1.5 bg-green-50 border border-green-200 text-green-700 rounded-lg text-xs font-medium">
        <CheckCircle className="w-3.5 h-3.5 shrink-0" />
        Documento assinado
      </div>
    )
  }

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger
        render={
          <Button
            variant="outline"
            size="sm"
            disabled={desabilitado}
            className="gap-1.5 h-9 text-sm text-emerald-700 border-emerald-200 hover:bg-emerald-50"
          >
            <PenTool className="w-3.5 h-3.5" />
            Assinar
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
            Ao assinar, o documento recebe status <strong>Assinado</strong> e fica bloqueado para edicao.
            Um hash criptografico com timestamp sera vinculado ao seu usuario como registro de autoria.
            <br /><br />
            Voce confirma a integridade e validade deste documento?
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
            onClick={handleAssinar}
            disabled={assinando}
          >
            {assinando
              ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Assinando...</>
              : <><ShieldCheck className="w-3.5 h-3.5" /> Confirmar e Assinar</>}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}