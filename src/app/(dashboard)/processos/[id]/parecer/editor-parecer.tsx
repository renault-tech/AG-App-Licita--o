'use client'

import { useState, useCallback, useRef } from 'react'
import { toast } from 'sonner'
import {
  Loader2, Wand2, CheckCircle, AlertCircle, XCircle,
  ChevronLeft, Send, Scale, Brain,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import Link from 'next/link'
import {
  salvarVeredito,
  salvarConteudo,
  emitirParecer,
  gerarMinutaIA,
  analisarComIA,
} from '@/lib/actions/procuradoria'
import ResumoProcesso from './resumo-processo'
import PainelDocumentos from './painel-documentos'
import ModalPrecedente from './modal-precedente'
import type { PrecedenteComScore } from '@/types/database'
import type { ResumoProcesso as TResumoProcesso } from '@/lib/actions/procuradoria'

type Veredito = 'aprovar' | 'aprovar_com_ressalvas' | 'contrario'

const VEREDITO_CONFIG: Record<Veredito, { label: string; icon: React.ElementType; classes: string; bg: string }> = {
  aprovar:               { label: 'Aprovar',              icon: CheckCircle, classes: 'text-green-600', bg: 'bg-green-50 border-green-200' },
  aprovar_com_ressalvas: { label: 'Aprovar com ressalvas', icon: AlertCircle, classes: 'text-amber-600', bg: 'bg-amber-50 border-amber-200' },
  contrario:             { label: 'Parecer contrário',    icon: XCircle,     classes: 'text-red-600',   bg: 'bg-red-50 border-red-200' },
}

function useDebounce(fn: (...args: any[]) => any, delay: number) {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null)
  return useCallback((...args: any[]) => {
    if (timer.current) clearTimeout(timer.current)
    timer.current = setTimeout(() => fn(...args), delay)
  }, [fn, delay])
}

