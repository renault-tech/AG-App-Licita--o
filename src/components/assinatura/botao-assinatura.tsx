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

export default function BotaoAssinatura({ tabelaOrigem, documentoId, processoId, statusAtual, desabilitado }: BotaoAssinaturaProps) {
  const [aberto, setAberto] = useState(false)
  const [assinando, setAssinando] = useState(false)

  const isAssinado = statusAtual === 'assinado'

  async function handleAssinar() {
    setAssinando(true)
    const res = await assinarDocumento(tabelaOrigem, documentoId, processoId)
    
    if (res.success) {
      toast.success('Documento assinado digitalmente com sucesso!')
      setAberto(false)
    } else {
      toast.error(res.error || 'Erro ao assinar.')
    }
    setAssinando(false)
  }

  if (isAssinado) {
    return (
      <div className="flex items-center gap-2 px-4 py-2 bg-green-50 border border-green-200 text-green-700 rounded-md text-sm font-medium">
        <CheckCircle className="w-4 h-4" /> Documento Assinado
      </div>
    )
  }

  return (
    <Dialog open={aberto} onOpenChange={setAberto}>
      <DialogTrigger render={
        <Button variant="outline" className="gap-2 bg-white text-emerald-700 border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800" disabled={desabilitado}>
          <PenTool className="w-4 h-4" /> Assinar Documento
        </Button>
      } />
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-600" />
            Assinatura Eletrônica Interna
          </DialogTitle>
          <DialogDescription className="pt-4">
            Ao assinar, o documento passará para o status <strong>"Assinado"</strong> e será bloqueado para edições adicionais. 
            Uma assinatura criptográfica com timestamp será atrelada ao seu usuário.
            <br /><br />
            Você confirma a integridade e validade deste documento?
          </DialogDescription>
        </DialogHeader>
        <DialogFooter className="mt-6">
          <Button variant="ghost" onClick={() => setAberto(false)} disabled={assinando}>Cancelar</Button>
          <Button className="bg-emerald-600 hover:bg-emerald-700 text-white" onClick={handleAssinar} disabled={assinando}>
            {assinando ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Assinando...</> : 'Confirmar e Assinar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
