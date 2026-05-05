'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Save, Wand2 } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'

import { atualizarTR, aprimorarTRComIA } from '@/lib/actions/tr'

export default function EditorTR({ tr, processoId }: { tr: any; processoId: string }) {
  const [formData, setFormData] = useState({
    objeto: tr.objeto || '',
    fundamentacao: tr.fundamentacao || '',
    descricao: tr.descricao || '',
    requisitos_tecnicos: tr.requisitos_tecnicos || '',
    modelo_execucao: tr.modelo_execucao || '',
    modelo_gestao: tr.modelo_gestao || '',
    criterios_medicao: tr.criterios_medicao || '',
    forma_pagamento: tr.forma_pagamento || '',
    garantias: tr.garantias || '',
    sancoes: tr.sancoes || '',
  })

  const [salvando, setSalvando] = useState(false)
  const [iaLoading, setIaLoading] = useState<string | null>(null)

  function handleChange(campo: string, valor: string) {
    setFormData(prev => ({ ...prev, [campo]: valor }))
  }

  async function handleSalvar() {
    setSalvando(true)
    const res = await atualizarTR(tr.id, formData)
    if (res.success) {
      toast.success('TR salvo com sucesso!')
    } else {
      toast.error('Erro ao salvar TR.')
    }
    setSalvando(false)
  }

  async function handleAprimorarIA(campo: keyof typeof formData) {
    const textoOriginal = formData[campo]
    if (!textoOriginal || textoOriginal.length < 5) {
      toast.warning('O texto é muito curto para gerar valor com IA.')
      return
    }

    setIaLoading(campo)
    const res = await aprimorarTRComIA(textoOriginal, campo)
    
    if (res.success && res.texto) {
      setFormData(prev => ({ ...prev, [campo]: res.texto }))
      toast.success('Conteúdo do TR aprimorado!')
    } else {
      toast.error(res.error || 'Erro na IA.')
    }
    setIaLoading(null)
  }

  function CampoComIA({ id, label, placeholder }: { id: keyof typeof formData, label: string, placeholder: string }) {
    return (
      <div className="space-y-2">
        <div className="flex justify-between items-end">
          <Label className="font-semibold text-gray-700">{label}</Label>
          <Button 
            type="button" 
            variant="outline" 
            size="sm" 
            className="h-8 text-purple-700 border-purple-200 bg-purple-50 hover:bg-purple-100"
            onClick={() => handleAprimorarIA(id)}
            disabled={iaLoading === id}
          >
            {iaLoading === id ? <Loader2 className="w-3 h-3 mr-1 animate-spin" /> : <Wand2 className="w-3 h-3 mr-1" />}
            Aprimorar com IA
          </Button>
        </div>
        <Textarea 
          rows={4}
          placeholder={placeholder}
          value={formData[id]}
          onChange={(e) => handleChange(id, e.target.value)}
          className="resize-y"
        />
      </div>
    )
  }

  return (
    <Card className="shadow-sm border-gray-200">
      <CardHeader>
        <CardTitle className="text-lg">Cláusulas do Termo de Referência</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <CampoComIA id="objeto" label="1. Objeto" placeholder="Definição clara e precisa..." />
        <CampoComIA id="fundamentacao" label="2. Fundamentação da Contratação" placeholder="Referência ao ETP e base legal..." />
        <CampoComIA id="descricao" label="3. Descrição da Solução" placeholder="Especificações técnicas detalhadas..." />
        <CampoComIA id="requisitos_tecnicos" label="4. Requisitos da Contratação" placeholder="Condições de sustentabilidade, normas da ABNT..." />
        <CampoComIA id="modelo_execucao" label="5. Modelo de Execução do Objeto" placeholder="Cronograma, local de entrega/execução..." />
        <CampoComIA id="modelo_gestao" label="6. Modelo de Gestão do Contrato" placeholder="Designação de fiscais e rotinas de acompanhamento..." />
        <CampoComIA id="criterios_medicao" label="7. Critérios de Medição e Recebimento" placeholder="Forma como o serviço/produto será atestado..." />
        <CampoComIA id="forma_pagamento" label="8. Forma de Pagamento" placeholder="Condições, prazos e documentos exigidos para liquidação..." />
        <CampoComIA id="garantias" label="9. Garantias" placeholder="Garantia contratual, prazos de validade do produto..." />
        <CampoComIA id="sancoes" label="10. Sanções Administrativas" placeholder="Penalidades por atraso ou inexecução..." />
      </CardContent>
      <CardFooter className="bg-gray-50/50 p-4 border-t flex justify-end">
        <Button onClick={handleSalvar} disabled={salvando} className="bg-blue-700 hover:bg-blue-800 text-white">
          {salvando ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando...</> : <><Save className="w-4 h-4 mr-2" /> Salvar TR</>}
        </Button>
      </CardFooter>
    </Card>
  )
}
