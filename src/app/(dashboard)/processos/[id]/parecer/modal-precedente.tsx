'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { CheckCircle, AlertCircle, XCircle } from 'lucide-react'
import type { PrecedenteComScore } from '@/types/database'

const VEREDITO_CONFIG = {
  aprovar:                { label: 'Aprovado',             icon: CheckCircle,  color: 'text-green-600', bg: 'bg-green-50' },
  aprovar_com_ressalvas:  { label: 'Aprov. c/ Ressalvas',  icon: AlertCircle,  color: 'text-amber-600', bg: 'bg-amber-50' },
  contrario:              { label: 'Contrario',            icon: XCircle,      color: 'text-red-600',   bg: 'bg-red-50'   },
}

function BarraSimilaridade({ label, score }: { label: string; score: number }) {
  const cor = score >= 70 ? 'bg-green-500' : score >= 40 ? 'bg-amber-500' : 'bg-gray-300'
  return (
    <div className="flex items-center gap-2">
      <span className="text-[11px] text-gray-500 w-20 shrink-0">{label}</span>
      <div className="flex-1 bg-gray-100 rounded-full h-2">
        <div className={`h-2 rounded-full transition-all ${cor}`} style={{ width: `${score}%` }} />
      </div>
      <span className="text-[11px] font-semibold text-gray-700 w-8 text-right">{score}%</span>
    </div>
  )
}

export default function ModalPrecedente({
  precedente,
  veredito_atual,
  aberto,
  onFechar,
}: {
  precedente: PrecedenteComScore | null
  veredito_atual: string | null
  aberto: boolean
  onFechar: () => void
}) {
  if (!precedente) return null

  const vCfg = VEREDITO_CONFIG[precedente.veredito as keyof typeof VEREDITO_CONFIG]
  const VIcon = vCfg?.icon ?? CheckCircle
  const emLinha = precedente.veredito === veredito_atual

  return (
    <Dialog open={aberto} onOpenChange={v => !v && onFechar()}>
      <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col">
        <DialogHeader className="shrink-0">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <DialogTitle className="text-sm font-semibold text-gray-800 leading-snug pr-6">
                {precedente.objeto_processo}
              </DialogTitle>
              <div className="flex flex-wrap gap-2 mt-2">
                <Badge variant="outline" className={`gap-1 text-[11px] ${vCfg?.bg} ${vCfg?.color} border-current/30`}>
                  <VIcon className="w-3 h-3" />
                  {vCfg?.label}
                </Badge>
                <Badge variant="outline" className={`text-[11px] ${emLinha ? 'text-green-700 bg-green-50 border-green-200' : 'text-amber-700 bg-amber-50 border-amber-200'}`}>
                  {emLinha ? 'Em linha com o veredito atual' : 'Diverge do veredito atual'}
                </Badge>
                {precedente.mesma_org
                  ? <Badge variant="outline" className="text-[11px] text-gray-600">
                      {precedente.procurador_nome ?? 'Procurador nao identificado'}
                    </Badge>
                  : <Badge variant="outline" className="text-[11px] text-gray-400">Procurador anonimo</Badge>
                }
                <span className="text-[11px] text-gray-400 self-center">
                  {new Date(precedente.emitido_em).toLocaleDateString('pt-BR')}
                </span>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="shrink-0 bg-gray-50 rounded-xl p-4 space-y-2.5">
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-3">Grau de similaridade</p>
          <BarraSimilaridade label="Geral"      score={precedente.score} />
          <div className="border-t border-gray-200 pt-2 mt-2 space-y-2">
            <BarraSimilaridade label="Modalidade" score={precedente.score_modalidade} />
            <BarraSimilaridade label="Objeto"     score={precedente.score_keywords} />
            <BarraSimilaridade label="Valor"      score={precedente.score_valor} />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto mt-2">
          <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wide mb-2">Texto do parecer</p>
          {precedente.conteudo_parecer ? (
            <pre className="text-sm text-gray-800 leading-relaxed whitespace-pre-wrap font-sans">
              {precedente.conteudo_parecer}
            </pre>
          ) : (
            <p className="text-sm text-gray-400 italic">
              Texto nao disponivel (parecer de outra organizacao com pool anonimizado).
            </p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
