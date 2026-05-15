'use client'

import React, { useState, useEffect, useRef } from 'react'
import { Building2, Search, CheckCircle2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { PREFEITURAS_DB, PrefeituraData } from '@/lib/data/prefeituras'

interface AutocompletePrefeituraProps {
  value: string
  onChange: (value: string) => void
  onSelectPrefeitura: (prefeitura: PrefeituraData) => void
  placeholder?: string
  error?: boolean
}

export function AutocompletePrefeitura({
  value,
  onChange,
  onSelectPrefeitura,
  placeholder = 'Digite o nome da prefeitura...',
  error
}: AutocompletePrefeituraProps) {
  const [open, setOpen] = useState(false)
  const [busca, setBusca] = useState(value)
  const wrapperRef = useRef<HTMLDivElement>(null)

  // Sincroniza o prop value com o input local se mudar externamente
  useEffect(() => {
    setBusca(value)
  }, [value])

  // Fecha o dropdown ao clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const filtered = PREFEITURAS_DB.filter(p => 
    p.nome.toLowerCase().includes(busca.toLowerCase()) || 
    p.municipio.toLowerCase().includes(busca.toLowerCase())
  ).slice(0, 10) // Mostrar no máximo 10 resultados

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <div className="relative">
        <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
        <Input
          value={busca}
          onChange={(e) => {
            setBusca(e.target.value)
            onChange(e.target.value)
            setOpen(true)
          }}
          onFocus={() => setOpen(true)}
          placeholder={placeholder}
          className={`pl-9 ${error ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
          autoComplete="off"
        />
      </div>

      {open && busca.length >= 2 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-[300px] overflow-auto">
          {filtered.length === 0 ? (
            <div className="p-4 text-sm text-gray-500 text-center">
              Nenhuma prefeitura encontrada. Voce pode continuar digitando manualmente.
            </div>
          ) : (
            <div className="py-1">
              <div className="px-3 py-2 text-xs font-semibold text-gray-500 bg-gray-50 uppercase tracking-wider">
                Sugestoes da Base de Dados
              </div>
              {filtered.map((item, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setBusca(item.nome)
                    onChange(item.nome)
                    onSelectPrefeitura(item)
                    setOpen(false)
                  }}
                  className="w-full text-left px-4 py-3 hover:bg-blue-50 focus:bg-blue-50 focus:outline-none transition-colors border-b border-gray-100 last:border-0 flex items-start gap-3"
                >
                  <Building2 className="w-5 h-5 text-gray-400 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {item.nome}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="text-xs text-blue-700 font-mono bg-blue-100 px-1.5 py-0.5 rounded">
                        {item.cnpj}
                      </span>
                      <span className="text-xs text-gray-500 truncate">
                        {item.municipio} - {item.estado}
                      </span>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
