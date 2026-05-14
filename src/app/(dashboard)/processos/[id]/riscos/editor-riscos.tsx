'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Save, Plus, Trash2, Wand2, ShieldAlert, ChevronLeft, ChevronRight } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { atualizarMapaRiscos, sugerirRiscosIA } from '@/lib/actions/riscos'
import BotaoTramitacao from '@/components/documentos/botao-tramitacao'
import Link from 'next/link'
import type { PapelUsuario } from '@/types/database'

const NIVEL_CLASSES: Record<string, string> = {
  Alta:  'bg-red-50 text-red-700 border-red-200',
  Alto:  'bg-red-50 text-red-700 border-red-200',
  Média: 'bg-amber-50 text-amber-700 border-amber-200',
  Médio: 'bg-amber-50 text-amber-700 border-amber-200',
  Baixa: 'bg-green-50 text-green-700 border-green-200',
  Baixo: 'bg-green-50 text-green-700 border-green-200',
}

// Matriz probabilidade x impacto -> nivel de risco
function calcularNivel(prob: string, impacto: string): string {
  const alto = ['Alta', 'Alto']
  const medio = ['Média', 'Médio']
  if (alto.includes(prob) && alto.includes(impacto)) return 'Crítico'
  if (alto.includes(prob) || alto.includes(impacto)) return 'Alto'
  if (medio.includes(prob) && medio.includes(impacto)) return 'Moderado'
  return 'Baixo'
}

const NIVEL_BADGE: Record<string, string> = {
  Crítico:  'bg-red-100 text-red-800 border-red-300',
  Alto:     'bg-orange-50 text-orange-700 border-orange-200',
  Moderado: 'bg-amber-50 text-amber-700 border-amber-200',
  Baixo:    'bg-green-50 text-green-700 border-green-200',
}

