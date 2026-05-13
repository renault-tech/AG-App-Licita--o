'use client'

import Link from 'next/link'
import { useRouter, usePathname } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { LogOut, Settings, FileText, LayoutDashboard, Users, Zap, ChevronDown, Menu, X, Building2, TrendingUp, ShieldCheck, Bell, Share2, Scale } from 'lucide-react'
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
  isAdminPlataforma?: boolean
  papel?: string | null
}

const NAV_LINKS = [
  { href: '/dashboard', label: 'Painel', icon: LayoutDashboard },
  { href: '/processos', label: 'Processos', icon: FileText },
  { href: '/processos/aviso-compra-conjunta/novo', label: 'Compra Conjunta', icon: Share2 },
]

export default function Navbar({
  user,
  nomeUsuario,
  saldoCreditos,
  notificacoes = [],
  naoLidas = 0,
  isAdminPlataforma = false,
  papel = null,
}: NavbarProps) {
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

  const nomeExibido = nomeUsuario || user.email || 'Usuario'
  const emailCurto = user.email ?? ''

  function isActive(href: string) {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  return (
    <header
      className="bg-white border-b border-[#E3E2E6] sticky top-0 z-40"
      style={{ boxShadow: '0 1px 6px rgba(26,54,93,0.06)' }}
    >
      <div className="max-w-[1400px] mx-auto px-6 md:px-8 lg:px-12">
        <div className="flex items-center justify-between h-[72px]">

          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-3 shrink-0">
            <div className="w-10 h-10 rounded-lg bg-[#1A365D] flex items-center justify-center shrink-0">
              <span className="text-white text-sm font-bold tracking-tight">LI</span>
            </div>
            <div className="flex flex-col">
              <span
                className="text-lg font-bold text-[#1A365D] tracking-tight leading-tight"
                style={{ fontFamily: 'var(--font-heading)' }}
              >
                LicitaIA
              </span>
              <span className="hidden sm:inline text-[11px] font-semibold text-[#B7935E] tracking-wide leading-none">
                Lei 14.133/21
              </span>
            </div>
          </Link>

          {/* Navegacao desktop — full height com underline dourado no item ativo */}
          <nav className="hidden md:flex h-[72px] items-stretch mx-8 gap-1">
            {NAV_LINKS.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className={`relative inline-flex items-center gap-2 px-4 text-sm font-semibold tracking-wide transition-colors border-b-2 ${
                  isActive(href)
                    ? 'border-[#B7935E] text-[#1A365D]'
                    : 'border-transparent text-[#43474E] hover:text-[#1A365D] hover:border-[#B7935E]/30'
                }`}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            ))}
            {['procurador', 'admin_organizacao', 'admin_plataforma'].includes(papel ?? '') && (
              <Link
                href="/procuradoria"
                className={`relative inline-flex items-center gap-2 px-4 text-sm font-semibold tracking-wide transition-colors border-b-2 ${
                  isActive('/procuradoria')
                    ? 'border-[#B7935E] text-[#1A365D]'
                    : 'border-transparent text-[#43474E] hover:text-[#1A365D] hover:border-[#B7935E]/30'
                }`}
              >
                <Scale className="w-4 h-4" />
                Procuradoria
              </Link>
            )}
            {isAdminPlataforma && (
              <Link
                href="/admin/painel"
                className={`relative inline-flex items-center gap-2 px-4 text-sm font-semibold tracking-wide transition-colors border-b-2 ${
                  isActive('/admin')
                    ? 'border-[#B7935E] text-[#1A365D]'
                    : 'border-transparent text-[#43474E] hover:text-[#1A365D] hover:border-[#B7935E]/30'
                }`}
              >
                <ShieldCheck className="w-4 h-4" />
                Admin
              </Link>
            )}
          </nav>

          {/* Direita */}
          <div className="flex items-center gap-4">

            {/* Creditos — pill dourado */}
            {saldoCreditos !== null && saldoCreditos !== undefined && (
              <Link
                href="/creditos"
                className="hidden sm:flex items-center gap-2 px-4 py-2 rounded-full border border-[#B7935E]/40 bg-[#B7935E]/5 text-[#B7935E] text-sm font-semibold hover:bg-[#B7935E]/10 transition-colors"
              >
                <Zap className="w-3.5 h-3.5" />
                {saldoCreditos} creditos
              </Link>
            )}

            {/* Sino de notificacoes */}
            <SinoNotificacoes notificacoes={notificacoes} naoLidas={naoLidas} />

            {/* Menu usuario */}
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-2 rounded-full outline-none group">
                <Avatar className="h-9 w-9">
                  <AvatarFallback
                    className="text-white text-xs font-semibold"
                    style={{ backgroundColor: '#1A365D' }}
                  >
                    {iniciais}
                  </AvatarFallback>
                </Avatar>
                <ChevronDown className="w-3.5 h-3.5 text-[#74777F] group-hover:text-[#1A365D] hidden sm:block transition-colors" />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="w-64 border-[#E3E2E6]"
                style={{ boxShadow: '0 12px 32px rgba(26,54,93,0.10)' }}
              >
                <div className="px-4 py-3 border-b border-[#E3E2E6]">
                  <p className="text-[15px] font-semibold text-[#1A365D] truncate">{nomeExibido}</p>
                  <p className="text-sm text-[#74777F] truncate">{emailCurto}</p>
                </div>
                {saldoCreditos !== null && saldoCreditos !== undefined && (
                  <div className="px-4 py-2.5 border-b border-[#E3E2E6]">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-[#74777F]">Saldo de IA</span>
                      <span className="text-sm font-semibold text-[#B7935E] flex items-center gap-1">
                        <Zap className="w-3.5 h-3.5" /> {saldoCreditos} creditos
                      </span>
                    </div>
                  </div>
                )}
                <DropdownMenuItem onClick={() => router.push('/configuracoes/organizacao')} className="gap-2.5 cursor-pointer text-[15px] text-[#43474E] py-2.5">
                  <Settings className="w-4 h-4" />
                  Configuracoes
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push('/configuracoes/usuarios')} className="gap-2.5 cursor-pointer text-[15px] text-[#43474E] py-2.5">
                  <Users className="w-4 h-4" />
                  Usuarios
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push('/configuracoes/secretarias')} className="gap-2.5 cursor-pointer text-[15px] text-[#43474E] py-2.5">
                  <Building2 className="w-4 h-4" />
                  Secretarias
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push('/configuracoes/ia')} className="gap-2.5 cursor-pointer text-[15px] text-[#43474E] py-2.5">
                  <Zap className="w-4 h-4" />
                  Inteligencia Artificial
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => router.push('/creditos')} className="gap-2.5 cursor-pointer text-[15px] text-[#43474E] py-2.5">
                  <TrendingUp className="w-4 h-4" />
                  Creditos de IA
                </DropdownMenuItem>
                {isAdminPlataforma && (
                  <>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => router.push('/admin/painel')}
                      className="gap-2.5 cursor-pointer text-[15px] font-medium text-[#1A365D] py-2.5"
                    >
                      <ShieldCheck className="w-4 h-4" />
                      Administracao da Plataforma
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleSair}
                  className="gap-2.5 cursor-pointer text-[15px] text-[#BA1A1A] py-2.5"
                >
                  <LogOut className="w-4 h-4" />
                  Sair da conta
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>

            {/* Botao menu mobile */}
            <button
              className="md:hidden p-2 rounded-lg text-[#43474E] hover:bg-[#F4F3F7] transition-colors"
              onClick={() => setMenuMobileAberto(!menuMobileAberto)}
            >
              {menuMobileAberto ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Menu mobile */}
        {menuMobileAberto && (
          <div className="md:hidden border-t border-[#E3E2E6] py-3">
            {NAV_LINKS.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMenuMobileAberto(false)}
                className={`flex items-center gap-3 px-4 py-3 text-[15px] font-semibold rounded-lg transition-colors ${
                  isActive(href)
                    ? 'bg-[#1A365D]/5 text-[#1A365D] border-l-2 border-[#B7935E]'
                    : 'text-[#43474E] hover:bg-[#F4F3F7] hover:text-[#1A365D]'
                }`}
              >
                <Icon className="w-5 h-5" />
                {label}
              </Link>
            ))}
            {['procurador', 'admin_organizacao', 'admin_plataforma'].includes(papel ?? '') && (
              <Link
                href="/procuradoria"
                onClick={() => setMenuMobileAberto(false)}
                className={`flex items-center gap-3 px-4 py-3 text-[15px] font-semibold rounded-lg transition-colors ${
                  isActive('/procuradoria')
                    ? 'bg-[#1A365D]/5 text-[#1A365D] border-l-2 border-[#B7935E]'
                    : 'text-[#43474E] hover:bg-[#F4F3F7] hover:text-[#1A365D]'
                }`}
              >
                <Scale className="w-5 h-5" />
                Procuradoria
              </Link>
            )}
            {isAdminPlataforma && (
              <Link
                href="/admin/painel"
                onClick={() => setMenuMobileAberto(false)}
                className="flex items-center gap-3 px-4 py-3 text-[15px] font-semibold rounded-lg transition-colors text-[#43474E] hover:bg-[#F4F3F7] hover:text-[#1A365D]"
              >
                <ShieldCheck className="w-5 h-5" />
                Admin
              </Link>
            )}
          </div>
        )}
      </div>
    </header>
  )
}