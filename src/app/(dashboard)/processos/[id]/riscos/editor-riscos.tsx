'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Save, Plus, Trash2, Wand2, ShieldAlert } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle, CardFooter, CardDescription } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

import { atualizarMapaRiscos, sugerirRiscosIA } from '@/lib/actions/riscos'

export default function EditorRiscos({ mapa, processoId }: { mapa: any; processoId: string }) {
  const [riscos, setRiscos] = useState<any[]>(
    Array.isArray(mapa.riscos) ? mapa.riscos : []
  )
  const [salvando, setSalvando] = useState(false)
  const [iaLoading, setIaLoading] = useState(false)

  const objetoProcesso = mapa.processos_licitatorios?.objeto || 'objeto indefinido'

  function addRisco() {
    setRiscos([...riscos, { id: Date.now().toString(), identificacao: '', probabilidade: 'Média', impacto: 'Médio', mitigacao: '' }])
  }

  function removeRisco(id: string) {
    setRiscos(riscos.filter(r => r.id !== id))
  }

  function atualizaRisco(id: string, campo: string, valor: string) {
    setRiscos(riscos.map(r => r.id === id ? { ...r, [campo]: valor } : r))
  }

  async function handleSalvar() {
    setSalvando(true)
    const res = await atualizarMapaRiscos(mapa.id, riscos)
    if (res.success) {
      toast.success('Mapa de riscos atualizado!')
    } else {
      toast.error('Erro ao salvar mapa.')
    }
    setSalvando(false)
  }

  async function handleSugerirIA() {
    setIaLoading(true)
    const res = await sugerirRiscosIA(objetoProcesso)
    if (res.success) {
      setRiscos([...riscos, ...res.riscos])
      toast.success('Riscos sugeridos pela IA adicionados!')
    } else {
      toast.error(res.error)
    }
    setIaLoading(false)
  }

  function colorirNivel(nivel: string) {
    switch(nivel) {
      case 'Alta': case 'Alto': return 'text-red-600 bg-red-50'
      case 'Média': case 'Médio': return 'text-amber-600 bg-amber-50'
      case 'Baixa': case 'Baixo': return 'text-green-600 bg-green-50'
      default: return 'text-gray-600 bg-gray-50'
    }
  }

  return (
    <Card className="shadow-sm border-gray-200">
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-lg">Matriz de Riscos</CardTitle>
          <CardDescription>Identifique ameaças e defina ações preventivas.</CardDescription>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={handleSugerirIA} disabled={iaLoading} className="text-purple-700 border-purple-200 bg-purple-50 hover:bg-purple-100">
            {iaLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Wand2 className="w-4 h-4 mr-2" />}
            Gerar Riscos com IA
          </Button>
          <Button variant="outline" size="sm" onClick={addRisco}>
            <Plus className="w-4 h-4 mr-2" /> Adicionar Manualmente
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {riscos.length === 0 && (
          <div className="flex flex-col items-center justify-center p-8 text-center text-gray-500 bg-gray-50 border border-dashed rounded-lg">
            <ShieldAlert className="w-10 h-10 text-gray-400 mb-2" />
            <p className="font-medium text-gray-600">Nenhum risco mapeado</p>
            <p className="text-sm">Clique em "Gerar Riscos com IA" ou adicione manualmente.</p>
          </div>
        )}

        {riscos.map((risco, index) => (
          <div key={risco.id} className="p-4 border rounded-lg bg-white relative shadow-sm">
            <Button 
              variant="ghost" 
              size="icon" 
              className="absolute top-2 right-2 text-red-500 hover:text-red-700 hover:bg-red-50"
              onClick={() => removeRisco(risco.id)}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
            
            <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
              <div className="md:col-span-12 space-y-2">
                <Label className="font-semibold text-gray-700">Risco {index + 1}: Identificação</Label>
                <Input 
                  placeholder="Ex: Frustração da licitação por falta de interessados..."
                  value={risco.identificacao}
                  onChange={(e) => atualizaRisco(risco.id, 'identificacao', e.target.value)}
                />
              </div>
              
              <div className="md:col-span-3 space-y-2">
                <Label>Probabilidade</Label>
                <Select value={risco.probabilidade} onValueChange={(v) => atualizaRisco(risco.id, 'probabilidade', v)}>
                  <SelectTrigger className={colorirNivel(risco.probabilidade)}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Baixa">Baixa</SelectItem>
                    <SelectItem value="Média">Média</SelectItem>
                    <SelectItem value="Alta">Alta</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-3 space-y-2">
                <Label>Impacto</Label>
                <Select value={risco.impacto} onValueChange={(v) => atualizaRisco(risco.id, 'impacto', v)}>
                  <SelectTrigger className={colorirNivel(risco.impacto)}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Baixo">Baixo</SelectItem>
                    <SelectItem value="Médio">Médio</SelectItem>
                    <SelectItem value="Alto">Alto</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="md:col-span-6 space-y-2">
                <Label>Ação de Mitigação</Label>
                <Textarea 
                  rows={2}
                  placeholder="Ação para prevenir ou contornar o risco..."
                  value={risco.mitigacao}
                  onChange={(e) => atualizaRisco(risco.id, 'mitigacao', e.target.value)}
                  className="resize-y"
                />
              </div>
            </div>
          </div>
        ))}
      </CardContent>

      <CardFooter className="bg-gray-50/50 p-4 border-t flex justify-end">
        <Button onClick={handleSalvar} disabled={salvando} className="bg-blue-700 hover:bg-blue-800 text-white">
          {salvando ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando...</> : <><Save className="w-4 h-4 mr-2" /> Salvar Mapa de Riscos</>}
        </Button>
      </CardFooter>
    </Card>
  )
}