export default function EditorParecer({
  parecer,
  processoId,
  precedentes,
  resumo,
  documentosDisponiveis,
}: {
  parecer: any
  processoId: string
  precedentes: PrecedenteComScore[]
  resumo: TResumoProcesso | null
  documentosDisponiveis: { dfd: boolean; etp: boolean; tr: boolean; edital: boolean }
}) {
  const [conteudo, setConteudo]   = useState<string>(parecer.conteudo || '')
  const [veredito, setVeredito]   = useState<Veredito | null>(parecer.veredito ?? null)
  const [ressalvas, setRessalvas] = useState<string>(parecer.ressalvas || '')
  const [motivoCon, setMotivoCon] = useState<string>(parecer.motivo_contrario || '')
  const [analiseIA, setAnaliseIA] = useState<string>(parecer.analise_ia || '')
  const [emitindo, setEmitindo]   = useState(false)
  const [minutaLoading, setMinutaLoading]   = useState(false)
  const [analiseLoading, setAnaliseLoading] = useState(false)
  const [geradoPorIA, setGeradoPorIA]       = useState(false)
  const [precedenteSelecionado, setPrecedenteSelecionado] = useState<PrecedenteComScore | null>(null)
  const [statusSalvo, setStatusSalvo] = useState<'salvo' | 'salvando' | 'idle'>('idle')

  const autoSalvar = useDebounce(async (texto: string) => {
    setStatusSalvo('salvando')
    await salvarConteudo(parecer.id, texto)
    setStatusSalvo('salvo')
    setTimeout(() => setStatusSalvo('idle'), 3000)
  }, 2000)

  function handleConteudoChange(texto: string) {
    setConteudo(texto)
    setStatusSalvo('salvando')
    autoSalvar(texto)
  }

  async function handleSelecionarVeredito(v: Veredito) {
    setVeredito(v)
    const res = await salvarVeredito(parecer.id, v)
    if (!res.success) toast.error(res.error ?? 'Erro ao salvar veredito.')
  }

  async function handleGerarMinuta() {
    if (!veredito) {
      toast.error('Selecione o veredito antes de gerar a minuta.')
      return
    }
    if (conteudo.trim()) {
      if (!confirm('O editor ja tem conteudo. Deseja substituir pela minuta gerada pela IA?')) return
    }
    setMinutaLoading(true)
    const res = await gerarMinutaIA(processoId, parecer.id, veredito)
    if (res.success && res.conteudo) {
      setConteudo(res.conteudo)
      setGeradoPorIA(true)
      toast.success('Minuta gerada pela IA. Revise antes de emitir.')
    } else {
      toast.error(res.error ?? 'Erro ao gerar minuta.')
    }
    setMinutaLoading(false)
  }

  async function handleAnalisarIA() {
    if (conteudo.length < 100) {
      toast.error('Redija ao menos 100 caracteres antes de solicitar analise.')
      return
    }
    setAnaliseLoading(true)
    const res = await analisarComIA(processoId, parecer.id, conteudo, veredito ?? 'indefinido')
    if (res.success && res.analise) {
      setAnaliseIA(res.analise)
      toast.success('Análise gerada. Verifique o painel abaixo.')
    } else {
      toast.error(res.error ?? 'Erro ao analisar.')
    }
    setAnaliseLoading(false)
  }

  async function handleEmitir() {
    if (!veredito) { toast.error('Selecione o veredito antes de emitir.'); return }
    setEmitindo(true)
    const res = await emitirParecer(parecer.id, conteudo, veredito, { ressalvas, motivo_contrario: motivoCon })
    if (res.success) {
      toast.success('Parecer emitido com sucesso.')
    } else {
      toast.error(res.error ?? 'Erro ao emitir.')
    }
    setEmitindo(false)
  }

  const podeEmitir = !!(veredito && conteudo.trim())

  return (
    <div className="space-y-4">
      {resumo && <ResumoProcesso resumo={resumo} />}

      <Card className="border-gray-200 shadow-sm">
        <CardHeader className="border-b border-gray-100 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div>
              <CardTitle className="text-base font-semibold text-gray-800">Redação do Parecer Jurídico</CardTitle>
              {parecer.processos_licitatorios?.objeto && (
                <CardDescription className="text-xs mt-0.5 text-gray-500">
                  Objeto: {parecer.processos_licitatorios.objeto}
                </CardDescription>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0 flex-wrap">
              <Button
                variant="outline"
                size="sm"
                onClick={handleGerarMinuta}
                disabled={minutaLoading}
                className="h-8 text-xs text-purple-700 border-purple-200 bg-purple-50 hover:bg-purple-100 gap-1.5"
              >
                {minutaLoading
                  ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Gerando...</>
                  : <><Wand2 className="w-3.5 h-3.5" /> Gerar minuta</>}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleAnalisarIA}
                disabled={analiseLoading || conteudo.length < 100}
                title={conteudo.length < 100 ? 'Redija ao menos 100 caracteres' : 'Analisar com IA'}
                className="h-8 text-xs text-blue-700 border-blue-200 bg-blue-50 hover:bg-blue-100 gap-1.5"
              >
                {analiseLoading
                  ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Analisando...</>
                  : <><Brain className="w-3.5 h-3.5" /> Analisar com IA</>}
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="p-5 space-y-5">
          {/* Seletor de veredito */}
          <div>
            <Label className="text-sm font-medium text-gray-700 mb-2 block">Veredito</Label>
            <div className="flex flex-wrap gap-2">
              {(Object.entries(VEREDITO_CONFIG) as [Veredito, typeof VEREDITO_CONFIG[Veredito]][]).map(([v, cfg]) => {
                const Icon = cfg.icon
                const ativo = veredito === v
                return (
                  <button
                    key={v}
                    onClick={() => handleSelecionarVeredito(v)}
                    className={`flex items-center gap-1.5 px-3.5 py-2 rounded-lg border text-sm font-medium transition-all ${
                      ativo
                        ? `${cfg.bg} ${cfg.classes} border-current/30 shadow-sm`
                        : 'border-gray-200 text-gray-500 hover:bg-gray-50 hover:text-gray-800'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${ativo ? cfg.classes : 'text-gray-400'}`} />
                    {cfg.label}
                  </button>
                )
              })}
            </div>
            {!veredito && (
              <p className="text-xs text-amber-600 mt-1.5">Selecione o veredito para habilitar a geração de minuta e a emissão.</p>
            )}
          </div>

          {veredito === 'aprovar_com_ressalvas' && (
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-amber-700">Ressalvas <span className="text-red-500">*</span></Label>
              <Textarea
                rows={3}
                placeholder="Descreva as ressalvas que condicionam a aprovação..."
                value={ressalvas}
                onChange={e => setRessalvas(e.target.value)}
                className="border-amber-200 text-sm"
              />
            </div>
          )}
          {veredito === 'contrario' && (
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-red-700">Motivo do parecer contrário <span className="text-red-500">*</span></Label>
              <Textarea
                rows={3}
                placeholder="Descreva os motivos que fundamentam o parecer contrário..."
                value={motivoCon}
                onChange={e => setMotivoCon(e.target.value)}
                className="border-red-200 text-sm"
              />
            </div>
          )}

          {geradoPorIA && (
            <div className="flex items-center gap-2 p-3 bg-purple-50 border border-purple-100 rounded-lg text-xs text-purple-700">
              <Wand2 className="w-3.5 h-3.5 shrink-0" />
              Conteúdo gerado pela IA. Revise e ajuste conforme necessário antes de emitir.
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">Texto do Parecer</Label>
            <Textarea
              rows={18}
              placeholder={'EMENTA:\n\nRELATÓRIO:\n\nFUNDAMENTAÇÃO JURÍDICA:\n\nCONCLUSÃO:'}
              value={conteudo}
              onChange={e => handleConteudoChange(e.target.value)}
              className="font-mono text-sm text-gray-800 leading-relaxed resize-y"
            />
            <p className="text-[11px] text-gray-400 flex items-center gap-1.5">
              {conteudo.length} caracteres
              {statusSalvo === 'salvando' && <span className="text-gray-400">— salvando...</span>}
              {statusSalvo === 'salvo' && <span className="text-green-600">— salvo</span>}
              {statusSalvo === 'idle' && <span>— salvo automaticamente</span>}
            </p>
          </div>

          {analiseIA && (
            <div className="p-4 bg-blue-50 border border-blue-100 rounded-xl space-y-2">
              <div className="flex items-center gap-1.5">
                <Brain className="w-3.5 h-3.5 text-blue-600" />
                <span className="text-xs font-semibold text-blue-800">Análise jurídica da IA</span>
              </div>
              <pre className="text-xs text-blue-900 whitespace-pre-wrap leading-relaxed font-sans">
                {analiseIA}
              </pre>
            </div>
          )}

          {precedentes.length > 0 && (
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
                <Scale className="w-4 h-4 text-gray-400" />
                Pareceres precedentes similares
              </Label>
              <div className="space-y-2">
                {precedentes.map(p => {
                  const vCfg = VEREDITO_CONFIG[p.veredito as Veredito]
                  const emLinha = p.veredito === veredito
                  const cor = p.score >= 70 ? 'bg-green-500' : p.score >= 40 ? 'bg-amber-500' : 'bg-gray-300'
                  return (
                    <button
                      key={p.id}
                      onClick={() => setPrecedenteSelecionado(p)}
                      className="w-full text-left p-3.5 bg-white border border-gray-200 rounded-xl hover:border-blue-300 hover:bg-blue-50/30 transition-all group"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-gray-800 truncate">{p.objeto_processo}</p>
                          <div className="flex items-center gap-2 mt-1.5">
                            {vCfg && (
                              <Badge variant="outline" className={`text-[10px] gap-1 ${vCfg.bg} ${vCfg.classes} border-current/20`}>
                                <vCfg.icon className="w-2.5 h-2.5" />
                                {vCfg.label}
                              </Badge>
                            )}
                            <Badge
                              variant="outline"
                              className={`text-[10px] ${emLinha ? 'text-green-700 bg-green-50 border-green-200' : 'text-amber-700 bg-amber-50 border-amber-200'}`}
                            >
                              {emLinha ? 'Em linha' : 'Divergente'}
                            </Badge>
                            <span className="text-[10px] text-gray-400">
                              {p.mesma_org && p.procurador_nome ? p.procurador_nome : 'Procurador anônimo'}
                            </span>
                          </div>
                        </div>
                        <div className="shrink-0 flex flex-col items-end gap-1">
                          <div className="flex items-center gap-1.5">
                            <div className="w-16 bg-gray-100 rounded-full h-1.5">
                              <div className={`h-1.5 rounded-full ${cor}`} style={{ width: `${p.score}%` }} />
                            </div>
                            <span className="text-[11px] font-bold text-gray-700">{p.score}%</span>
                          </div>
                          <span className="text-[10px] text-gray-400 group-hover:text-blue-600">ver parecer</span>
                        </div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </div>
          )}
        </CardContent>

        <CardFooter className="flex items-center justify-between border-t border-gray-100 bg-gray-50/50 px-6 py-4 rounded-b-xl gap-3">
          <Link href={`/processos/${processoId}/edital`}>
            <Button variant="outline" className="gap-1.5 h-9 text-sm">
              <ChevronLeft className="w-4 h-4" /> Edital
            </Button>
          </Link>
          <Button
            onClick={handleEmitir}
            disabled={emitindo || !podeEmitir}
            className="bg-[#1A365D] hover:bg-[#1A365D]/90 text-white gap-2 h-9 text-sm"
          >
            {emitindo
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Emitindo...</>
              : <><Send className="w-4 h-4" /> Emitir parecer</>}
          </Button>
        </CardFooter>
      </Card>

      <PainelDocumentos processoId={processoId} documentosDisponiveis={documentosDisponiveis} />

      <ModalPrecedente
        precedente={precedenteSelecionado}
        veredito_atual={veredito}
        aberto={!!precedenteSelecionado}
        onFechar={() => setPrecedenteSelecionado(null)}
      />
    </div>
  )
}
