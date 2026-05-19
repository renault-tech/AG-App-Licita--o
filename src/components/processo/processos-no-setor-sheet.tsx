'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Badge } from '@/components/ui/badge'
import type { FaseProcesso } from '@/types/database'
import { LABEL_PAPEL, ICONE_PAPEL } from '@/lib/permissions'
import { buscarProcessosPorFase } from '@/lib/actions/tramitacao-fluxo'

interface ProcessoResumido {
  id: string
  numero_processo: string | null
  objeto: string
  modalidade: string
  updated_at: string
  fase_atual: FaseProcesso
}

interface ProcessosNoSetorSheetProps {
  fase: FaseProcesso | null
  organizacaoId: string
  open: boolean
  onClose: () => void
}

export function ProcessosNoSetorSheet({
  fase,
  organizacaoId,
  open,
  onClose,
}: ProcessosNoSetorSheetProps) {
  const [processos, setProcessos] = useState<ProcessoResumido[]>([])
  const [carregando, setCarregando] = useState(false)

  useEffect(() => {
    if (!fase || !open) return
    setCarregando(true)
    // Conforme definicao de buscarProcessosPorFase em tramitacao-fluxo.ts,
    // FaseProcesso e compativel com PapelUsuario no subconjunto do fluxo
    buscarProcessosPorFase(fase, organizacaoId)
      .then(({ data }) => setProcessos((data as ProcessoResumido[]) ?? []))
      .finally(() => setCarregando(false))
  }, [fase, organizacaoId, open])

  if (!fase) return null

  return (
    <Sheet open={open} onOpenChange={(v: boolean) => { if (!v) onClose() }}>
      <SheetContent side="right" className="w-[400px] sm:w-[500px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <span>{ICONE_PAPEL[fase]}</span>
            <span>Processos em {LABEL_PAPEL[fase]}</span>
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 flex flex-col gap-3">
          {carregando && (
            <div className="text-sm text-muted-foreground">Carregando...</div>
          )}
          {!carregando && processos.length === 0 && (
            <div className="text-sm text-muted-foreground">
              Nenhum processo neste setor no momento.
            </div>
          )}
          {processos.map(p => (
            <Link
              key={p.id}
              href={`/processos/${p.id}`}
              onClick={onClose}
              className="block rounded-lg border p-3 hover:bg-accent transition-colors"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-sm font-semibold truncate">{p.objeto}</div>
                  {p.numero_processo && (
                    <div className="text-xs text-muted-foreground">{p.numero_processo}</div>
                  )}
                </div>
                <Badge variant="outline" className="shrink-0 text-xs">{p.modalidade}</Badge>
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                Atualizado: {new Date(p.updated_at).toLocaleDateString('pt-BR')}
              </div>
            </Link>
          ))}
        </div>
      </SheetContent>
    </Sheet>
  )
}
