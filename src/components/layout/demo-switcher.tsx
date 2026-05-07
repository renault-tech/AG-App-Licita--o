'use client'

import { useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { trocarPapelDemo } from '@/lib/actions/usuario'
import type { PapelUsuario } from '@/types/database'

const PAPEIS: { papel: PapelUsuario; label: string; cor: string }[] = [
  { papel: 'setor_licitacao',      label: 'Licitacao',    cor: 'bg-blue-600 hover:bg-blue-700' },
  { papel: 'procurador',           label: 'Procurador',   cor: 'bg-purple-600 hover:bg-purple-700' },
  { papel: 'autoridade_competente',label: 'Autoridade',   cor: 'bg-green-600 hover:bg-green-700' },
  { papel: 'admin_organizacao',    label: 'Admin',        cor: 'bg-gray-600 hover:bg-gray-700' },
]

interface Props {
  papelAtual: PapelUsuario
}

export default function DemoSwitcher({ papelAtual }: Props) {
  const [isPending, startTransition] = useTransition()
  const router = useRouter()

  function handleTrocar(papel: PapelUsuario) {
    if (papel === papelAtual) return
    startTransition(async () => {
      await trocarPapelDemo(papel)
      router.refresh()
    })
  }

  return (
    <div className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-1.5 bg-gray-900 text-white px-3 py-2 rounded-full shadow-xl border border-gray-700 text-xs">
      <span className="text-gray-400 font-medium mr-1 shrink-0">DEMO</span>
      {PAPEIS.map(({ papel, label, cor }) => (
        <button
          key={papel}
          onClick={() => handleTrocar(papel)}
          disabled={isPending}
          className={`px-2.5 py-1 rounded-full font-semibold transition-all disabled:opacity-50 ${
            papelAtual === papel
              ? `${cor} text-white ring-2 ring-white ring-offset-1 ring-offset-gray-900`
              : `${cor} text-white opacity-60 hover:opacity-100`
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
