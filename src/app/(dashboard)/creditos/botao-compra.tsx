'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2, CreditCard, Banknote } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { criarSessaoStripe, criarPreferenciaMercadoPago, type PacoteId } from '@/lib/actions/creditos'

interface BotaoCompraProps {
  pacoteId:    PacoteId
  stripeAtivo: boolean
  mpAtivo:     boolean
}

export default function BotaoCompra({ pacoteId, stripeAtivo, mpAtivo }: BotaoCompraProps) {
  const [carregandoStripe, setCarregandoStripe] = useState(false)
  const [carregandoMP,     setCarregandoMP]     = useState(false)

  async function handleStripe() {
    setCarregandoStripe(true)
    const res = await criarSessaoStripe(pacoteId)
    if ('error' in res) {
      toast.error(res.error)
      setCarregandoStripe(false)
      return
    }
    window.location.href = res.url
  }

  async function handleMercadoPago() {
    setCarregandoMP(true)
    const res = await criarPreferenciaMercadoPago(pacoteId)
    if ('error' in res) {
      toast.error(res.error)
      setCarregandoMP(false)
      return
    }
    window.location.href = res.url
  }

  if (!stripeAtivo && !mpAtivo) {
    return (
      <button
        disabled
        className="w-full mt-1 h-8 text-xs font-medium rounded-lg border border-gray-300 text-gray-400 cursor-not-allowed bg-gray-50"
      >
        Em breve
      </button>
    )
  }

  return (
    <div className="space-y-1.5 mt-1">
      {stripeAtivo && (
        <Button
          size="sm"
          className="w-full h-8 text-xs gap-1.5 bg-purple-700 hover:bg-purple-800 text-white"
          onClick={handleStripe}
          disabled={carregandoStripe || carregandoMP}
        >
          {carregandoStripe
            ? <Loader2 className="w-3 h-3 animate-spin" />
            : <CreditCard className="w-3 h-3" />}
          Cartão / Pix
        </Button>
      )}
      {mpAtivo && (
        <Button
          size="sm"
          variant="outline"
          className="w-full h-8 text-xs gap-1.5 border-blue-300 text-blue-700 hover:bg-blue-50"
          onClick={handleMercadoPago}
          disabled={carregandoStripe || carregandoMP}
        >
          {carregandoMP
            ? <Loader2 className="w-3 h-3 animate-spin" />
            : <Banknote className="w-3 h-3" />}
          Mercado Pago
        </Button>
      )}
    </div>
  )
}
