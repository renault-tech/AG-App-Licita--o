'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Save, Wand2 } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'

import { atualizarETP, aprimorarETPComIA } from '@/lib/actions/etp'

export default function EditorETP({ etp, processoId }: { etp: any; processoId: string }) {
  const [formData, setFormData] = useState({
    descricao_necessidade: etp.descricao_necessidade || '',
    requisitos_contratacao: etp.requisitos_contratacao || '',
    levantamento_mercado: etp.levantamento_mercado || '',
    estimativa_quantidades: etp.estimativa_quantidades || '',
    justificativa_solucao: etp.justificativa_solucao || '',
    parcelamento: etp.parcelamento || '',
    resultados_pretendidos: etp.resultados_pretendidos || '',
    providencias: etp.providencias || '',
  })

  const [salvando, setSalvando] = useState(false)
  const [iaLoading, setIaLoading] = useState<string | null>(null)

  function handleChange(campo: string, valor: string) {
    setFormData(prev => ({ ...prev, [campo]: valor }))
  }

  async function handleSalvar() {
    setSalvando(true)
    const res = await atualizarETP(etp.id, formData)
    if (res.success) {
      toast.success('ETP salvo com sucesso!')
    } else {
      toast.error('Erro ao salvar ETP.')
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
    const res = await aprimorarETPComIA(textoOriginal, campo)
    
    if (res.success && res.texto) {
      setFormData(prev => ({ ...prev, [campo]: res.texto }))
      toast.success('Conteúdo do ETP aprimorado!')
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
            IA
          </Button>
        </div>
        <Textarea 
          rows={3}
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
        <CardTitle className="text-lg">Preenchimento Base do ETP</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <CampoComIA 
          id="descricao_necessidade" 
          label="1. Descrição da Necessidade" 
          placeholder="Descreva o problema a ser resolvido..." 
        />
        <CampoComIA 
          id="requisitos_contratacao" 
          label="2. Requisitos da Contratação" 
          placeholder="Normas aplicáveis, exigências técnicas, de sustentabilidade..." 
        />
        <CampoComIA 
          id="levantamento_mercado" 
          label="3. Levantamento de Mercado" 
          placeholder="Alternativas disponíveis, pesquisa de soluções..." 
        />
        <CampoComIA 
          id="estimativa_quantidades" 
          label="4. Estimativa das Quantidades" 
          placeholder="Memória de cálculo, base histórica de consumo..." 
        />
        <CampoComIA 
          id="justificativa_solucao" 
          label="5. Justificativa da Escolha da Solução" 
          placeholder="Por que esta solução é a mais vantajosa?" 
        />
        <CampoComIA 
          id="parcelamento" 
          label="6. Viabilidade de Parcelamento" 
          placeholder="É viável dividir o objeto para ampliar a competitividade?" 
        />
        <CampoComIA 
          id="resultados_pretendidos" 
          label="7. Resultados Pretendidos" 
          placeholder="Impactos esperados com a contratação..." 
        />
        <CampoComIA 
          id="providencias" 
          label="8. Providências Prévias" 
          placeholder="O que o órgão precisa fazer antes de receber o objeto?" 
        />
      </CardContent>
      <CardFooter className="bg-gray-50/50 p-4 border-t flex justify-end">
        <Button onClick={handleSalvar} disabled={salvando} className="bg-blue-700 hover:bg-blue-800 text-white">
          {salvando ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando...</> : <><Save className="w-4 h-4 mr-2" /> Salvar ETP</>}
        </Button>
      </CardFooter>
    </Card>
  )
}
