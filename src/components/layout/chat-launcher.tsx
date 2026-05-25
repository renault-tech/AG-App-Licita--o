'use client'

import Link from 'next/link'
import { MessageCircle } from 'lucide-react'
import { usePathname } from 'next/navigation'

interface ChatLauncherProps {
  naoLidosChat?: number
}

export function ChatLauncher({ naoLidosChat = 0 }: ChatLauncherProps) {
  const pathname = usePathname()
  const ativo = pathname.startsWith('/chat')

  return (
    <Link
      href="/chat"
      className="fixed left-4 bottom-6 z-40 flex items-center justify-center w-12 h-12 rounded-full shadow-lg transition-all hover:scale-105 active:scale-95"
      style={{
        background: ativo ? 'var(--primary)' : 'var(--surface)',
        color: ativo ? 'var(--primaryInk)' : 'var(--inkSoft)',
        border: '1.5px solid var(--hairline)',
        boxShadow: ativo
          ? '0 4px 16px color-mix(in srgb, var(--primary) 30%, transparent)'
          : '0 2px 8px rgba(0,0,0,0.10)',
      }}
      aria-label={`Abrir chat${naoLidosChat > 0 ? ` (${naoLidosChat} mensagens nao lidas)` : ''}`}
    >
      <MessageCircle className="w-5 h-5" />
      {naoLidosChat > 0 && (
        <span
          className="absolute -top-1 -right-1 text-[9px] font-bold px-1 py-px rounded-full min-w-[16px] text-center"
          style={{ background: 'var(--danger)', color: '#fff', lineHeight: '1.4' }}
        >
          {naoLidosChat > 99 ? '99+' : naoLidosChat}
        </span>
      )}
    </Link>
  )
}
