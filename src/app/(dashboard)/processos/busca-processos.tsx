'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Search, X } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'

export default function BuscaProcessos() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const [valor, setValor] = useState(searchParams.get('q') ?? '')
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    setValor(searchParams.get('q') ?? '')
  }, [searchParams])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const novo = e.target.value
    setValor(novo)
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      const params = new URLSearchParams(searchParams.toString())
      if (novo.trim()) {
        params.set('q', novo.trim())
      } else {
        params.delete('q')
      }
      params.set('page', '1')
      router.push(`/processos?${params.toString()}`)
    }, 300)
  }

  function handleLimpar() {
    setValor('')
    const params = new URLSearchParams(searchParams.toString())
    params.delete('q')
    params.set('page', '1')
    router.push(`/processos?${params.toString()}`)
  }

  return (
    <div className="relative flex-1 max-w-sm">
      <Search
        className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 pointer-events-none"
        style={{ color: 'var(--muted)' }}
        aria-hidden
      />
      <Input
        type="search"
        value={valor}
        onChange={handleChange}
        placeholder="Buscar por objeto ou numero..."
        className="pl-8 pr-8 h-9 text-sm"
        aria-label="Buscar processos"
      />
      {valor && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleLimpar}
          className="absolute right-1 top-1/2 -translate-y-1/2 h-6 w-6 p-0"
          aria-label="Limpar busca"
        >
          <X className="w-3 h-3" />
        </Button>
      )}
    </div>
  )
}
