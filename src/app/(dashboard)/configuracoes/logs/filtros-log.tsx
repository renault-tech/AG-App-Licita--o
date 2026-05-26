'use client'

import { useRouter, usePathname } from 'next/navigation'

interface Props {
  usuarios:    { id: string; nome_completo: string }[]
  de:          string
  ate:         string
  usuarioId?:  string
  categoria?:  string
}

const CATEGORIAS = [
  { value: '',            label: 'Todas as categorias' },
  { value: 'processo',    label: 'Processo'            },
  { value: 'documento',   label: 'Documento'           },
  { value: 'usuario',     label: 'Usuario'             },
  { value: 'organizacao', label: 'Organizacao'         },
]

export default function FiltrosLog({ usuarios, de, ate, usuarioId, categoria }: Props) {
  const router   = useRouter()
  const pathname = usePathname()

  function aplicar(overrides: Record<string, string>) {
    const params = new URLSearchParams()
    const vals = { de, ate, usuario_id: usuarioId ?? '', categoria: categoria ?? '', ...overrides }
    Object.entries(vals).forEach(([k, v]) => { if (v) params.set(k, v) })
    params.delete('page')
    router.push(`${pathname}?${params.toString()}`)
  }

  const inputClass = "text-sm px-3 py-1.5 rounded-[var(--r-md)] border"
  const inputStyle = { borderColor: 'var(--hairline)', background: 'var(--surface)', color: 'var(--ink)' }
  const labelStyle = { color: 'var(--muted)' }

  return (
    <div
      className="flex flex-wrap gap-3 p-4 rounded-[var(--r-lg)] border"
      style={{ background: 'var(--surfaceAlt)', borderColor: 'var(--hairline)' }}
    >
      <div className="flex flex-col gap-1">
        <label className="text-[11px] font-semibold uppercase tracking-wider" style={labelStyle}>
          De
        </label>
        <input
          type="date"
          defaultValue={de}
          onChange={e => aplicar({ de: e.target.value })}
          className={inputClass}
          style={inputStyle}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-[11px] font-semibold uppercase tracking-wider" style={labelStyle}>
          Ate
        </label>
        <input
          type="date"
          defaultValue={ate}
          onChange={e => aplicar({ ate: e.target.value })}
          className={inputClass}
          style={inputStyle}
        />
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-[11px] font-semibold uppercase tracking-wider" style={labelStyle}>
          Usuario
        </label>
        <select
          defaultValue={usuarioId ?? ''}
          onChange={e => aplicar({ usuario_id: e.target.value })}
          className={inputClass}
          style={inputStyle}
        >
          <option value="">Todos os usuarios</option>
          {usuarios.map(u => (
            <option key={u.id} value={u.id}>{(u as any).nome_completo}</option>
          ))}
        </select>
      </div>

      <div className="flex flex-col gap-1">
        <label className="text-[11px] font-semibold uppercase tracking-wider" style={labelStyle}>
          Categoria
        </label>
        <select
          defaultValue={categoria ?? ''}
          onChange={e => aplicar({ categoria: e.target.value })}
          className={inputClass}
          style={inputStyle}
        >
          {CATEGORIAS.map(c => (
            <option key={c.value} value={c.value}>{c.label}</option>
          ))}
        </select>
      </div>
    </div>
  )
}
