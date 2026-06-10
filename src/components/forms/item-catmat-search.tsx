'use client'

import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Package, Wrench, Search, Loader2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import type { ItemCatmat } from '@/lib/catmat/catmat-client'

interface ItemCatmatSearchProps {
  value: string
  onChange: (valor: string) => void
  onSelectItem: (item: ItemCatmat) => void
  placeholder?: string
  error?: boolean
  disabled?: boolean
}

export function ItemCatmatSearch({
  value,
  onChange,
  onSelectItem,
  placeholder = 'Buscar no catalogo CATMAT/CATSER...',
  error,
  disabled,
}: ItemCatmatSearchProps) {
  const [aberto, setAberto] = useState(false)
  const [buscando, setBuscando] = useState(false)
  const [resultados, setResultados] = useState<ItemCatmat[]>([])
  const wrapperRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
        setAberto(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const buscar = useCallback(async (termo: string) => {
    if (termo.trim().length < 3) {
      setResultados([])
      setBuscando(false)
      return
    }
    setBuscando(true)
    try {
      const res = await fetch(`/api/catmat/search?q=${encodeURIComponent(termo)}`)
      if (res.ok) {
        const data = await res.json()
        setResultados(data.itens ?? [])
      }
    } catch {
      setResultados([])
    } finally {
      setBuscando(false)
    }
  }, [])

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const novo = e.target.value
    onChange(novo)
    setAberto(true)

    if (debounceRef.current) clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(() => buscar(novo), 400)
  }

  return (
    <div className="relative w-full" ref={wrapperRef}>
      <div className="relative">
        {buscando ? (
          <Loader2 className="absolute left-3 top-2.5 h-4 w-4 text-gray-400 animate-spin" />
        ) : (
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
        )}
        <Input
          value={value}
          onChange={handleChange}
          onFocus={() => value.length >= 3 && setAberto(true)}
          placeholder={placeholder}
          disabled={disabled}
          autoComplete="off"
          className={`pl-9 ${error ? 'border-red-500 focus-visible:ring-red-500' : ''}`}
        />
      </div>

      {aberto && value.length >= 3 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg max-h-72 overflow-auto">
          {buscando ? (
            <div className="p-4 text-sm text-gray-500 text-center">Consultando catalogo federal...</div>
          ) : resultados.length === 0 ? (
            <div className="p-4 text-sm text-gray-500 text-center">
              Nenhum item encontrado no CATMAT/CATSER. Continue digitando a descricao do item.
            </div>
          ) : (
            <div className="py-1">
              <div className="px-3 py-2 text-xs font-semibold text-gray-500 bg-gray-50 uppercase tracking-wider">
                Catalogo CATMAT/CATSER Federal
              </div>
              {resultados.map((item) => (
                <button
                  key={`${item.tipo}-${item.codigo}`}
                  type="button"
                  onClick={() => {
                    onChange(item.descricao)
                    onSelectItem(item)
                    setAberto(false)
                  }}
                  className="w-full text-left px-4 py-3 hover:bg-blue-50 focus:bg-blue-50 focus:outline-none transition-colors border-b border-gray-100 last:border-0 flex items-start gap-3"
                >
                  {item.tipo === 'material' ? (
                    <Package className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />
                  ) : (
                    <Wrench className="w-4 h-4 text-purple-500 mt-0.5 shrink-0" />
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 leading-snug">{item.descricao}</p>
                    <div className="flex items-center gap-2 mt-1 flex-wrap">
                      <span className="text-xs font-mono bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">
                        {item.codigo}
                      </span>
                      <span className="text-xs text-gray-500">{item.unidade}</span>
                      <span className={`text-xs px-1.5 py-0.5 rounded ${
                        item.tipo === 'material'
                          ? 'bg-blue-50 text-blue-600'
                          : 'bg-purple-50 text-purple-600'
                      }`}>
                        {item.tipo === 'material' ? 'Material' : 'Servico'}
                      </span>
                    </div>
                    {item.tipo === 'material' && item.pdmDescricao && (
                      <p className="text-xs text-gray-400 mt-0.5 truncate">PDM: {item.pdmDescricao}</p>
                    )}
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
