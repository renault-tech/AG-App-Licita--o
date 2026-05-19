'use client'

import { useState, useTransition } from 'react'
import { concederCreditosAdmin } from '@/lib/actions/admin-master'
import { toast } from 'sonner'
import { Zap, Loader2 } from 'lucide-react'

interface Org {
  id: string
  nome: string
  municipio: string
  estado: string
}

interface Props {
  orgs: Org[]
}

export default function ConcederForm({ orgs }: Props) {
  const [orgId, setOrgId] = useState('')
  const [quantidade, setQuantidade] = useState('')
  const [motivo, setMotivo] = useState('')
  const [, startTransition] = useTransition()
  const [loading, setLoading] = useState(false)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const qtd = parseInt(quantidade, 10)
    if (!orgId) { toast.error('Selecione uma organizacao.'); return }
    if (!qtd || qtd <= 0) { toast.error('Informe uma quantidade valida.'); return }
    if (!motivo.trim()) { toast.error('Informe o motivo da concessao.'); return }

    setLoading(true)
    startTransition(async () => {
      const res = await concederCreditosAdmin(orgId, qtd, motivo)
      setLoading(false)
      if (!res.success) {
        toast.error(res.error ?? 'Erro ao conceder creditos.')
        return
      }
      toast.success(`${qtd} creditos concedidos com sucesso.`)
      setOrgId('')
      setQuantidade('')
      setMotivo('')
    })
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="border rounded-[var(--r-lg)] p-5 space-y-4"
      style={{ background: 'var(--surface)', borderColor: 'var(--hairline)' }}
    >
      <div className="flex items-center gap-2">
        <div
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{ background: '#FEF9C3' }}
        >
          <Zap className="w-4 h-4" style={{ color: '#854D0E' }} />
        </div>
        <div>
          <p className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>Conceder creditos manualmente</p>
          <p className="text-xs" style={{ color: 'var(--muted)' }}>Uso restrito ao admin da plataforma.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-1">
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--ink)' }}>
            Organizacao
          </label>
          <select
            value={orgId}
            onChange={e => setOrgId(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border text-sm"
            style={{
              borderColor: 'var(--hairline)',
              background: 'var(--canvas)',
              color: 'var(--ink)',
            }}
          >
            <option value="">Selecione...</option>
            {orgs.map(o => (
              <option key={o.id} value={o.id}>
                {o.nome} ({o.municipio}/{o.estado})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--ink)' }}>
            Quantidade de creditos
          </label>
          <input
            type="number"
            min="1"
            max="100000"
            value={quantidade}
            onChange={e => setQuantidade(e.target.value)}
            placeholder="Ex: 500"
            className="w-full px-3 py-2 rounded-lg border text-sm"
            style={{
              borderColor: 'var(--hairline)',
              background: 'var(--canvas)',
              color: 'var(--ink)',
            }}
          />
        </div>

        <div>
          <label className="block text-xs font-medium mb-1" style={{ color: 'var(--ink)' }}>
            Motivo
          </label>
          <input
            type="text"
            value={motivo}
            onChange={e => setMotivo(e.target.value)}
            placeholder="Ex: Contrato anual assinado"
            maxLength={200}
            className="w-full px-3 py-2 rounded-lg border text-sm"
            style={{
              borderColor: 'var(--hairline)',
              background: 'var(--canvas)',
              color: 'var(--ink)',
            }}
          />
        </div>
      </div>

      <div className="flex justify-end">
        <button
          type="submit"
          disabled={loading}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
          style={{ background: '#1A365D' }}
        >
          {loading
            ? <><Loader2 className="w-4 h-4 animate-spin" /> Concedendo...</>
            : <><Zap className="w-4 h-4" /> Conceder creditos</>
          }
        </button>
      </div>
    </form>
  )
}
