'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import {
  CheckCircle2, XCircle, Loader2, AlertCircle, Clock,
  ShieldCheck, RotateCcw, ChevronLeft, FileCheck, Gavel,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogFooter, DialogDescription,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { autorizarProcesso, devolverParaCorrecao, type AutorizacaoRow } from '@/lib/actions/autorizacao'
import Link from 'next/link'

interface DocumentoResumo {
  nome: string
  slug: string
  status: string
}

interface PainelAutorizacaoProps {
  processoId: string
  autorizacao: AutorizacaoRow | null
  documentos: DocumentoResumo[]
  podeAutorizar: boolean
  parecerStatus: string | null
}

const STATUS_DOC: Record<string, { label: string; cor: string }> = {
  rascunho:   { label: 'Rascunho',    cor: 'bg-gray-100 text-gray-500 border-gray-200' },
  em_revisao: { label: 'Em Revisao',  cor: 'bg-amber-50 text-amber-700 border-amber-200' },
  assinado:   { label: 'Aprovado',    cor: 'bg-green-50 text-green-700 border-green-200' },
  devolvido:  { label: 'Devolvido',   cor: 'bg-red-50 text-red-700 border-red-200' },
  publicado:  { label: 'Publicado',   cor: 'bg-blue-50 text-blue-700 border-blue-200' },
}

const STATUS_PARECER: Record<string, { label: string; cor: string }> = {
  pendente:               { label: 'Pendente',             cor: 'bg-gray-100 text-gray-500' },
  aprovado:               { label: 'Aprovado',             cor: 'bg-green-50 text-green-700' },
  aprovado_com_ressalvas: { label: 'Aprovado c/ Ressalvas',cor: 'bg-amber-50 text-amber-700' },
  devolvido:              { label: 'Devolvido',            cor: 'bg-red-50 text-red-700' },
}

const PARECER_FAVORAVEL = new Set(['aprovado', 'aprovado_com_ressalvas'])

