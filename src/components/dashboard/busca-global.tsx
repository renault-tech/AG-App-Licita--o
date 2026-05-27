'use client'

import { useState, useEffect, useRef } from 'react'
import { Search, Loader2 } from 'lucide-react'
import { useRouter } from 'next/navigation'
import { StatusPill } from '@/components/licita/status-pill'
import type { StatusProcesso } from '@/components/licita/status-pill'

interface ResultadoBusca {
  id: string
  numero_processo: string | null
  objeto: string
  modalidade: string
  status: string
}

const MODALIDADE_ABREV: Record<string, string> = {
  pregao_eletronico:   'Pregao Eletr.',
  pregao_presencial:   'Pregao Pres.',
  concorrencia:        'Concorrencia',
  dispensa:            'Dispensa',
  inexigibilidade:     'Inexigibilidade',
  concurso:            'Concurso',
  leilao:              'Leilao',
  dialogo_competitivo: 'Dialogo Comp.',
}

export function BuscaGlobal() {
  const [aberta, setAberta] = useState(false)
  const [termo, setTermo] = useState('')
  const [resultados, setResultados] = useState<ResultadoBusca[]>([])
  const [carregando, setCarregando] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (!termo.trim() || termo.length < 2) {
      setResultados([])
      return
    }
    if (timerRef.current) clearTimeout(timerRef.current)
    setCarregando(true)
    timerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/busca?q=${encodeURIComponent(termo)}`)
        if (res.ok) {
          const data = await res.json()
          setResultados(data)
        }
      } finally {
        setCarregando(false)
      }
    }, 300)
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [termo])

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setAberta(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Escape') {
      setAberta(false)
      setTermo('')
    }
    if (e.key === 'Enter' && termo.trim()) {
      router.push(`/processos?q=${encodeURIComponent(termo.trim())}`)
      setAberta(false)
      setTermo('')
    }
  }

  function navegar(id: string) {
    router.push(`/processos/${id}/dfd`)
    setAberta(false)
    setTermo('')
  }

  return (
    <div ref={containerRef} className="relative hidden lg:block">
      <div
        className="flex items-center gap-2 border px-3 py-1.5 rounded-[var(--r-md)] w-64 transition-all"
        style={{
          background: aberta ? 'var(--surface)' : 'var(--surfaceAlt)',
          borderColor: aberta ? 'var(--primary)' : 'var(--hairline)',
        }}
      >
        {carregando
          ? <Loader2 className="w-3.5 h-3.5 shrink-0 animate-spin" style={{ color: 'var(--muted)' }} />
          : <Search className="w-3.5 h-3.5 shrink-0" style={{ color: 'var(--muted)' }} />
        }
        <input
          ref={inputRef}
          value={termo}
          onChange={(e) => { setTermo(e.target.value); setAberta(true) }}
          onFocus={() => setAberta(true)}
          onKeyDown={handleKeyDown}
          placeholder="Buscar processo, edital..."
          className="flex-1 bg-transparent text-xs outline-none"
          style={{ color: 'var(--ink)' }}
        />
        {!termo && (
          <span className="text-[10px] px-1.5 py-0.5 rounded border" style={{ color: 'var(--mutedSoft)', borderColor: 'var(--hairline)', background: 'var(--surface)' }}>
            K
          </span>
        )}
      </div>

      {aberta && resultados.length > 0 && (
        <div
          className="absolute top-full mt-1 left-0 w-80 rounded-[var(--r-lg)] border z-50 overflow-hidden"
          style={{ background: 'var(--surface)', borderColor: 'var(--hairline)', boxShadow: '0 8px 24px rgba(0,0,0,0.1)' }}
        >
          {resultados.map((r) => (
            <button
              key={r.id}
              onClick={() => navegar(r.id)}
              className="w-full flex items-start gap-3 px-4 py-3 border-b text-left transition-colors hover:bg-[var(--surfaceAlt)] last:border-b-0"
              style={{ borderColor: 'var(--hairline)' }}
            >
              <div className="flex-1 min-w-0">
                <p className="text-[13px] font-medium truncate" style={{ color: 'var(--ink)' }}>
                  {r.numero_processo ? `${r.numero_processo} ` : ''}{r.objeto}
                </p>
                <p className="text-[11px] mt-0.5" style={{ color: 'var(--muted)' }}>
                  {MODALIDADE_ABREV[r.modalidade] ?? r.modalidade}
                </p>
              </div>
              <StatusPill status={r.status as StatusProcesso} size="sm" />
            </button>
          ))}
          <button
            onClick={() => {
              router.push(`/processos?q=${encodeURIComponent(termo.trim())}`)
              setAberta(false)
              setTermo('')
            }}
            className="w-full px-4 py-2.5 text-xs font-semibold text-left transition-colors hover:bg-[var(--surfaceAlt)]"
            style={{ color: 'var(--primary)' }}
          >
            Ver todos os resultados para &quot;{termo}&quot;
          </button>
        </div>
      )}
    </div>
  )
}
