'use client'

import { useState, useTransition } from 'react'
import { TICKER_CATEGORIAS, type TickerCategoriaId } from '@/lib/ticker/categorias'
import { salvarPreferenciasTicker } from '@/lib/actions/ticker'
import { Button } from '@/components/ui/button'

export default function FaixaForm({
  categorias,
}: {
  categorias: Record<TickerCategoriaId, boolean>
}) {
  const [estado, setEstado] = useState(categorias)
  const [isPending, startTransition] = useTransition()
  const [msg, setMsg] = useState<string | null>(null)

  function toggle(id: TickerCategoriaId) {
    setEstado(prev => ({ ...prev, [id]: !prev[id] }))
  }

  function salvar() {
    startTransition(async () => {
      const res = await salvarPreferenciasTicker(estado)
      setMsg(res.success ? 'Preferências salvas com sucesso.' : (res.error ?? 'Erro ao salvar.'))
      setTimeout(() => setMsg(null), 3000)
    })
  }

  return (
    <div className="space-y-3">
      {TICKER_CATEGORIAS.map(cat => {
        const ativo = estado[cat.id] ?? true
        return (
          <div
            key={cat.id}
            className="flex items-center justify-between p-4 rounded-[var(--r-md)] border cursor-pointer transition-colors"
            style={{
              background: ativo ? 'var(--surface)' : 'var(--surfaceAlt)',
              borderColor: ativo ? 'var(--hairline)' : 'var(--hairlineSoft)',
            }}
            onClick={() => toggle(cat.id)}
          >
            <div className="flex items-center gap-3">
              <span className="text-lg" style={{ lineHeight: 1 }}>{cat.icon}</span>
              <div>
                <div className="text-[13.5px] font-semibold" style={{ color: ativo ? 'var(--ink)' : 'var(--muted)' }}>
                  {cat.label}
                </div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{cat.desc}</div>
              </div>
            </div>
            <div
              className="w-10 rounded-full flex items-center transition-all shrink-0 ml-4"
              style={{
                background: ativo ? 'var(--accent)' : 'var(--hairline)',
                padding: '2px',
                height: '22px',
              }}
            >
              <div
                className="w-4 h-4 rounded-full transition-all"
                style={{
                  background: 'white',
                  transform: ativo ? 'translateX(100%)' : 'translateX(0)',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
                }}
              />
            </div>
          </div>
        )
      })}

      <div className="flex items-center gap-3 pt-2">
        <Button
          onClick={salvar}
          disabled={isPending}
          className="h-9 px-5 text-sm font-semibold"
          style={{ background: 'var(--primary)', color: 'var(--primaryInk)' }}
        >
          {isPending ? 'Salvando...' : 'Salvar preferências'}
        </Button>
        {msg && (
          <span className="text-sm" style={{ color: msg.includes('sucesso') ? 'var(--success)' : 'var(--danger)' }}>
            {msg}
          </span>
        )}
      </div>
    </div>
  )
}