export default function EditorRiscos({ mapa, processoId, papelUsuario, podeEditar = true }: { mapa: any; processoId: string; papelUsuario: PapelUsuario; podeEditar?: boolean }) {
  const [riscos, setRiscos] = useState<any[]>(Array.isArray(mapa.riscos) ? mapa.riscos : [])
  const [salvando, setSalvando]   = useState(false)
  const [iaLoading, setIaLoading] = useState(false)

  const objeto = mapa.processos_licitatorios?.objeto || 'objeto indefinido'

  function addRisco() {
    setRiscos(prev => [...prev, {
      id: Date.now().toString(),
      identificacao: '',
      probabilidade: 'Média',
      impacto: 'Médio',
      mitigacao: '',
    }])
  }

  function removeRisco(id: string) {
    setRiscos(prev => prev.filter(r => r.id !== id))
  }

  function atualiza(id: string, campo: string, valor: string) {
    setRiscos(prev => prev.map(r => r.id === id ? { ...r, [campo]: valor } : r))
  }

  async function handleSalvar() {
    setSalvando(true)
    const res = await atualizarMapaRiscos(mapa.id, riscos)
    res.success ? toast.success('Mapa de riscos salvo.') : toast.error('Erro ao salvar.')
    setSalvando(false)
  }

  async function handleIA() {
    setIaLoading(true)
    const res = await sugerirRiscosIA(objeto)
    if (res.success) {
      setRiscos(prev => [...prev, ...res.riscos])
      toast.success(`${res.riscos.length} riscos adicionados pela IA.`)
    } else {
      toast.error(res.error)
    }
    setIaLoading(false)
  }

  return (
    <Card className="border-gray-200 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between border-b border-gray-100 pb-4">
        <div>
          <CardTitle className="text-base font-semibold text-gray-800">Matriz de Riscos</CardTitle>
          <CardDescription className="text-xs mt-0.5">
            {riscos.length === 0 ? 'Nenhum risco mapeado ainda.' : `${riscos.length} risco(s) identificado(s)`}
          </CardDescription>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleIA}
            disabled={iaLoading || !podeEditar}
            className="h-8 text-xs text-purple-700 border-purple-200 bg-purple-50 hover:bg-purple-100 gap-1.5"
          >
            {iaLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Wand2 className="w-3.5 h-3.5" />}
            Sugerir com IA
          </Button>
          <Button variant="outline" size="sm" onClick={addRisco} disabled={!podeEditar} className="h-8 text-xs gap-1.5">
            <Plus className="w-3.5 h-3.5" /> Adicionar
          </Button>
        </div>
      </CardHeader>

      <CardContent className="p-5 space-y-3">
        {!podeEditar && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            Visualizacao somente leitura. Seu perfil nao tem permissao de editar este documento.
          </p>
        )}
        {riscos.length === 0 && (
          <div className="flex flex-col items-center justify-center py-12 text-center text-gray-400 bg-gray-50 border border-dashed border-gray-200 rounded-xl">
            <ShieldAlert className="w-10 h-10 mb-3 text-gray-300" />
            <p className="text-sm font-medium text-gray-500">Nenhum risco identificado</p>
            <p className="text-xs mt-1">Clique em "Sugerir com IA" ou adicione manualmente.</p>
          </div>
        )}

        {riscos.map((risco, index) => {
          const nivel = calcularNivel(risco.probabilidade, risco.impacto)
          return (
            <div key={risco.id} className="p-4 border border-gray-200 rounded-xl bg-white space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
                    Risco {index + 1}
                  </span>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${NIVEL_BADGE[nivel] ?? ''}`}>
                    {nivel}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 w-7 p-0 text-red-400 hover:text-red-600 hover:bg-red-50"
                  onClick={() => removeRisco(risco.id)}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </Button>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-gray-600">Identificação do Risco</Label>
                <Input
                  placeholder="Ex: Frustração da licitação por falta de interessados..."
                  value={risco.identificacao}
                  onChange={(e) => atualiza(risco.id, 'identificacao', e.target.value)}
                  className="text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-600">Probabilidade</Label>
                  <Select value={risco.probabilidade} onValueChange={(v) => atualiza(risco.id, 'probabilidade', v)}>
                    <SelectTrigger className={`h-8 text-sm border ${NIVEL_CLASSES[risco.probabilidade] ?? ''}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Baixa">Baixa</SelectItem>
                      <SelectItem value="Média">Média</SelectItem>
                      <SelectItem value="Alta">Alta</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-gray-600">Impacto</Label>
                  <Select value={risco.impacto} onValueChange={(v) => atualiza(risco.id, 'impacto', v)}>
                    <SelectTrigger className={`h-8 text-sm border ${NIVEL_CLASSES[risco.impacto] ?? ''}`}>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Baixo">Baixo</SelectItem>
                      <SelectItem value="Médio">Médio</SelectItem>
                      <SelectItem value="Alto">Alto</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1.5">
                <Label className="text-xs text-gray-600">Ação de Mitigação</Label>
                <Textarea
                  rows={2}
                  placeholder="Ação para prevenir ou reduzir o risco..."
                  value={risco.mitigacao}
                  onChange={(e) => atualiza(risco.id, 'mitigacao', e.target.value)}
                  className="resize-y text-sm"
                />
              </div>
            </div>
          )
        })}
      </CardContent>

      <CardFooter className="flex items-center justify-between border-t border-gray-100 bg-gray-50/50 px-6 py-4 rounded-b-xl gap-3">
        <div className="flex items-center gap-2">
          <Link href={`/processos/${processoId}/tr`}>
            <Button variant="outline" className="gap-1.5 h-9 text-sm">
              <ChevronLeft className="w-4 h-4" /> TR
            </Button>
          </Link>
          <BotaoTramitacao
            tabela="mapa_riscos"
            documentoId={mapa.id}
            processoId={processoId}
            statusAtual={mapa.status}
            papelUsuario={papelUsuario}
          />
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleSalvar} disabled={salvando || !podeEditar} className="bg-blue-700 hover:bg-blue-800 text-white gap-2 h-9 text-sm">
            {salvando ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</> : <><Save className="w-4 h-4" /> Salvar Riscos</>}
          </Button>
          <Link href={`/processos/${processoId}/edital`}>
            <Button variant="outline" className="gap-1.5 h-9 text-sm">
              Próxima <ChevronRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </CardFooter>
    </Card>
  )
}
