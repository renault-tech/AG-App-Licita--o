'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Save, Wand2, CheckCircle, AlertCircle, XCircle } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

import { salvarParecer, gerarParecerIA } from '@/lib/actions/parecer'
import { StatusParecer } from '@/types/database'

export default function EditorParecer({ parecer, processoId }: { parecer: any; processoId: string }) {
  const [conteudo, setConteudo] = useState(parecer.conteudo || '')
  const [status, setStatus] = useState<StatusParecer>(parecer.status || 'pendente')
  
  const [salvando, setSalvando] = useState(false)
  const [iaLoading, setIaLoading] = useState(false)

  async function handleSalvar() {
    setSalvando(true)
    const res = await salvarParecer(parecer.id, conteudo, status)
    if (res.success) {
      toast.success('Parecer salvo e atualizado com sucesso!')
    } else {
      toast.error(res.error || 'Erro ao salvar o parecer.')
    }
    setSalvando(false)
  }

  async function handleGerarIA() {
    setIaLoading(true)
    const res = await gerarParecerIA(processoId)
    if (res.success) {
      setConteudo(res.conteudo)
      setStatus(res.statusSugerido)
      toast.success('Parecer base gerado com sucesso pela IA!')
    } else {
      toast.error(res.error)
    }
    setIaLoading(false)
  }

  function getStatusIcon() {
    switch(status) {
      case 'aprovado': return <CheckCircle className="w-5 h-5 text-green-600" />
      case 'aprovado_com_ressalvas': return <AlertCircle className="w-5 h-5 text-amber-600" />
      case 'devolvido': return <XCircle className="w-5 h-5 text-red-600" />
      default: return null
    }
  }

  return (
    <div className="space-y-6">
      <Card className="shadow-sm border-gray-200">
        <CardHeader className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <CardTitle className="text-lg">Redação do Parecer</CardTitle>
            <CardDescription>Objeto: {parecer.processos_licitatorios?.objeto}</CardDescription>
          </div>
          <Button 
            variant="outline" 
            onClick={handleGerarIA} 
            disabled={iaLoading} 
            className="text-purple-700 border-purple-200 bg-purple-50 hover:bg-purple-100 w-full sm:w-auto"
          >
            {iaLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Wand2 className="w-4 h-4 mr-2" />}
            Gerar Minuta com IA
          </Button>
        </CardHeader>
        
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Textarea 
              rows={15}
              placeholder="Ementa: ...&#10;Relatório: ...&#10;Fundamentação: ...&#10;Conclusão: ..."
              value={conteudo}
              onChange={(e) => setConteudo(e.target.value)}
              className="font-serif text-gray-800 leading-relaxed"
            />
          </div>

          <div className="bg-gray-50 border rounded-lg p-4 space-y-3">
            <Label className="text-gray-700 font-semibold">Conclusão / Status do Parecer</Label>
            <div className="flex items-center gap-4">
              {getStatusIcon()}
              <Select value={status} onValueChange={(v: any) => setStatus(v)}>
                <SelectTrigger className="w-[300px] bg-white">
                  <SelectValue placeholder="Selecione a conclusão" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pendente">Pendente de Análise</SelectItem>
                  <SelectItem value="aprovado">Aprovado (Regular)</SelectItem>
                  <SelectItem value="aprovado_com_ressalvas">Aprovado com Ressalvas</SelectItem>
                  <SelectItem value="devolvido">Devolvido para Correção</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {status === 'devolvido' && (
              <p className="text-sm text-red-600 mt-2">
                * Ao marcar como devolvido, o setor de compras será notificado para realizar os ajustes apontados.
              </p>
            )}
          </div>
        </CardContent>

        <CardFooter className="bg-gray-50/50 p-4 border-t flex justify-end">
          <Button onClick={handleSalvar} disabled={salvando} className="bg-blue-700 hover:bg-blue-800 text-white">
            {salvando ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando...</> : <><Save className="w-4 h-4 mr-2" /> Salvar Parecer</>}
          </Button>
        </CardFooter>
      </Card>
    </div>
  )
}
