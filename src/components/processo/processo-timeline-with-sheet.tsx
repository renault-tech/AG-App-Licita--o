'use client'

import { useState } from 'react'
import { ProcessoTimeline } from './processo-timeline'
import { ProcessosNoSetorSheet } from './processos-no-setor-sheet'
import type { TramitacaoHistoricoRow, FaseProcesso } from '@/types/database'

interface ProcessoTimelineWithSheetProps {
  historico: TramitacaoHistoricoRow[]
  faseAtual: FaseProcesso
  organizacaoId: string
  className?: string
}

export function ProcessoTimelineWithSheet({
  historico,
  faseAtual,
  organizacaoId,
  className,
}: ProcessoTimelineWithSheetProps) {
  const [setorAberto, setSetorAberto] = useState<FaseProcesso | null>(null)

  return (
    <>
      <ProcessoTimeline
        historico={historico}
        faseAtual={faseAtual}
        onSetorClick={fase => setSetorAberto(fase)}
        className={className}
      />
      <ProcessosNoSetorSheet
        fase={setorAberto}
        organizacaoId={organizacaoId}
        open={!!setorAberto}
        onClose={() => setSetorAberto(null)}
      />
    </>
  )
}
