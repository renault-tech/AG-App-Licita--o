'use client'

import { useState } from 'react'
import { ChevronRight, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { AlertDialog } from '@/components/ui/alert-dialog'
import { avancarEtapa } from '@/lib/actions/tramitacao-fluxo'
import { useRouter } from 'next/navigation'

interface BotaoAvancarEtapaProps {
  processoId: string
  proximaEtapaSlug: string
  label?: string
  disabled?: boolean
  className?: string
  modoAdmin?: boolean
}

export default function BotaoAvancarEtapa({
  processoId,
  proximaEtapaSlug,
  label = 'Confirmar e Avançar',
  disabled = false,
  className,
  modoAdmin = false,
}: BotaoAvancarEtapaProps) {
  const [loading, setLoading] = useState(false)
  const [confirmarAberto, setConfirmarAberto] = useState(false)
  const router = useRouter()

  async function executarAvanco() {
    setLoading(true)
    const res = await avancarEtapa(processoId)
    setLoading(false)

    if (!res.success) {
      toast.error(res.error ?? 'Erro ao avançar etapa.')
      return
    }

    toast.success('Etapa confirmada.')
    router.push(`/processos/${processoId}/${proximaEtapaSlug}`)
  }

  function handleClick() {
    if (modoAdmin) {
      setConfirmarAberto(true)
    } else {
      executarAvanco()
    }
  }

  return (
    <>
      <Button
        onClick={handleClick}
        disabled={disabled || loading}
        className={className}
        style={{
          background: 'var(--primary)',
          color: '#fff',
        }}
      >
        {loading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <>
            {label}
            <ChevronRight className="w-4 h-4 ml-1" />
          </>
        )}
      </Button>

      <AlertDialog
        open={confirmarAberto}
        onOpenChange={setConfirmarAberto}
        titulo="Ação administrativa no fluxo"
        descricao="Você está avançando o fluxo deste processo como administrador, em nome do setor responsável. Esta ação será registrada em auditoria com sua identidade."
        labelConfirmar="Confirmar avanço"
        labelCancelar="Cancelar"
        variante="padrao"
        onConfirmar={executarAvanco}
      />
    </>
  )
}
