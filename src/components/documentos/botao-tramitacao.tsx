'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Send, CheckCircle2, RotateCcw, Loader2, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
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
import { enviarParaRevisao, aprovarDocumento, devolverDocumento } from '@/lib/actions/tramitacao'
import type { PapelUsuario } from '@/types/database'

type TabelaDocumento = 'dfd' | 'etp' | 'termo_referencia' | 'mapa_riscos' | 'edital'
type StatusDocumento = 'rascunho' | 'em_revisao' | 'assinado' | 'publicado' | 'devolvido'

interface BotaoTramitacaoProps {
  tabela: TabelaDocumento
  documentoId: string
  processoId: string
  statusAtual: StatusDocumento
  papelUsuario: PapelUsuario
}

const STATUS_LABEL: Record<StatusDocumento, string> = {
  rascunho:   'Rascunho',
  em_revisao: 'Em Revisao',
  assinado:   'Aprovado',
  publicado:  'Publicado',
  devolvido:  'Devolvido',
}

const STATUS_COR: Record<StatusDocumento, string> = {
  rascunho:   'bg-gray-100 text-gray-600 border-gray-200',
  em_revisao: 'bg-amber-50 text-amber-700 border-amber-200',
  assinado:   'bg-green-50 text-green-700 border-green-200',
  publicado:  'bg-blue-50 text-blue-700 border-blue-200',
  devolvido:  'bg-red-50 text-red-700 border-red-200',
}

export default function BotaoTramitacao({
  tabela,
  documentoId,
  processoId,
  statusAtual,
  papelUsuario,
}: BotaoTramitacaoProps) {
  const [loading, setLoading] = useState(false)
  const [modalDevolver, setModalDevolver] = useState(false)
  const [apontamento, setApontamento] = useState('')

  const ehAnalista = papelUsuario === 'setor_licitacao' || papelUsuario === 'admin_organizacao' || papelUsuario === 'admin_plataforma'
  const ehRequisitante = papelUsuario === 'requisitante' || papelUsuario === 'procurador' || papelUsuario === 'gestor_publico'

  async function handleEnviarParaRevisao() {
    setLoading(true)
    const res = await enviarParaRevisao(tabela, documentoId, processoId)
    if (res.success) {
      toast.success('Documento enviado para revisao do setor de licitacoes.')
    } else {
      toast.error(res.error ?? 'Erro ao enviar para revisao.')
    }
    setLoading(false)
  }

  async function handleAprovar() {
    setLoading(true)
    const res = await aprovarDocumento(tabela, documentoId, processoId)
    if (res.success) {
      toast.success('Documento aprovado com sucesso.')
    } else {
      toast.error(res.error ?? 'Erro ao aprovar documento.')
    }
    setLoading(false)
  }

  async function handleDevolver() {
    if (!apontamento.trim()) {
      toast.warning('Descreva o motivo da devolucao antes de confirmar.')
      return
    }
    setLoading(true)
    const res = await devolverDocumento(tabela, documentoId, processoId, apontamento.trim())
    if (res.success) {
      toast.success('Documento devolvido para correcao.')
      setModalDevolver(false)
      setApontamento('')
    } else {
      toast.error(res.error ?? 'Erro ao devolver documento.')
    }
    setLoading(false)
  }

  return (
    <div className="flex items-center gap-2">
      {/* Badge de status atual */}
      <span className={`text-xs font-medium px-2.5 py-1 rounded-full border ${STATUS_COR[statusAtual]}`}>
        {STATUS_LABEL[statusAtual]}
      </span>

      {/* Requisitante: pode enviar para revisao se rascunho ou devolvido */}
      {ehRequisitante && (statusAtual === 'rascunho' || statusAtual === 'devolvido') && (
        <Button
          size="sm"
          variant="outline"
          className="h-8 text-xs gap-1.5 text-amber-700 border-amber-300 bg-amber-50 hover:bg-amber-100"
          onClick={handleEnviarParaRevisao}
          disabled={loading}
        >
          {loading
            ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
            : <Send className="w-3.5 h-3.5" />}
          Enviar para Revisao
        </Button>
      )}

      {/* Analista: pode aprovar ou devolver se em_revisao */}
      {ehAnalista && statusAtual === 'em_revisao' && (
        <>
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs gap-1.5 text-green-700 border-green-300 bg-green-50 hover:bg-green-100"
            onClick={handleAprovar}
            disabled={loading}
          >
            {loading
              ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
              : <CheckCircle2 className="w-3.5 h-3.5" />}
            Aprovar
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="h-8 text-xs gap-1.5 text-red-700 border-red-300 bg-red-50 hover:bg-red-100"
            onClick={() => setModalDevolver(true)}
            disabled={loading}
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Devolver
          </Button>
        </>
      )}

      {/* Modal de devolucao com apontamento obrigatorio */}
      <Dialog open={modalDevolver} onOpenChange={setModalDevolver}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-500" />
              Devolver para Correcao
            </DialogTitle>
            <DialogDescription>
              Descreva os apontamentos para que o elaborador possa corrigir o documento.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 py-2">
            <Label htmlFor="apontamento" className="text-sm font-medium">
              Apontamentos <span className="text-red-500">*</span>
            </Label>
            <Textarea
              id="apontamento"
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
              onClick={() => { setModalDevolver(false); setApontamento('') }}
              disabled={loading}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              className="bg-red-600 hover:bg-red-700 text-white gap-1.5"
              onClick={handleDevolver}
              disabled={loading || !apontamento.trim()}
            >
              {loading
                ? <Loader2 className="w-3.5 h-3.5 animate-spin" />
                : <RotateCcw className="w-3.5 h-3.5" />}
              Confirmar Devolucao
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