export default function PainelAutorizacao({
  processoId,
  autorizacao,
  documentos,
  podeAutorizar,
  parecerStatus,
}: PainelAutorizacaoProps) {
  const [loading, setLoading] = useState(false)
  const [modalDevolver, setModalDevolver] = useState(false)
  const [modalAutorizar, setModalAutorizar] = useState(false)
  const [observacao, setObservacao] = useState('')
  const [statusAtual, setStatusAtual] = useState(autorizacao?.status ?? 'pendente')

  const parecerFavoravel = parecerStatus ? PARECER_FAVORAVEL.has(parecerStatus) : false
  const todosAprovados = documentos.every(d => d.status === 'assinado' || d.status === 'publicado')
  const podeAgir = podeAutorizar && parecerFavoravel && statusAtual !== 'autorizado'

  async function handleAutorizar() {
    setLoading(true)
    const res = await autorizarProcesso(processoId, observacao.trim())
    if (res.success) {
      toast.success('Processo autorizado com sucesso.')
      setStatusAtual('autorizado')
      setModalAutorizar(false)
      setObservacao('')
    } else {
      toast.error(res.error ?? 'Erro ao autorizar.')
    }
    setLoading(false)
  }

  async function handleDevolver() {
    if (!observacao.trim()) return
    setLoading(true)
    const res = await devolverParaCorrecao(processoId, observacao.trim())
    if (res.success) {
      toast.success('Processo devolvido para correcao.')
      setStatusAtual('devolvido')
      setModalDevolver(false)
      setObservacao('')
    } else {
      toast.error(res.error ?? 'Erro ao devolver.')
    }
    setLoading(false)
  }

  return (
    <>
      <div className="space-y-4">

        {/* Status atual da autorizacao */}
        {statusAtual === 'autorizado' && (
          <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
            <ShieldCheck className="w-5 h-5 text-green-600 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-green-800">Processo autorizado</p>
              <p className="text-xs text-green-700 mt-0.5">
                A autoridade competente autorizou a abertura do processo licitatorio.
                {autorizacao?.observacao && ` Observacao: ${autorizacao.observacao}`}
              </p>
            </div>
          </div>
        )}

        {statusAtual === 'devolvido' && (
          <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-xl">
            <XCircle className="w-5 h-5 text-red-600 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-red-800">Processo devolvido para correcao</p>
              {autorizacao?.observacao && (
                <p className="text-xs text-red-700 mt-0.5">Motivo: {autorizacao.observacao}</p>
              )}
            </div>
          </div>
        )}

        {/* Checklist de documentos */}
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="border-b border-gray-100 pb-4">
            <CardTitle className="text-base font-semibold text-gray-800 flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-blue-500" />
              Documentos do Processo
            </CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-2">
            {documentos.map(doc => {
              const cfg = STATUS_DOC[doc.status] ?? STATUS_DOC['rascunho']
              const aprovado = doc.status === 'assinado' || doc.status === 'publicado'
              return (
                <div key={doc.slug} className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50 border border-gray-100">
                  <div className="flex items-center gap-2">
                    {aprovado
                      ? <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                      : <Clock className="w-4 h-4 text-gray-400 shrink-0" />}
                    <Link href={`/processos/${processoId}/${doc.slug}`} className="text-sm text-gray-700 hover:text-blue-700 hover:underline">
                      {doc.nome}
                    </Link>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${cfg.cor}`}>
                    {cfg.label}
                  </span>
                </div>
              )
            })}

            {/* Status do parecer */}
            {parecerStatus && (
              <div className="flex items-center justify-between py-2 px-3 rounded-lg bg-gray-50 border border-gray-100">
                <div className="flex items-center gap-2">
                  {parecerFavoravel
                    ? <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                    : <Clock className="w-4 h-4 text-gray-400 shrink-0" />}
                  <Link href={`/processos/${processoId}/parecer`} className="text-sm text-gray-700 hover:text-blue-700 hover:underline">
                    Parecer Juridico
                  </Link>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_PARECER[parecerStatus]?.cor ?? 'bg-gray-100 text-gray-500'}`}>
                  {STATUS_PARECER[parecerStatus]?.label ?? parecerStatus}
                </span>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Card de acao */}
        {podeAutorizar && statusAtual !== 'autorizado' && (
          <Card className="border-gray-200 shadow-sm">
            <CardHeader className="border-b border-gray-100 pb-4">
              <CardTitle className="text-base font-semibold text-gray-800 flex items-center gap-2">
                <Gavel className="w-4 h-4 text-blue-500" />
                Decisao da Autoridade Competente
              </CardTitle>
            </CardHeader>
            <CardContent className="p-4">
              {!parecerFavoravel && (
                <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 mb-4">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  O processo aguarda parecer juridico favoravel antes de poder ser autorizado.
                </div>
              )}
              {!todosAprovados && parecerFavoravel && (
                <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 mb-4">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  Ha documentos ainda nao aprovados pelo setor de licitacoes.
                </div>
              )}
              <p className="text-sm text-gray-600">
                Conforme Art. 72 da Lei 14.133/21, a autoridade competente deve autorizar a abertura do certame
                apos a instrucao completa do processo e o parecer juridico favoravel.
              </p>
            </CardContent>
            <CardFooter className="flex items-center justify-between border-t border-gray-100 bg-gray-50/50 px-6 py-4 rounded-b-xl gap-3">
              <Link href={`/processos/${processoId}/parecer`}>
                <Button variant="outline" className="gap-1.5 h-9 text-sm">
                  <ChevronLeft className="w-4 h-4" /> Parecer
                </Button>
              </Link>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-9 text-sm gap-1.5 text-red-700 border-red-300 bg-red-50 hover:bg-red-100"
                  onClick={() => { setObservacao(''); setModalDevolver(true) }}
                  disabled={!parecerFavoravel}
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Devolver para Correcao
                </Button>
                <Button
                  size="sm"
                  className="h-9 text-sm gap-1.5 bg-green-700 hover:bg-green-800 text-white"
                  onClick={() => { setObservacao(''); setModalAutorizar(true) }}
                  disabled={!parecerFavoravel}
                >
                  <ShieldCheck className="w-3.5 h-3.5" />
                  Autorizar Processo
                </Button>
              </div>
            </CardFooter>
          </Card>
        )}

        {/* Somente leitura para outros papeis */}
        {!podeAutorizar && statusAtual === 'pendente' && (
          <Card className="border-gray-200 shadow-sm">
            <CardContent className="p-6 flex flex-col items-center text-center gap-2">
              <Clock className="w-8 h-8 text-gray-300" />
              <p className="text-sm font-medium text-gray-500">Aguardando autorizacao da autoridade competente</p>
              <p className="text-xs text-gray-400">
                Conforme Art. 72 da Lei 14.133/21, o processo sera autorizado apos analise da autoridade competente.
              </p>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Modal: Autorizar */}
      <Dialog open={modalAutorizar} onOpenChange={(open) => { if (!open) { setModalAutorizar(false); setObservacao('') } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-green-600" />
              Autorizar Abertura do Processo
            </DialogTitle>
            <DialogDescription>
              Confirme a autorizacao conforme Art. 72 da Lei 14.133/21. Esta acao tornara o processo apto para publicacao.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="obs-autorizar" className="text-sm font-medium">
              Observacoes (opcional)
            </Label>
            <Textarea
              id="obs-autorizar"
              rows={3}
              placeholder="Registre observacoes se necessario..."
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              className="resize-none"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => { setModalAutorizar(false); setObservacao('') }} disabled={loading}>
              Cancelar
            </Button>
            <Button
              size="sm"
              className="bg-green-700 hover:bg-green-800 text-white gap-1.5"
              onClick={handleAutorizar}
              disabled={loading}
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ShieldCheck className="w-3.5 h-3.5" />}
              Confirmar Autorizacao
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal: Devolver */}
      <Dialog open={modalDevolver} onOpenChange={(open) => { if (!open) { setModalDevolver(false); setObservacao('') } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500" />
              Devolver Processo para Correcao
            </DialogTitle>
            <DialogDescription>
              Informe o motivo da devolucao para que o setor de licitacoes realize os ajustes necessarios.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="obs-devolver" className="text-sm font-medium">
              Motivo da devolucao <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="obs-devolver"
              rows={4}
              placeholder="Descreva o que deve ser corrigido ou complementado..."
              value={observacao}
              onChange={(e) => setObservacao(e.target.value)}
              className="resize-none"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => { setModalDevolver(false); setObservacao('') }} disabled={loading}>
              Cancelar
            </Button>
            <Button
              size="sm"
              className="bg-red-600 hover:bg-red-700 text-white gap-1.5"
              onClick={handleDevolver}
              disabled={loading || !observacao.trim()}
            >
              {loading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
              Confirmar Devolucao
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
