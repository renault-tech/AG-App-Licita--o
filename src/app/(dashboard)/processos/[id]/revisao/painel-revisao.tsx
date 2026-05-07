'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { CheckCircle2, RotateCcw, Loader2, AlertCircle, ExternalLink, Clock, FileCheck, FileX } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { aprovarDocumento, devolverDocumento } from '@/lib/actions/tramitacao'
import Link from 'next/link'

type TabelaDocumento = 'dfd' | 'etp' | 'termo_referencia' | 'mapa_riscos' | 'edital'

interface DocumentoRevisao {
  tabela: TabelaDocumento
  doc: { id: string; status: string; updated_at: string }
  nome: string
  slug: string
}

const STATUS_CONFIG: Record<string, { label: string; cor: string; icone: React.ElementType }> = {
  rascunho:   { label: 'Rascunho',    cor: 'bg-gray-100 text-gray-600 border-gray-200',   icone: Clock },
  em_revisao: { label: 'Aguardando',  cor: 'bg-amber-50 text-amber-700 border-amber-200', icone: Clock },
  assinado:   { label: 'Aprovado',    cor: 'bg-green-50 text-green-700 border-green-200', icone: FileCheck },
  devolvido:  { label: 'Devolvido',   cor: 'bg-red-50 text-red-700 border-red-200',       icone: FileX },
  publicado:  { label: 'Publicado',   cor: 'bg-blue-50 text-blue-700 border-blue-200',    icone: FileCheck },
}

export default function PainelRevisao({
  documentos,
  processoId,
}: {
  documentos: DocumentoRevisao[]
  processoId: string
}) {
  const [loading, setLoading] = useState<string | null>(null)
  const [modalDevolver, setModalDevolver] = useState<DocumentoRevisao | null>(null)
  const [apontamento, setApontamento] = useState('')

  const pendentes = documentos.filter(d => d.doc.status === 'em_revisao')
  const demais    = documentos.filter(d => d.doc.status !== 'em_revisao')

  async function handleAprovar(item: DocumentoRevisao) {
    setLoading(item.doc.id)
    const res = await aprovarDocumento(item.tabela, item.doc.id, processoId)
    if (res.success) {
      toast.success(`${item.nome} aprovado com sucesso.`)
    } else {
      toast.error(res.error ?? 'Erro ao aprovar.')
    }
    setLoading(null)
  }

  async function handleDevolver() {
    if (!modalDevolver || !apontamento.trim()) return
    setLoading(modalDevolver.doc.id)
    const res = await devolverDocumento(modalDevolver.tabela, modalDevolver.doc.id, processoId, apontamento.trim())
    if (res.success) {
      toast.success(`${modalDevolver.nome} devolvido para correcao.`)
      setModalDevolver(null)
      setApontamento('')
    } else {
      toast.error(res.error ?? 'Erro ao devolver.')
    }
    setLoading(null)
  }

  function formatarData(iso: string) {
    return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' })
  }

  function renderDocumento(item: DocumentoRevisao, destacar = false) {
    const cfg = STATUS_CONFIG[item.doc.status] ?? STATUS_CONFIG['rascunho']
    const Icone = cfg.icone
    const emRevisao = item.doc.status === 'em_revisao'

    return (
      <div
        key={item.tabela}
        className={`flex items-center justify-between p-4 rounded-xl border gap-4 ${
          destacar ? 'bg-amber-50/50 border-amber-200' : 'bg-white border-gray-200'
        }`}
      >
        <div className="flex items-center gap-3 min-w-0">
          <div className={`w-8 h-8 rounded-full flex items-center justify-center border ${cfg.cor} shrink-0`}>
            <Icone className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-800">{item.nome}</p>
            <p className="text-xs text-gray-400">Atualizado em {formatarData(item.doc.updated_at)}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${cfg.cor}`}>
            {cfg.label}
          </span>

          <Link href={`/processos/${processoId}/${item.slug}`} target="_blank">
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-gray-400 hover:text-gray-700">
              <ExternalLink className="w-3.5 h-3.5" />
            </Button>
          </Link>

          {emRevisao && (
            <>
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs gap-1.5 text-green-700 border-green-300 bg-green-50 hover:bg-green-100"
                onClick={() => handleAprovar(item)}
                disabled={loading === item.doc.id}
              >
                {loading === item.doc.id
                  ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  : <CheckCircle2 className="w-3.5 h-3.5" />}
                Aprovar
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="h-8 text-xs gap-1.5 text-red-700 border-red-300 bg-red-50 hover:bg-red-100"
                onClick={() => { setModalDevolver(item); setApontamento('') }}
                disabled={loading === item.doc.id}
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Devolver
              </Button>
            </>
          )}
        </div>
      </div>
    )
  }

  return (
    <>
      <Card className="border-gray-200 shadow-sm">
        <CardHeader className="border-b border-gray-100 pb-4">
          <CardTitle className="text-base font-semibold text-gray-800 flex items-center gap-2">
            <Clock className="w-4 h-4 text-amber-500" />
            Aguardando Revisao
            {pendentes.length > 0 && (
              <span className="ml-1 text-xs font-medium px-2 py-0.5 rounded-full bg-amber-100 text-amber-700 border border-amber-200">
                {pendentes.length}
              </span>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="p-4 space-y-3">
          {pendentes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center text-gray-400 bg-gray-50 border border-dashed border-gray-200 rounded-xl">
              <CheckCircle2 className="w-8 h-8 mb-2 text-green-400" />
              <p className="text-sm font-medium text-gray-500">Nenhum documento aguardando revisao</p>
            </div>
          ) : (
            pendentes.map(item => renderDocumento(item, true))
          )}
        </CardContent>
      </Card>

      {demais.length > 0 && (
        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="border-b border-gray-100 pb-4">
            <CardTitle className="text-base font-semibold text-gray-800">Demais Documentos</CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            {demais.map(item => renderDocumento(item, false))}
          </CardContent>
        </Card>
      )}

      <Dialog open={!!modalDevolver} onOpenChange={(open) => { if (!open) { setModalDevolver(null); setApontamento('') } }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500" />
              Devolver {modalDevolver?.nome} para Correcao
            </DialogTitle>
            <DialogDescription>
              Descreva os apontamentos para que o elaborador corrija o documento.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="apontamento-revisao" className="text-sm font-medium">
              Apontamentos <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="apontamento-revisao"
              rows={4}
              placeholder="Descreva as correcoes necessarias..."
              value={apontamento}
              onChange={(e) => setApontamento(e.target.value)}
              className="resize-none"
            />
          </div>
          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => { setModalDevolver(null); setApontamento('') }}
              disabled={!!loading}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              className="bg-red-600 hover:bg-red-700 text-white gap-1.5"
              onClick={handleDevolver}
              disabled={!!loading || !apontamento.trim()}
            >
              {loading
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <RotateCcw className="w-3.5 h-3.5" />}
              Confirmar Devolucao
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
