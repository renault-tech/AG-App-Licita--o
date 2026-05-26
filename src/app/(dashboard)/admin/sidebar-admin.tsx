'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  LayoutDashboard, BookOpen, Bot, Building2, Users,
  HelpCircle, Settings2, Coins, BarChart2, Presentation,
} from 'lucide-react'

const NAV = [
  {
    href: '/admin/painel',
    label: 'Painel Geral',
    icon: LayoutDashboard,
    tooltip: 'Visao consolidada de toda a plataforma: organizacoes, processos, usuarios e consumo de IA.',
  },
  {
    href: '/admin/base-conhecimento',
    label: 'Base de Conhecimento',
    icon: BookOpen,
    tooltip: 'Envie documentos reais de licitacao para a IA aprender e gerar textos melhores gastando menos tokens.',
  },
  {
    href: '/admin/ia',
    label: 'Gestao de IA',
    icon: Bot,
    tooltip: 'Monitore consumo de tokens por provedor, curva de aprendizado e economia acumulada de recursos.',
  },
  {
    href: '/admin/observabilidade',
    label: 'Observabilidade',
    icon: BarChart2,
    tooltip: 'Graficos de consumo de tokens, economia por clausulas aprendidas e anomalias de rate limiting.',
  },
  {
    href: '/admin/organizacoes',
    label: 'Organizacoes',
    icon: Building2,
    tooltip: 'Gerencie todas as prefeituras e orgaos cadastrados na plataforma.',
  },
  {
    href: '/admin/usuarios',
    label: 'Usuarios',
    icon: Users,
    tooltip: 'Visualize e administre todos os usuarios de todas as organizacoes.',
  },
  {
    href: '/admin/creditos',
    label: 'Creditos',
    icon: Coins,
    tooltip: 'Visualize o saldo de creditos por organizacao e conceda creditos manualmente.',
  },
  {
    href: '/admin/configuracoes-plataforma',
    label: 'Configuracoes',
    icon: Settings2,
    tooltip: 'Parametros globais da plataforma: prazos de alerta para pareceres e outras configuracoes.',
  },
  {
    href: '/admin/modo-demo',
    label: 'Modo Demo',
    icon: Presentation,
    tooltip: 'Entre em ambiente isolado para demonstrar a plataforma a potenciais clientes simulando qualquer perfil.',
  },
]

export default function SidebarAdmin() {
  const pathname = usePathname()

  return (
    <nav className="w-52 shrink-0" aria-label="Menu de administracao da plataforma">
      <ul className="space-y-0.5">
        {NAV.map(({ href, label, icon: Icon, tooltip }) => {
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
                {/* Indicador dourado lateral no item ativo */}
                {ativa && (
                  <span className="absolute left-0 top-2 bottom-2 w-[3px] rounded-full bg-[#B7935E]" />
                )}
                <Icon
                  className={`w-4 h-4 shrink-0 ml-1 transition-colors ${
                    ativa ? 'text-[#B7935E]' : 'text-[#74777F] group-hover:text-[#1A365D]'
                  }`}
                />
                <span className="flex-1 truncate">{label}</span>
                <HelpCircle className="w-3.5 h-3.5 text-[#C4C6CF] opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />

                {/* Tooltip contextual */}
                <span
                  className="pointer-events-none absolute left-full ml-3 top-1/2 -translate-y-1/2 z-50 hidden group-hover:block w-60 p-3 text-white text-[11px] rounded-xl leading-relaxed"
                  style={{ backgroundColor: '#2F3033', boxShadow: '0 12px 32px rgba(26,54,93,0.2)' }}
                >
                  {tooltip}
                </span>
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}