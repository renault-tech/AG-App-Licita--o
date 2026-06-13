'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { aprovarSolicitacao, recusarSolicitacao } from '@/lib/actions/solicitacoes'

interface Props {
  solicitacaoId: string
  objeto: string
}

export function AcoesGestao({ solicitacaoId, objeto }: Props) {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [recusando, setRecusando] = useState(false)
  const [motivo, setMotivo] = useState('')
  const [carregando, setCarregando] = useState(false)

  function handleAprovar() {
    setCarregando(true)
    startTransition(async () => {
      const res = await aprovarSolicitacao(solicitacaoId)
      setCarregando(false)
      if (!res.success) { toast.error(res.error ?? 'Erro ao aprovar.'); return }
      toast.success('Solicitação aprovada. Abrindo processo...')
      router.push(res.redirectUrl!)
    })
  }

  function handleConfirmarRecusa() {
    if (!motivo.trim()) return
    setCarregando(true)
    startTransition(async () => {
      const res = await recusarSolicitacao(solicitacaoId, motivo)
      setCarregando(false)
      if (!res.success) { toast.error(res.error ?? 'Erro ao recusar.'); return }
      toast.success('Solicitação recusada.')
      router.refresh()
      setRecusando(false)
    })
  }

  if (recusando) {
    return (
      <div className="border rounded-lg p-4 space-y-3 bg-red-50 border-red-200">
        <p className="text-sm font-medium text-red-800">Recusar: {objeto}</p>
        <div className="space-y-1.5">
          <label className="text-xs font-medium text-gray-700">Motivo da recusa <span className="text-red-500">*</span></label>
          <textarea
            value={motivo}
            onChange={e => setMotivo(e.target.value)}
            rows={3}
            placeholder="Explique o motivo para o requisitante..."
            className="w-full rounded-md border border-input px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring resize-none"
          />
        </div>
        <div className="flex gap-2 justify-end">
          <Button variant="outline" size="sm" onClick={() => setRecusando(false)} disabled={carregando}>
            Cancelar
          </Button>
          <Button
            variant="destructive"
            size="sm"
            onClick={handleConfirmarRecusa}
            disabled={!motivo.trim() || carregando}
          >
            {carregando ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
            Confirmar Recusa
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex gap-3 pt-2">
      <Button
        variant="outline"
        onClick={() => setRecusando(true)}
        disabled={carregando}
        className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
      >
        <XCircle className="w-4 h-4 mr-2" />
        Recusar
      </Button>
      <Button
        onClick={handleAprovar}
        disabled={carregando}
        style={{ background: 'var(--primary)', color: 'var(--primaryInk)' }}
        className="hover:brightness-110 transition-all"
      >
        {carregando
          ? <Loader2 className="w-4 h-4 animate-spin mr-2" />
          : <CheckCircle2 className="w-4 h-4 mr-2" />
        }
        Aprovar e Abrir Processo
      </Button>
    </div>
  )
}
