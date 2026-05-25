'use client'

import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { Bell, Star, Search, LogOut, Settings, Users, Building2, Zap, TrendingUp, ShieldCheck, ChevronDown, Menu, X } from 'lucide-react'
import { useState } from 'react'
import { useTheme, THEMES } from '@/lib/theme/provider'
import { LogoPrefeitura } from '@/components/licita/logo-prefeitura'
import { ThemeSwitcherPanel } from '@/components/licita/theme-switcher'
import { createClient } from '@/lib/supabase/client'
import SinoNotificacoes from '@/components/layout/sino-notificacoes'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import type { Notificacao } from '@/lib/actions/notificacoes'
import { LABEL_PAPEL, COR_PAPEL } from '@/lib/permissions'
import type { PapelUsuario } from '@/types/database'
import { TickerStrip } from '@/components/layout/ticker-strip'
import { TICKER_CATEGORIAS_DEFAULT, type TickerCategoriaId, type TickerEvento } from '@/lib/ticker/categorias'

interface AppHeaderProps {
  orgNome: string
  orgCnpj: string
  nomeUsuario: string | null
  cargo: string | null
  saldoCreditos: number | null
  notificacoes?: Notificacao[]
  naoLidas?: number
  papel?: string | null
  isAdminPlataforma?: boolean
  brasaoUrl?: string | null
  usuarioId?: string
  eventosTicker?: TickerEvento[]
  tickerCategorias?: Record<TickerCategoriaId, boolean>
}

const TABS = [
  { href: '/dashboard',     label: 'Painel',       match: (p: string) => p === '/dashboard' },
  { href: '/processos',     label: 'Processos',    match: (p: string) => p.startsWith('/processos') },
  { href: '/creditos',      label: 'Creditos',     match: (p: string) => p.startsWith('/creditos') },
  { href: '/configuracoes', label: 'Configuracoes', match: (p: string) => p.startsWith('/configuracoes') || p.startsWith('/admin') },
]

const TABS_PROC = { href: '/procuradoria', label: 'Procuradoria', match: (p: string) => p.startsWith('/procuradoria') }

