'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { MessageSquare, Users, Building2, User } from 'lucide-react'
import type { CanalComNaoLidos, TipoCanal, UsuarioChat } from '@/types/chat'

interface SidebarCanaisProps {
  canais: CanalComNaoLidos[]
  usuarios?: UsuarioChat[]
}

const TIPO_ICON: Record<Exclude<TipoCanal, 'dm'>, React.ElementType> = {
  plataforma: MessageSquare,
  setor:      Building2,
  processo:   Users,
}

const TIPO_LABEL: Record<Exclude<TipoCanal, 'dm'>, string> = {
  plataforma: 'Geral',
  setor:      'Setores',
  processo:   'Processos',
}

const PAPEL_LABEL: Record<string, string> = {
  requisitante:      'Requisitante',
  setor_licitacao:   'Licitacoes',
  setor_compras:     'Compras',
  procurador:        'Procuradoria',
  gestor_publico:    'Gestor',
  admin_organizacao: 'Admin',
  admin_plataforma:  'Admin',
}

export function SidebarCanais({ canais, usuarios = [] }: SidebarCanaisProps) {
  const pathname = usePathname()

  const grupos: Record<Exclude<TipoCanal, 'dm'>, CanalComNaoLidos[]> = {
    plataforma: canais.filter(c => c.tipo === 'plataforma'),
    setor:      canais.filter(c => c.tipo === 'setor'),
    processo:   canais.filter(c => c.tipo === 'processo'),
  }

  const canaisDm = canais.filter(c => c.tipo === 'dm')

  return (
    <aside
      className="w-56 shrink-0 border-r h-full overflow-y-auto"
      style={{ background: 'var(--surfaceAlt)', borderColor: 'var(--hairline)' }}
    >
      <div className="px-4 py-4">
        <p className="text-[10px] font-bold tracking-[0.14em] uppercase mb-3" style={{ color: 'var(--muted)' }}>
          Mensagens
        </p>

        {(Object.entries(grupos) as [Exclude<TipoCanal, 'dm'>, CanalComNaoLidos[]][]).map(([tipo, lista]) => {
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

        {/* DMs ja iniciados */}
        {canaisDm.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-1.5 mb-1">
              <User className="w-3 h-3" style={{ color: 'var(--muted)' }} />
              <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
                Conversas
              </span>
            </div>
            <div className="space-y-0.5">
              {canaisDm.map(canal => {
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
        )}

        {/* Pessoas da organizacao */}
        {usuarios.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center gap-1.5 mb-1">
              <Users className="w-3 h-3" style={{ color: 'var(--muted)' }} />
              <span className="text-[10px] font-semibold uppercase tracking-wide" style={{ color: 'var(--muted)' }}>
                Pessoas
              </span>
            </div>
            <div className="space-y-0.5">
              {usuarios.map(u => {
                const href = `/chat/dm/${u.id}`
                const ativo = pathname.startsWith(href)
                return (
                  <Link
                    key={u.id}
                    href={href}
                    className="flex items-center gap-2 px-2.5 py-1.5 rounded-[var(--r-md)] text-[13px] transition-colors"
                    style={ativo
                      ? { background: 'var(--primaryWash)', color: 'var(--primary)', fontWeight: 600 }
                      : { color: 'var(--inkSoft)' }
                    }
                  >
                    <div
                      className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-bold shrink-0"
                      style={{ background: 'var(--primaryWash)', color: 'var(--primary)' }}
                    >
                      {(u.nome_completo ?? 'U').charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="truncate text-[12px] leading-tight">{u.nome_completo ?? 'Usuario'}</p>
                      <p className="text-[10px] leading-tight" style={{ color: 'var(--muted)' }}>
                        {PAPEL_LABEL[u.papel] ?? u.papel}
                      </p>
                    </div>
                  </Link>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </aside>
  )
}
