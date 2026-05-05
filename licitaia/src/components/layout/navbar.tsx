'use client'

import Link from 'next/link'
import { useRouter } from 'next/navigation'
import type { User } from '@supabase/supabase-js'
import { LogOut, Settings, FileText, LayoutDashboard, Users } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'

interface NavbarProps {
  user: User
}

export default function Navbar({ user }: NavbarProps) {
  const router = useRouter()

  async function handleSair() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push('/login')
    router.refresh()
  }

  const iniciais = user.email?.slice(0, 2).toUpperCase() ?? 'US'

  return (
    <header className="bg-white border-b border-gray-200 sticky top-0 z-40">
      <div className="container mx-auto px-4 max-w-7xl">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link href="/dashboard" className="flex items-center gap-2">
            <span className="text-xl font-bold text-blue-900">LicitaIA</span>
            <span className="hidden sm:inline text-xs text-blue-500 bg-blue-50 px-2 py-0.5 rounded-full">
              Lei 14.133/21
            </span>
          </Link>

          {/* Navegacao */}
          <nav className="hidden md:flex items-center gap-1">
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <LayoutDashboard className="w-4 h-4" />
              Painel
            </Link>
            <Link
              href="/processos"
              className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-gray-600 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <FileText className="w-4 h-4" />
              Processos
            </Link>
          </nav>

          {/* Menu usuario */}
          <DropdownMenu>
            <DropdownMenuTrigger className="rounded-full outline-none">
              <Avatar className="h-8 w-8">
                <AvatarFallback className="bg-blue-100 text-blue-700 text-xs font-semibold">
                  {iniciais}
                </AvatarFallback>
              </Avatar>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52">
              <div className="px-2 py-1.5">
                <p className="text-xs text-gray-500 truncate">{user.email}</p>
              </div>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => router.push('/configuracoes/organizacao')} className="gap-2 cursor-pointer">
                <Settings className="w-4 h-4" />
                Organizacao
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={() => router.push('/configuracoes/usuarios')} className="gap-2 cursor-pointer">
                <Users className="w-4 h-4" />
                Usuarios
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleSair} className="gap-2 text-red-600 cursor-pointer">
                <LogOut className="w-4 h-4" />
                Sair
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  )
}
