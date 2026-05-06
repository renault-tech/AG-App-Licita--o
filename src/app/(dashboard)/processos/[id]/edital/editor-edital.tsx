'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Save, Wand2, CheckSquare } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'

import { atualizarEdital, revisarEditalComIA } from '@/lib/actions/edital'

type Secao = { id: string; titulo: string; texto: string }

export default function EditorEdital({ edital, processoId }: { edital: any; processoId: string }) {
  const modalidade = edital.processos_licitatorios?.modalidade || 'Licitação'
  const [secoes, setSecoes] = useState<Secao[]>(
    Array.isArray(edital.conteudo) ? edital.conteudo : []
  )

  const [salvando, setSalvando] = useState(false)
  const [iaLoadingId, setIaLoadingId] = useState<string | null>(null)

  function atualizaSecao(id: string, campo: 'titulo' | 'texto', valor: string) {
    setSecoes(secoes.map(s => s.id === id ? { ...s, [campo]: valor } : s))
  }

  async function handleSalvar() {
    setSalvando(true)
    const res = await atualizarEdital(edital.id, secoes)
    if (res.success) {
      toast.success('Edital salvo com sucesso!')
    } else {
      toast.error('Erro ao salvar Edital.')
    }
    setSalvando(false)
  }

  async function handleRevisarIA(id: string) {
    const secao = secoes.find(s => s.id === id)
    if (!secao || secao.texto.length < 5) {
      toast.warning('Texto curto demais para revisão.')
      return
    }

    setIaLoadingId(id)
    const res = await revisarEditalComIA(secao.texto, modalidade)
    if (res.success && res.texto) {
      atualizaSecao(id, 'texto', res.texto)
      toast.success('Cláusula revisada pela IA!')
    } else {
      toast.error(res.error || 'Erro na IA.')
    }
    setIaLoadingId(null)
  }

  return (
    <Card className="shadow-sm border-gray-200">
      <CardHeader>
        <CardTitle className="text-lg">Cláusulas e Seções do Edital</CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {secoes.map((secao) => (
          <div key={secao.id} className="p-4 border rounded-lg bg-white shadow-sm space-y-4">
            <div className="flex flex-col md:flex-row gap-4 items-start md:items-end justify-between">
              <div className="w-full md:w-1/3 space-y-2">
                <Label className="text-gray-500">Título da Seção</Label>
                <Input 
                  value={secao.titulo}
                  onChange={(e) => atualizaSecao(secao.id, 'titulo', e.target.value)}
                  className="font-semibold text-gray-700"
                />
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="text-purple-700 border-purple-200 bg-purple-50 hover:bg-purple-100 whitespace-nowrap"
                onClick={() => handleRevisarIA(secao.id)}
                disabled={iaLoadingId === secao.id}
              >
                {iaLoadingId === secao.id ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Wand2 className="w-4 h-4 mr-2" />}
                Revisão Jurídica via IA
              </Button>
            </div>
            
            <div className="space-y-2">
              <Textarea 
                rows={5}
                value={secao.texto}
                onChange={(e) => atualizaSecao(secao.id, 'texto', e.target.value)}
                className="resize-y text-gray-800"
              />
            </div>
          </div>
        ))}
      </CardContent>

      <CardFooter className="bg-gray-50/50 p-4 border-t flex justify-end">
        <Button onClick={handleSalvar} disabled={salvando} className="bg-blue-700 hover:bg-blue-800 text-white">
          {salvando ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando...</> : <><CheckSquare className="w-4 h-4 mr-2" /> Salvar Edital</>}
        </Button>
      </CardFooter>
    </Card>
  )
}
