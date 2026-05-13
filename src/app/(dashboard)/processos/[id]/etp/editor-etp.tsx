'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Save, Wand2, ChevronLeft, ChevronRight } from 'lucide-react'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { atualizarETP, aprimorarETPComIA } from '@/lib/actions/etp'
import BotaoTramitacao from '@/components/documentos/botao-tramitacao'
import Link from 'next/link'
import type { PapelUsuario } from '@/types/database'

type FormData = {
  descricao_necessidade:  string
  requisitos_contratacao: string
  levantamento_mercado:   string
  estimativa_quantidades: string
  justificativa_solucao:  string
  parcelamento:           string
  resultados_pretendidos: string
  providencias:           string
}

const SECOES = [
  { id: 'descricao_necessidade',  num: '1', label: 'Descricao da Necessidade',         placeholder: 'Descreva o problema ou necessidade a ser resolvida...' },
  { id: 'requisitos_contratacao', num: '2', label: 'Requisitos da Contratacao',         placeholder: 'Normas aplicaveis, exigencias tecnicas, sustentabilidade...' },
  { id: 'levantamento_mercado',   num: '3', label: 'Levantamento de Mercado',           placeholder: 'Alternativas disponiveis, pesquisa de solucoes existentes...' },
  { id: 'estimativa_quantidades', num: '4', label: 'Estimativa das Quantidades',        placeholder: 'Memoria de calculo, base historica de consumo...' },
  { id: 'justificativa_solucao',  num: '5', label: 'Justificativa da Solucao Escolhida',placeholder: 'Por que esta solucao e a mais vantajosa para a Administracao?' },
  { id: 'parcelamento',           num: '6', label: 'Viabilidade de Parcelamento',       placeholder: 'E possivel dividir o objeto para ampliar a competitividade?' },
  { id: 'resultados_pretendidos', num: '7', label: 'Resultados Pretendidos',            placeholder: 'Impactos e beneficios esperados com a contratacao...' },
  { id: 'providencias',           num: '8', label: 'Providencias Previas',             placeholder: 'O que o orgao precisa providenciar antes de receber o objeto?' },
] as const

export default function EditorETP({ etp, processoId, papelUsuario, podeEditar = true }: { etp: any; processoId: string; papelUsuario: PapelUsuario; podeEditar?: boolean }) {
  const [formData, setFormData] = useState<FormData>({
    descricao_necessidade:  etp.descricao_necessidade  || '',
    requisitos_contratacao: etp.requisitos_contratacao || '',
    levantamento_mercado:   etp.levantamento_mercado   || '',
    estimativa_quantidades: etp.estimativa_quantidades || '',
    justificativa_solucao:  etp.justificativa_solucao  || '',
    parcelamento:           etp.parcelamento           || '',
    resultados_pretendidos: etp.resultados_pretendidos || '',
    providencias:           etp.providencias           || '',
  })

  const [salvando, setSalvando]   = useState(false)
  const [iaLoading, setIaLoading] = useState<string | null>(null)
  const [iaEditado, setIaEditado] = useState<Set<string>>(new Set())

  async function handleSalvar() {
    setSalvando(true)
    const res = await atualizarETP(etp.id, formData)
    res.success ? toast.success('ETP salvo.') : toast.error('Erro ao salvar ETP.')
    setSalvando(false)
  }

  async function handleIA(campo: keyof FormData) {
    const texto = formData[campo]
    if (!texto || texto.length < 5) { toast.warning('Texto muito curto para a IA.'); return }
    setIaLoading(campo)
    const res = await aprimorarETPComIA(texto, campo)
    if (res.success) {
      setFormData(prev => ({ ...prev, [campo]: res.texto }))
      setIaEditado(prev => new Set(prev).add(campo))
      toast.success('Secao aprimorada.')
    } else {
      toast.error(res.error)
    }
    setIaLoading(null)
  }

  return (
    <Card className="border-gray-200 shadow-sm">
      <CardContent className="p-6 space-y-5">
        {!podeEditar && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            Visualizacao somente leitura. Seu perfil nao tem permissao de editar este documento.
          </p>
        )}
        {SECOES.map(({ id, num, label, placeholder }) => {
          const foiIA = iaEditado.has(id)
          return (
            <div key={id} className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-2 text-sm font-medium text-gray-700">
                  <span className="w-5 h-5 rounded-full bg-blue-100 text-blue-700 text-xs flex items-center justify-center font-semibold shrink-0">
                    {num}
                  </span>
                  {label}
                  {foiIA && (
                    <span className="text-xs font-normal text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded">
                      Aprimorado por IA
                    </span>
                  )}
                </Label>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-7 text-xs text-purple-700 border-purple-200 bg-purple-50 hover:bg-purple-100 gap-1 shrink-0"
                  onClick={() => handleIA(id as keyof FormData)}
                  disabled={iaLoading === id || !podeEditar}
                >
                  {iaLoading === id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                  IA
                </Button>
              </div>
              <Textarea
                rows={3}
                placeholder={placeholder}
                value={formData[id as keyof FormData]}
                onChange={(e) => setFormData(prev => ({ ...prev, [id]: e.target.value }))}
                readOnly={!podeEditar}
                className={`resize-y ${foiIA ? 'border-purple-200 bg-purple-50/30' : ''} ${!podeEditar ? 'bg-gray-50 cursor-default' : ''}`}
              />
            </div>
          )
        })}
      </CardContent>

      <CardFooter className="flex items-center justify-between border-t border-gray-100 bg-gray-50/50 px-6 py-4 rounded-b-xl gap-3">
        <div className="flex items-center gap-2">
          <Link href={`/processos/${processoId}/cotacao`}>
            <Button variant="outline" className="gap-1.5 h-9 text-sm">
              <ChevronLeft className="w-4 h-4" /> Cotacao
            </Button>
          </Link>
          <BotaoTramitacao
            tabela="etp"
            documentoId={etp.id}
            processoId={processoId}
            statusAtual={etp.status}
            papelUsuario={papelUsuario}
          />
        </div>
        <div className="flex items-center gap-2">
          <Button onClick={handleSalvar} disabled={salvando || !podeEditar} className="bg-blue-700 hover:bg-blue-800 text-white gap-2 h-9 text-sm">
            {salvando ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</> : <><Save className="w-4 h-4" /> Salvar ETP</>}
          </Button>
          <Link href={`/processos/${processoId}/tr`}>
            <Button variant="outline" className="gap-1.5 h-9 text-sm">
              Proxima <ChevronRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </CardFooter>
    </Card>
  )
}
