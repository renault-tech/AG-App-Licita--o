'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MessageSquare, Users, Building2 } from 'lucide-react'
import type { CanalComNaoLidos, TipoCanal } from '@/types/chat'

interface SidebarCanaisProps {
  canais: CanalComNaoLidos[]
}

const TIPO_ICON: Record<TipoCanal, React.ElementType> = {
  plataforma: MessageSquare,
  setor:      Building2,
  processo:   Users,
}

const TIPO_LABEL: Record<TipoCanal, string> = {
  plataforma: 'Geral',
  setor:      'Setores',
  processo:   'Processos',
}

export function SidebarCanais({ canais }: SidebarCanaisProps) {
  const pathname = usePathname()

  const grupos: Record<TipoCanal, CanalComNaoLidos[]> = {
    plataforma: canais.filter(c => c.tipo === 'plataforma'),
    setor:      canais.filter(c => c.tipo === 'setor'),
    processo:   canais.filter(c => c.tipo === 'processo'),
  }

  return (
    <aside
      className="w-56 shrink-0 border-r h-full overflow-y-auto"
      style={{ background: 'var(--surfaceAlt)', borderColor: 'var(--hairline)' }}
    >
      <div className="px-4 py-4">
        <p className="text-[10px] font-bold tracking-[0.14em] uppercase mb-3" style={{ color: 'var(--muted)' }}>
          Mensagens
        </p>

        {(Object.entries(grupos) as [TipoCanal, CanalComNaoLidos[]][]).map(([tipo, lista]) => {
          if (!lista.length) return null
          const Icon = TIPO_ICON[tipo]

          return (
            <div key={tipo} className="mb-4">
              <div className="flex items-center gap-1.5 mb-1">
                <Icon className="w-3 h-3" style={{ color: 'var(--muted)' }} />
                <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
                  {TIPO_LABEL[tipo]}
                </span>
              </div>

              <div className="space-y-0.5">
                {lista.map(canal => {
                  const href = `/chat/${canal.id}`
                  const ativo = pathname === href

                  return (
                    <Link
                      key={canal.id}
                      href={href}
                      className="flex items-center justify-between px-2.5 py-1.5 rounded-[var(--r-md)] text-[13px] transition-colors"
                      style={ativo
                        ? { background: 'var(--primaryWash)', color: 'var(--primary)', fontWeight: 600 }
                        : { color: 'var(--inkSoft)' }
                      }
                    >
                      <span className="truncate">{canal.nome}</span>
                      {canal.nao_lidos > 0 && (
                        <span
                          className="text-[10px] font-bold px-1.5 py-px rounded-full ml-1.5 shrink-0"
                          style={{ background: 'var(--danger)', color: '#fff' }}
                        >
                          {canal.nao_lidos > 99 ? '99+' : canal.nao_lidos}
                        </span>
                      )}
                    </Link>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </aside>
  )
}
