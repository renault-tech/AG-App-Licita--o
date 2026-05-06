'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Save, Wand2 } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import BotaoAssinatura from '@/components/assinatura/botao-assinatura'

import { atualizarDFD, aprimorarTextoIA } from '@/lib/actions/dfd'

export default function EditorDFD({ dfd, processoId }: { dfd: any; processoId: string }) {
  const [formData, setFormData] = useState({
    responsavel_elaboracao: dfd.responsavel_elaboracao || '',
    descricao_necessidade: dfd.descricao_necessidade || '',
    justificativa: dfd.justificativa || '',
    prazo_contratacao: dfd.prazo_contratacao || '',
    observacoes: dfd.observacoes || '',
  })

  const [salvando, setSalvando] = useState(false)
  const [iaLoading, setIaLoading] = useState<string | null>(null)

  function handleChange(campo: string, valor: string) {
    setFormData(prev => ({ ...prev, [campo]: valor }))
  }

  async function handleSalvar() {
    setSalvando(true)
    const res = await atualizarDFD(dfd.id, formData)
    if (res.success) {
      toast.success('DFD atualizado com sucesso!')
    } else {
      toast.error('Erro ao salvar DFD.')
    }
    setSalvando(false)
  }

  async function handleAprimorarIA(campo: keyof typeof formData) {
    const textoOriginal = formData[campo]
    if (!textoOriginal || textoOriginal.length < 10) {
      toast.error('O texto é muito curto para ser aprimorado pela IA.')
      return
    }

    setIaLoading(campo)
    const res = await aprimorarTextoIA(textoOriginal, campo)
    
    if (res.success) {
      setFormData(prev => ({ ...prev, [campo]: res.texto }))
      toast.success('Texto aprimorado pela IA!')
    } else {
      toast.error(res.error)
    }
    setIaLoading(null)
  }

  return (
    <Card className="shadow-sm border-gray-200">
      <CardHeader>
        <CardTitle className="text-lg">Edição do DFD</CardTitle>
      </CardHeader>

      <CardContent className="space-y-6">
        <div className="space-y-2">
          <Label>Responsável pela Elaboração</Label>
          <Input 
            value={formData.responsavel_elaboracao}
            onChange={(e) => handleChange('responsavel_elaboracao', e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-end">
            <Label>Descrição da Necessidade (Objeto)</Label>
            <Button 
              type="button" 
              variant="outline" 
              size="sm" 
              className="h-8 text-purple-700 border-purple-200 bg-purple-50 hover:bg-purple-100"
              onClick={() => handleAprimorarIA('descricao_necessidade')}
              disabled={iaLoading === 'descricao_necessidade'}
            >
              {iaLoading === 'descricao_necessidade' ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Wand2 className="w-3 h-3 mr-1" />}
              Aprimorar com IA
            </Button>
          </div>
          <Textarea 
            rows={4}
            value={formData.descricao_necessidade}
            onChange={(e) => handleChange('descricao_necessidade', e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <div className="flex justify-between items-end">
            <Label>Justificativa da Contratação</Label>
            <Button 
              type="button" 
              variant="outline" 
              size="sm" 
              className="h-8 text-purple-700 border-purple-200 bg-purple-50 hover:bg-purple-100"
              onClick={() => handleAprimorarIA('justificativa')}
              disabled={iaLoading === 'justificativa'}
            >
              {iaLoading === 'justificativa' ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Wand2 className="w-3 h-3 mr-1" />}
              Aprimorar com IA
            </Button>
          </div>
          <Textarea 
            rows={5}
            value={formData.justificativa}
            onChange={(e) => handleChange('justificativa', e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Prazo Esperado de Contratação</Label>
          <Input 
            value={formData.prazo_contratacao}
            onChange={(e) => handleChange('prazo_contratacao', e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label>Observações Adicionais</Label>
          <Textarea 
            rows={3}
            value={formData.observacoes}
            onChange={(e) => handleChange('observacoes', e.target.value)}
          />
        </div>

      </CardContent>

      <CardFooter className="flex items-center justify-between border-t p-4 bg-gray-50/50 rounded-b-lg mt-4">
        <BotaoAssinatura 
          tabelaOrigem="dfd" 
          documentoId={dfd.id} 
          processoId={processoId} 
          statusAtual={dfd.status} 
        />
        <Button onClick={handleSalvar} disabled={salvando || dfd.status === 'assinado'} className="bg-blue-700 hover:bg-blue-800 text-white">
          {salvando ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando...</> : <><Save className="w-4 h-4 mr-2" /> Salvar Alterações</>}
        </Button>
      </CardFooter>
    </Card>
  )
}
