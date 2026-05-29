'use client'

import { useState } from 'react'
import { RotateCcw, ChevronRight, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { retornarParaLicitacaoAposParece, avancarEtapa } from '@/lib/actions/tramitacao-fluxo'
import { useRouter } from 'next/navigation'
import type { FaseProcesso } from '@/types/database'

interface BotoesParecer {
  processoId: string
  faseAtual: FaseProcesso
  etapaAtual: number
}

/**
 * Botoes de acao na pagina do Parecer Juridico.
 * Procurador: "Concluir e Retornar para Licitacao" (nao avanca etapa).
 * Setor de Licitacao (pos-parecer, etapa 10): "Encaminhar para Autorizacao" (avanca etapa).
 */
export default function BotoesParecer({ processoId, faseAtual, etapaAtual }: BotoesParecer) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const ehProcurador = faseAtual === 'procurador'
  const ehLicitacaoPosParecer = faseAtual === 'setor_licitacao' && etapaAtual === 10

  if (!ehProcurador && !ehLicitacaoPosParecer) return null

  async function handleRetornarLicitacao() {
    setLoading(true)
    const res = await retornarParaLicitacaoAposParece(processoId)
    setLoading(false)
    if (!res.success) {
      toast.error(res.error ?? 'Erro ao retornar para licitacao.')
      return
    }
    toast.success('Parecer concluido. Processo retornou ao Setor de Licitacao.')
    router.refresh()
  }

  async function handleEncaminharGestor() {
    setLoading(true)
    const res = await avancarEtapa(processoId)
    setLoading(false)
    if (!res.success) {
      toast.error(res.error ?? 'Erro ao encaminhar.')
      return
    }
    toast.success('Processo encaminhado para a Autoridade Competente.')
    router.push(`/processos/${processoId}/autorizacao`)
  }

  if (ehProcurador) {
    return (
      <Button
        onClick={handleRetornarLicitacao}
        disabled={loading}
        variant="outline"
        className="gap-1.5 text-violet-700 border-violet-300 bg-violet-50 hover:bg-violet-100"
      >
        {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCcw className="w-4 h-4" />}
        Concluir e Retornar para Licitacao
      </Button>
    )
  }

  return (
    <Button
      onClick={handleEncaminharGestor}
      disabled={loading}
      style={{ background: 'var(--primary)', color: '#fff' }}
    >
      {loading ? (
        <Loader2 className="w-4 h-4 animate-spin" />
      ) : (
        <>
          Encaminhar para Autorizacao
          <ChevronRight className="w-4 h-4 ml-1" />
        </>
      )}
    </Button>
  )
}
