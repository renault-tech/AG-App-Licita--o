'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { LABEL_PAPEL, ICONE_PAPEL, COR_PAPEL, ORDEM_FLUXO } from '@/lib/permissions'
import type { PapelUsuario } from '@/types/database'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet'
import { Users } from 'lucide-react'

const TODOS_PERFIS: PapelUsuario[] = [
  ...ORDEM_FLUXO,
  'admin_organizacao',
  'admin_plataforma',
]

interface DemoPerfilSwitcherProps {
  papelAtual: PapelUsuario
  onTrocar: (novoPapel: PapelUsuario) => Promise<void>
}

export function DemoPerfilSwitcher({ papelAtual, onTrocar }: DemoPerfilSwitcherProps) {
  const router = useRouter()
  const [trocando, setTrocando] = useState<PapelUsuario | null>(null)
  const [aberto, setAberto] = useState(false)

  async function handleTrocar(papel: PapelUsuario) {
    if (papel === papelAtual) return
    setTrocando(papel)
    await onTrocar(papel)
    router.refresh()
    setTrocando(null)
    setAberto(false)
  }

  return (
    <Sheet open={aberto} onOpenChange={setAberto}>
      <SheetTrigger
        className="fixed bottom-20 right-4 z-50 flex items-center gap-2 bg-white border border-gray-200 px-3 py-1.5 rounded-full text-sm font-semibold shadow-lg hover:bg-gray-50 transition-colors"
        aria-label="Trocar perfil no modo demo"
      >
        <Users className="w-4 h-4" />
        Trocar perfil
      </SheetTrigger>
      <SheetContent side="right" className="w-[300px]">
        <SheetHeader>
          <SheetTitle>Simular perfil</SheetTitle>
        </SheetHeader>
        <div className="mt-4 space-y-1.5">
          {TODOS_PERFIS.map(papel => {
            const isAtual = papel === papelAtual
            const estaTrocando = trocando === papel
            const cor = COR_PAPEL[papel]
            return (
              <button
                key={papel}
                type="button"
                onClick={() => handleTrocar(papel)}
                disabled={isAtual || !!trocando}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors"
                style={{
                  background: isAtual ? `${cor}20` : undefined,
                  border: isAtual ? `2px solid ${cor}` : '2px solid transparent',
                  opacity: trocando && !estaTrocando ? 0.5 : 1,
                }}
              >
                <span className="text-xl">{ICONE_PAPEL[papel]}</span>
                <div className="min-w-0 flex-1">
                  <div
                    className="text-sm font-semibold"
                    style={{ color: isAtual ? cor : undefined }}
                  >
                    {LABEL_PAPEL[papel]}
                  </div>
                  {isAtual && (
                    <div className="text-[10px] text-muted-foreground">Perfil atual</div>
                  )}
                </div>
                {estaTrocando && (
                  <div className="w-4 h-4 border-2 border-muted-foreground border-t-transparent rounded-full animate-spin" />
                )}
              </button>
            )
          })}
        </div>
        <div className="mt-4 p-3 rounded-lg text-[11px]" style={{ background: '#FFF7ED', border: '1px solid #FED7AA', color: '#C2410C' }}>
          Voce esta no Modo Demo. Nenhuma alteracao afeta prefeituras reais.
        </div>
      </SheetContent>
    </Sheet>
  )
}
