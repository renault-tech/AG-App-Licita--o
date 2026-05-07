'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { LogOut, Settings, FileText, LayoutDashboard, Users, Zap, ChevronDown, Menu, X, Building2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { useState } from 'react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import SinoNotificacoes from '@/components/layout/sino-notificacoes'
import type { Notificacao } from '@/lib/actions/notificacoes'

interface NavbarProps {
  user: User
  nomeUsuario?: string | null
  saldoCreditos?: number | null
  notificacoes?: Notificacao[]
  naoLidas?: number
}

const NAV_LINKS = [
  { href: '/dashboard', label: 'Painel', icon: LayoutDashboard },
  { href: '/processos', label: 'Processos', icon: FileText },
]

export default function Navbar({ user, nomeUsuario, saldoCreditos, notificacoes = [], naoLidas = 0 }: NavbarProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [menuMobileAberto, setMenuMobileAberto] = useState(false)

  async function handleSair() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const iniciais = nomeUsuario
    ? nomeUsuario.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : user.email?.slice(0, 2).toUpperCase() ?? 'US'

  const nomeExibido = nomeUsuario || user.email || 'Usuário'
  const emailCurto = user.email ?? ''

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="flex items-center justify-between h-14">

          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2 shrink-0">
            <div className="w-7 h-7 rounded-md bg-blue-700 flex items-center justify-center">
              <span className="text-white text-xs font-bold">LI</span>
            </div>
            <span className="text-base font-bold text-blue-900">LicitaIA</span>
            <span className="hidden sm:inline text-xs text-blue-500 bg-blue-50 px-1.5 py-0.5 rounded font-medium">
              14.133/21
            </span>
          </Link>

          {/* Navegacao desktop */}
          <nav className="hidden md:flex items-center gap-0.5 mx-6">
            {NAV_LINKS.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-md transition-colors ${
                  isActive(href)
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {label}
              </Link>
            ))}
          </nav>

          {/* Direita: creditos + avatar */}
          <div className="flex items-center gap-2">

            {/* Creditos - desktop */}
            {saldoCreditos !== null && saldoCreditos !== undefined && (
              <Link
                href="/creditos"
                className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-purple-200 bg-purple-50 text-purple-700 text-xs font-semibold hover:bg-purple-100 transition-colors"
              >
                <Zap className="w-3 h-3" />
                {saldoCreditos} créditos
              </Link>
            )}

            {/* Sino de notificacoes */}
            <SinoNotificacoes notificacoes={notificacoes} naoLidas={naoLidas} />

            {/* Menu usuario */}
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-1.5 rounded-full outline-none group">
                <Avatar className="h-7 w-7">
                  <AvatarFallback className="bg-blue-600 text-white text-xs font-semibold">
                    {iniciais}
                  </AvatarFallback>
                </Avatar>
                <ChevronDown className="w-3 h-3 text-gray-400 group-hover:text-gray-600 hidden sm:block" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <div className="px-3 py-2 border-b">
                  <p className="text-sm font-medium text-gray-900 truncate">{nomeExibido}</p>
                  <p className="text-xs text-gray-500 truncate">{emailCurto}</p>
                </div>
                {saldoCreditos !== null && saldoCreditos !== undefined && (
                  <div className="px-3 py-2 border-b">
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-500">Saldo de IA</span>
                      <span className="text-xs font-semibold text-purple-700 flex items-center gap-1">
                        <Zap className="w-3 h-3" /> {saldoCreditos} créditos
                      </span>
                    </div>
                  </div>
                )}
                <DropdownMenuItem onSelect={() => router.push('/configuracoes/organizacao')} className="gap-2 cursor-pointer text-sm">
                  <Settings className="w-4 h-4" />
                  Configuracoes
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => router.push('/configuracoes/usuarios')} className="gap-2 cursor-pointer text-sm">
                  <Users className="w-4 h-4" />
                  Usuarios
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={() => router.push('/configuracoes/secretarias')} className="gap-2 cursor-pointer text-sm">
                  <Building2 className="w-4 h-4" />
                  Secretarias
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSair} className="gap-2 text-red-600 cursor-pointer text-sm">
                  <LogOut className="w-4 h-4" />
                  Sair da conta
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Botao menu mobile */}
            <button
              className="md:hidden p-1.5 rounded-md text-gray-500 hover:bg-gray-100"
              onClick={() => setMenuMobileAberto(!menuMobileAberto)}
            >
              {menuMobileAberto ? <X className="w-4 h-4" /> : <Menu className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Menu mobile */}
        {menuMobileAberto && (
          <div className="md:hidden border-t border-gray-100 py-2">
            {NAV_LINKS.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMenuMobileAberto(false)}
                className={`flex items-center gap-2 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  isActive(href)
                    ? 'bg-blue-50 text-blue-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </header>
  )
}
