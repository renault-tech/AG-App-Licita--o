'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Save, Wand2, CheckCircle, AlertCircle, XCircle, Clock, ChevronLeft } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { salvarParecer, gerarParecerIA } from '@/lib/actions/parecer'
import { StatusParecer } from '@/types/database'
import Link from 'next/link'

const STATUS_CONFIG: Record<StatusParecer, { label: string; icon: React.ElementType; classes: string; bg: string }> = {
  pendente:               { label: 'Pendente de Analise',    icon: Clock,         classes: 'text-gray-600',   bg: 'bg-gray-50 border-gray-200' },
  aprovado:               { label: 'Aprovado (Regular)',     icon: CheckCircle,   classes: 'text-green-600',  bg: 'bg-green-50 border-green-200' },
  aprovado_com_ressalvas: { label: 'Aprovado com Ressalvas', icon: AlertCircle,   classes: 'text-amber-600',  bg: 'bg-amber-50 border-amber-200' },
  devolvido:              { label: 'Devolvido para Correcao',icon: XCircle,       classes: 'text-red-600',    bg: 'bg-red-50 border-red-200' },
}

export default function EditorParecer({ parecer, processoId }: { parecer: any; processoId: string }) {
  const [conteudo, setConteudo] = useState<string>(parecer.conteudo || '')
  const [status, setStatus]     = useState<StatusParecer>(parecer.status || 'pendente')
  const [salvando, setSalvando] = useState(false)
  const [iaLoading, setIaLoading] = useState(false)
  const [geradoPorIA, setGeradoPorIA] = useState(false)

  const statusInfo = STATUS_CONFIG[status]
  const StatusIcon = statusInfo.icon

  async function handleSalvar() {
    setSalvando(true)
    const res = await salvarParecer(parecer.id, conteudo, status)
    res.success ? toast.success('Parecer salvo.') : toast.error(res.error || 'Erro ao salvar.')
    setSalvando(false)
  }

  async function handleGerarIA() {
    setIaLoading(true)
    const res = await gerarParecerIA(processoId)
    if (res.success) {
      setConteudo(res.conteudo)
      setStatus(res.statusSugerido)
      setGeradoPorIA(true)
      toast.success('Minuta gerada pela IA. Revise antes de salvar.')
    } else {
      toast.error(res.error)
    }
    setIaLoading(false)
  }

  return (
    <div className="space-y-4">

      {/* Card principal do parecer */}
      <Card className="border-gray-200 shadow-sm">
        <CardHeader className="border-b border-gray-100 pb-4">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <div>
              <CardTitle className="text-base font-semibold text-gray-800">Redacao do Parecer Juridico</CardTitle>
              {parecer.processos_licitatorios?.objeto && (
                <CardDescription className="text-xs mt-0.5 text-gray-500">
                  Objeto: {parecer.processos_licitatorios.objeto}
                </CardDescription>
              )}
            </div>
            <Button
              variant="outline"
              onClick={handleGerarIA}
              disabled={iaLoading}
              className="h-8 text-xs text-purple-700 border-purple-200 bg-purple-50 hover:bg-purple-100 gap-1.5 shrink-0"
            >
              {iaLoading
                ? <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Gerando...</>
                : <><Wand2 className="w-3.5 h-3.5" /> Gerar Minuta com IA</>}
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-5 space-y-4">
          {geradoPorIA && (
            <div className="flex items-center gap-2 p-3 bg-purple-50 border border-purple-100 rounded-lg text-xs text-purple-700">
              <Wand2 className="w-3.5 h-3.5 shrink-0" />
              Conteudo gerado pela IA. Revise e ajuste conforme necessario antes de salvar.
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-sm font-medium text-gray-700">Texto do Parecer</Label>
            <Textarea
              rows={16}
              placeholder={'Ementa:\n\nRelatorio:\n\nFundamentacao:\n\nConclusao:'}
              value={conteudo}
              onChange={(e) => setConteudo(e.target.value)}
              className="font-mono text-sm text-gray-800 leading-relaxed resize-y"
            />
          </div>

          {/* Status do parecer */}
          <div className={`p-4 border rounded-xl space-y-3 ${statusInfo.bg}`}>
            <Label className="text-sm font-semibold text-gray-700">Conclusao do Parecer</Label>
            <div className="flex items-center gap-3">
              <StatusIcon className={`w-5 h-5 shrink-0 ${statusInfo.classes}`} />
              <Select value={status} onValueChange={(v) => setStatus(v as StatusParecer)}>
                <SelectTrigger className="bg-white w-full max-w-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendente">Pendente de Analise</SelectItem>
                  <SelectItem value="aprovado">Aprovado (Regular)</SelectItem>
                  <SelectItem value="aprovado_com_ressalvas">Aprovado com Ressalvas</SelectItem>
                  <SelectItem value="devolvido">Devolvido para Correcao</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {status === 'devolvido' && (
              <p className="text-xs text-red-700 mt-1">
                Ao salvar como devolvido, o setor de compras sera notificado para realizar os ajustes apontados.
              </p>
            )}
            {status === 'aprovado' && (
              <p className="text-xs text-green-700 mt-1">
                Parecer favoravel. O processo esta apto para autorizacao da autoridade competente.
              </p>
            )}
          </div>
        </CardContent>

        <CardFooter className="flex items-center justify-between border-t border-gray-100 bg-gray-50/50 px-6 py-4 rounded-b-xl gap-3">
          <Link href={`/processos/${processoId}/edital`}>
            <Button variant="outline" className="gap-1.5 h-9 text-sm">
              <ChevronLeft className="w-4 h-4" /> Edital
            </Button>
          </Link>
          <Button
            onClick={handleSalvar}
            disabled={salvando}
            className="bg-blue-700 hover:bg-blue-800 text-white gap-2 h-9 text-sm"
          >
            {salvando
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</>
              : <><Save className="w-4 h-4" /> Salvar Parecer</>}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