export function AppHeader({
  orgNome,
  orgCnpj,
  nomeUsuario,
  cargo,
  saldoCreditos,
  notificacoes = [],
  naoLidas = 0,
  papel = null,
  isAdminPlataforma = false,
  brasaoUrl = null,
  usuarioId,
  eventosTicker = [],
  tickerCategorias = TICKER_CATEGORIAS_DEFAULT,
}: AppHeaderProps) {
  const router = useRouter()
  const pathname = usePathname()
  const { theme } = useTheme()
  const t = THEMES[theme]
  const [themePanelOpen, setThemePanelOpen] = useState(false)
  const [menuMobile, setMenuMobile] = useState(false)

  const iniciais = nomeUsuario
    ? nomeUsuario.split(' ').map(n => n[0]).slice(0, 2).join('').toUpperCase()
    : '??'

  const mostrarProcuradoria = ['procurador', 'admin_organizacao', 'admin_plataforma'].includes(papel ?? '')

  const todosLinks = [
    ...TABS,
    ...(mostrarProcuradoria ? [TABS_PROC] : []),
  ]

  async function handleSair() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  function formatarCnpj(cnpj: string) {
    const nums = cnpj.replace(/\D/g, '')
    if (nums.length === 14) {
      return `${nums.slice(0,2)}.${nums.slice(2,5)}.${nums.slice(5,8)}/${nums.slice(8,12)}-${nums.slice(12)}`
    }
    return cnpj
  }

  return (
    <header
      className="sticky top-0 z-40 border-b border-hairline"
      style={{ background: 'color-mix(in srgb, var(--surface) 96%, transparent)' }}
    >
      {/* Linha 1: brasao + nome completo + utilitarios */}
      <div className="flex items-center gap-3.5 px-6 md:px-9 py-3 border-b border-hairlineSoft">
        <LogoPrefeitura brasaoUrl={brasaoUrl} theme={theme} height={40} />

        <div className="flex-1 min-w-0 leading-tight">
          <div className="text-[9.5px] text-muted font-bold tracking-[0.16em] uppercase hidden sm:block">
            Republica Federativa do Brasil
          </div>
          <div className="font-heading text-base font-semibold text-ink tracking-[-0.01em] truncate" style={{ fontFamily: 'var(--font-heading)' }}>
            {orgNome}
          </div>
          {orgCnpj && (
            <div className="text-[10.5px] text-muted font-medium mt-px hidden sm:block">
              CNPJ {formatarCnpj(orgCnpj)}{cargo ? ` · ${cargo}` : ''}
            </div>
          )}
        </div>

        {/* Busca — desktop */}
        <div className="hidden lg:flex items-center gap-2 bg-surfaceAlt border border-hairline px-3 py-1.5 rounded-[var(--r-md)] w-56 text-muted cursor-pointer hover:border-hairline/80 transition-colors">
          <Search className="w-3.5 h-3.5 shrink-0" />
          <span className="text-xs flex-1">Buscar processo, edital...</span>
          <span className="text-[10px] text-mutedSoft px-1.5 py-0.5 rounded border border-hairline bg-surface">
            ⌘K
          </span>
        </div>

        {/* Creditos */}
        {saldoCreditos !== null && saldoCreditos !== undefined && (
          <Link
            href="/creditos"
            className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-[var(--r-pill)] border text-xs font-semibold transition-colors"
            style={{ background: 'var(--accentWash)', color: 'var(--accent)', borderColor: 'var(--accentSoft)' }}
          >
            <Star className="w-3 h-3 fill-current" />
            {saldoCreditos} creditos
          </Link>
        )}

        {/* Sino */}
        <SinoNotificacoes notificacoes={notificacoes} naoLidas={naoLidas} usuarioId={usuarioId} />

        {/* Seletor de tema */}
        <div className="relative">
          <button
            onClick={() => setThemePanelOpen(v => !v)}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-[var(--r-md)] border border-hairline text-inkSoft text-[11.5px] font-semibold hover:bg-surfaceAlt transition-colors"
          >
            <span className="inline-flex gap-0.5">
              {t.swatch.map((c, i) => (
                <span key={i} className="w-2 h-2 rounded-full" style={{ background: c, border: '1px solid rgba(0,0,0,0.1)' }} />
              ))}
            </span>
            <span className="hidden md:inline">{t.name}</span>
          </button>
          <ThemeSwitcherPanel open={themePanelOpen} onClose={() => setThemePanelOpen(false)} />
        </div>

        {/* Pill de papel ativo */}
        {papel && LABEL_PAPEL[papel as PapelUsuario] && (
          <div
            className="hidden sm:flex items-center px-2.5 py-1 rounded-[var(--r-pill)] text-[11px] font-semibold shrink-0"
            style={{
              background: `${COR_PAPEL[papel as PapelUsuario]}18`,
              color: COR_PAPEL[papel as PapelUsuario],
              border: `1px solid ${COR_PAPEL[papel as PapelUsuario]}35`,
            }}
          >
            {LABEL_PAPEL[papel as PapelUsuario]}
          </div>
        )}

        {/* Avatar + dropdown */}
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-1.5 rounded-full outline-none group">
            <div
              className="w-[34px] h-[34px] rounded-full flex items-center justify-center text-[11.5px] font-bold shrink-0"
              style={{ background: 'var(--primary)', color: 'var(--primaryInk)' }}
            >
              {iniciais}
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-muted group-hover:text-ink hidden sm:block transition-colors" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64 border-hairline" style={{ boxShadow: '0 12px 32px rgba(0,0,0,0.10)' }}>
            <div className="px-4 py-3 border-b border-hairline">
              <p className="text-[15px] font-semibold text-ink truncate">{nomeUsuario ?? 'Usuario'}</p>
              {cargo && <p className="text-sm text-muted truncate">{cargo}</p>}
              {papel && LABEL_PAPEL[papel as PapelUsuario] && (
                <span
                  className="inline-flex mt-1.5 px-2 py-0.5 rounded-[var(--r-pill)] text-[11px] font-semibold"
                  style={{
                    background: `${COR_PAPEL[papel as PapelUsuario]}18`,
                    color: COR_PAPEL[papel as PapelUsuario],
                    border: `1px solid ${COR_PAPEL[papel as PapelUsuario]}35`,
                  }}
                >
                  {LABEL_PAPEL[papel as PapelUsuario]}
                </span>
              )}
            </div>
            {saldoCreditos !== null && saldoCreditos !== undefined && (
              <div className="px-4 py-2.5 border-b border-hairline">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted">Saldo de IA</span>
                  <span className="text-sm font-semibold flex items-center gap-1" style={{ color: 'var(--accent)' }}>
                    <Zap className="w-3.5 h-3.5" /> {saldoCreditos} creditos
                  </span>
                </div>
              </div>
            )}
            <DropdownMenuItem onClick={() => router.push('/configuracoes/organizacao')} className="gap-2.5 cursor-pointer text-[15px] py-2.5">
              <Settings className="w-4 h-4" /> Configuracoes
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/configuracoes/usuarios')} className="gap-2.5 cursor-pointer text-[15px] py-2.5">
              <Users className="w-4 h-4" /> Usuarios
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/configuracoes/secretarias')} className="gap-2.5 cursor-pointer text-[15px] py-2.5">
              <Building2 className="w-4 h-4" /> Secretarias
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => router.push('/creditos')} className="gap-2.5 cursor-pointer text-[15px] py-2.5">
              <TrendingUp className="w-4 h-4" /> Creditos de IA
            </DropdownMenuItem>
            {isAdminPlataforma && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => router.push('/admin/painel')} className="gap-2.5 cursor-pointer text-[15px] font-medium py-2.5" style={{ color: 'var(--primary)' }}>
                  <ShieldCheck className="w-4 h-4" /> Administracao da Plataforma
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleSair} className="gap-2.5 cursor-pointer text-[15px] py-2.5" style={{ color: 'var(--danger)' }}>
              <LogOut className="w-4 h-4" /> Sair da conta
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Botao mobile */}
        <button
          className="md:hidden p-2 rounded-[var(--r-sm)] text-inkSoft hover:bg-surfaceAlt transition-colors"
          onClick={() => setMenuMobile(v => !v)}
          aria-label={menuMobile ? 'Fechar menu' : 'Abrir menu'}
        >
          {menuMobile ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Linha 2: tabs de navegacao */}
      <div className="hidden md:flex items-end px-6 md:px-9 h-[42px]">
        <div className="flex gap-1">
          {todosLinks.map((tab) => {
            const active = tab.match(pathname)
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className="relative px-3.5 py-1.5 rounded-[var(--r-md)] text-[13px] tracking-[-0.01em] transition-colors font-medium"
                style={active
                  ? { background: 'var(--primaryWash)', color: 'var(--primary)', fontWeight: 600 }
                  : { color: 'var(--inkSoft)' }
                }
              >
                {tab.label}
              </Link>
            )
          })}
        </div>
      </div>

      {/* Menu mobile */}
      {menuMobile && (
        <div className="md:hidden border-t border-hairline py-2 bg-surface">
          {todosLinks.map((tab) => {
            const active = tab.match(pathname)
            return (
              <Link
                key={tab.href}
                href={tab.href}
                onClick={() => setMenuMobile(false)}
                className="flex items-center gap-3 px-6 py-3 text-[15px] font-medium transition-colors"
                style={active
                  ? { color: 'var(--primary)', background: 'var(--primaryWash)' }
                  : { color: 'var(--inkSoft)' }
                }
              >
                {tab.label}
              </Link>
            )
          })}
        </div>
      )}

      {/* Faixa de informacoes (ticker) */}
      <TickerStrip
        eventos={eventosTicker}
        categoriasAtivas={tickerCategorias}
      />
    </header>
  )
}
