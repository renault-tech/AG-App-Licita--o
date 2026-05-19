'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FlaskConical, X, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface DemoBannerProps {
  papelSimulado: string
  onSair: () => Promise<void>
}

export function DemoBanner({ papelSimulado, onSair }: DemoBannerProps) {
  const router = useRouter()
  const [saindo, setSaindo] = useState(false)

  async function handleSair() {
    setSaindo(true)
    await onSair()
    router.push('/admin/painel-master')
    router.refresh()
  }

  return (
    <div
      className="fixed top-0 left-0 right-0 z-[100] flex items-center justify-between px-4 py-2"
      style={{ background: '#EA580C', color: 'white', minHeight: 44 }}
      role="alert"
      aria-live="polite"
    >
      <div className="flex items-center gap-2 text-sm font-bold">
        <FlaskConical className="w-4 h-4" aria-hidden />
        MODO DEMO ATIVO
        <span className="font-normal opacity-80 hidden sm:inline">
          — simulando perfil: {papelSimulado}
        </span>
      </div>
      <Button
        size="sm"
        variant="ghost"
        className="text-white hover:text-white hover:bg-orange-700 h-7 px-2 gap-1.5"
        onClick={handleSair}
        disabled={saindo}
        aria-label="Sair do modo demo"
      >
        {saindo ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <X className="w-3.5 h-3.5" />}
        <span className="text-xs">Sair do Demo</span>
      </Button>
    </div>
  )
}
