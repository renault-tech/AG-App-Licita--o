'use client'

import { useState } from 'react'
import { ChevronRight, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { avancarEtapa } from '@/lib/actions/tramitacao-fluxo'
import { useRouter } from 'next/navigation'

interface BotaoAvancarEtapaProps {
  processoId: string
  proximaEtapaSlug: string
  label?: string
  disabled?: boolean
  className?: string
}

export default function BotaoAvancarEtapa({
  processoId,
  proximaEtapaSlug,
  label = 'Confirmar e Avançar',
  disabled = false,
  className,
}: BotaoAvancarEtapaProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleAvancar() {
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

  return (
    <Button
      onClick={handleAvancar}
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
  )
}
