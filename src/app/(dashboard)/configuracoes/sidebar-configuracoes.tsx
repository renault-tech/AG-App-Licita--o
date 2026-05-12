'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Building2, Users, Bot, Settings2, PenTool, Lock } from 'lucide-react'

const NAV = [
  { href: '/configuracoes/organizacao',          label: 'Organizacao',            icon: Settings2  },
  { href: '/configuracoes/secretarias',           label: 'Secretarias',            icon: Building2  },
  { href: '/configuracoes/usuarios',              label: 'Usuarios',               icon: Users      },
  { href: '/configuracoes/permissoes',            label: 'Permissoes',             icon: Lock       },
  { href: '/configuracoes/ia',                    label: 'Inteligencia Artificial', icon: Bot        },
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
                className={`group relative flex items-center gap-2.5 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all ${
                  ativa
                    ? 'bg-white text-[#1A365D] font-semibold'
                    : 'text-[#43474E] hover:bg-[#F4F3F7] hover:text-[#1A365D]'
                }`}
                style={ativa ? { boxShadow: '0 1px 4px rgba(26,54,93,0.08)', border: '1px solid #E3E2E6' } : undefined}
              >
                {ativa && (
                  <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-[#B7935E]" />
                )}
                <Icon
                  className={`w-4 h-4 shrink-0 ml-1 transition-colors ${
                    ativa ? 'text-[#B7935E]' : 'text-[#74777F] group-hover:text-[#1A365D]'
                  }`}
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