'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Building2, Users, Bot, Settings2, PenTool, Lock } from 'lucide-react'

const NAV = [
  { href: '/configuracoes/organizacao',          label: 'Organização',            icon: Settings2  },
  { href: '/configuracoes/secretarias',           label: 'Secretarias',            icon: Building2  },
  { href: '/configuracoes/usuarios',              label: 'Usuários',               icon: Users      },
  { href: '/configuracoes/permissoes',            label: 'Permissões',             icon: Lock       },
  { href: '/configuracoes/ia',                    label: 'Inteligência Artificial', icon: Bot        },
  { href: '/configuracoes/assinatura-eletronica', label: 'Assinatura',             icon: PenTool    },
]

export default function SidebarConfiguracoes() {
  const pathname = usePathname()

  return (
    <nav className="w-52 shrink-0">
      <ul className="space-y-0.5">
        {NAV.map(({ href, label, icon: Icon }) => {
          const ativa = pathname === href || pathname.startsWith(href + '/')
          return (
            <li key={href}>
              <Link
                href={href}
                className="group relative flex items-center gap-2.5 px-3 py-2.5 rounded-[var(--r-md)] text-[13px] font-medium transition-all"
                style={ativa
                  ? {
                      background: 'var(--surface)',
                      color: 'var(--primary)',
                      fontWeight: 600,
                      boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                      border: '1px solid var(--hairline)',
                    }
                  : { color: 'var(--inkSoft)' }
                }
              >
                {ativa && (
                  <span
                    className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full"
                    style={{ background: 'var(--accent)' }}
                  />
                )}
                <Icon
                  className="w-4 h-4 shrink-0 ml-1 transition-colors"
                  style={{ color: ativa ? 'var(--accent)' : 'var(--muted)' }}
                />
                <span className="flex-1 truncate">{label}</span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
