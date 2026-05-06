'use client'

import { useState } from 'react'
import { toast } from 'sonner'
import { Loader2, Save, Wand2, User, FileText, Clock, StickyNote, ChevronRight } from 'lucide-react'

import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import BotaoAssinatura from '@/components/assinatura/botao-assinatura'

import { atualizarDFD, aprimorarTextoIA } from '@/lib/actions/dfd'
import Link from 'next/link'

interface CampoIA {
  id: keyof FormData
  label: string
  icon: React.ElementType
  placeholder: string
  rows?: number
  comIA?: boolean
}

type FormData = {
  responsavel_elaboracao: string
  descricao_necessidade: string
  justificativa: string
  prazo_contratacao: string
  observacoes: string
}

const CAMPOS: CampoIA[] = [
  {
    id: 'responsavel_elaboracao',
    label: 'Responsavel pela Elaboracao',
    icon: User,
    placeholder: 'Nome completo e cargo do responsavel',
    rows: 1,
    comIA: false,
  },
  {
    id: 'descricao_necessidade',
    label: 'Descricao da Necessidade (Objeto)',
    icon: FileText,
    placeholder: 'Descreva de forma clara o objeto a ser contratado/adquirido e a necessidade que motiva a demanda...',
    rows: 5,
    comIA: true,
  },
  {
    id: 'justificativa',
    label: 'Justificativa da Contratacao',
    icon: FileText,
    placeholder: 'Fundamente a necessidade: impacto no servico publico, consequencias da nao contratacao, embasamento legal...',
    rows: 6,
    comIA: true,
  },
  {
    id: 'prazo_contratacao',
    label: 'Prazo Esperado de Contratacao',
    icon: Clock,
    placeholder: 'Ex: 60 dias apos publicacao, 1o semestre de 2026...',
    rows: 1,
    comIA: false,
  },
  {
    id: 'observacoes',
    label: 'Observacoes Adicionais',
    icon: StickyNote,
    placeholder: 'Informacoes complementares relevantes para o setor de compras...',
    rows: 3,
    comIA: false,
  },
]

export default function EditorDFD({ dfd, processoId }: { dfd: any; processoId: string }) {
  const [formData, setFormData] = useState<FormData>({
    responsavel_elaboracao: dfd.responsavel_elaboracao || '',
    descricao_necessidade:  dfd.descricao_necessidade  || '',
    justificativa:          dfd.justificativa          || '',
    prazo_contratacao:      dfd.prazo_contratacao      || '',
    observacoes:            dfd.observacoes            || '',
  })

  const [salvando, setSalvando]     = useState(false)
  const [iaLoading, setIaLoading]   = useState<string | null>(null)
  const [iaEditado, setIaEditado]   = useState<Set<string>>(new Set())
  const assinado = dfd.status === 'assinado'

  function handleChange(campo: string, valor: string) {
    setFormData(prev => ({ ...prev, [campo]: valor }))
  }

  async function handleSalvar() {
    setSalvando(true)
    const res = await atualizarDFD(dfd.id, formData)
    if (res.success) {
      toast.success('DFD salvo com sucesso.')
    } else {
      toast.error('Erro ao salvar o DFD.')
    }
    setSalvando(false)
  }

  async function handleAprimorarIA(campo: keyof FormData) {
    const texto = formData[campo]
    if (!texto || texto.length < 10) {
      toast.warning('Escreva ao menos algumas palavras antes de acionar a IA.')
      return
    }
    setIaLoading(campo)
    const res = await aprimorarTextoIA(texto, campo)
    if (res.success) {
      setFormData(prev => ({ ...prev, [campo]: res.texto }))
      setIaEditado(prev => new Set(prev).add(campo))
      toast.success('Texto aprimorado pela IA.')
    } else {
      toast.error(res.error)
    }
    setIaLoading(null)
  }

  return (
    <Card className="border-gray-200 shadow-sm">
      <CardContent className="p-6 space-y-6">
        {CAMPOS.map((campo) => {
          const Icon = campo.icon
          const foiEditadoPorIA = iaEditado.has(campo.id)

          return (
            <div key={campo.id} className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                  <Icon className="w-3.5 h-3.5 text-gray-400" />
                  {campo.label}
                  {foiEditadoPorIA && (
                    <span className="text-xs font-normal text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded ml-1">
                      Aprimorado por IA
                    </span>
                  )}
                </Label>
                {campo.comIA && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs text-purple-700 border-purple-200 bg-purple-50 hover:bg-purple-100 gap-1"
                    onClick={() => handleAprimorarIA(campo.id)}
                    disabled={assinado || iaLoading === campo.id}
                  >
                    {iaLoading === campo.id
                      ? <Loader2 className="w-3 h-3 animate-spin" />
                      : <Wand2 className="w-3 h-3" />}
                    Aprimorar com IA
                  </Button>
                )}
              </div>

              {(campo.rows ?? 1) === 1 ? (
                <Input
                  value={formData[campo.id]}
                  onChange={(e) => handleChange(campo.id, e.target.value)}
                  placeholder={campo.placeholder}
                  disabled={assinado}
                  className={foiEditadoPorIA ? 'border-purple-200 bg-purple-50/30' : ''}
                />
              ) : (
                <Textarea
                  rows={campo.rows}
                  value={formData[campo.id]}
                  onChange={(e) => handleChange(campo.id, e.target.value)}
                  placeholder={campo.placeholder}
                  disabled={assinado}
                  className={`resize-y ${foiEditadoPorIA ? 'border-purple-200 bg-purple-50/30' : ''}`}
                />
              )}
            </div>
          )
        })}

        {assinado && (
          <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-100 rounded-lg text-sm text-blue-700">
            <Save className="w-4 h-4 shrink-0" />
            Este documento foi assinado e nao pode ser editado.
          </div>
        )}
      </CardContent>

      <CardFooter className="flex items-center justify-between border-t border-gray-100 bg-gray-50/50 px-6 py-4 rounded-b-xl gap-3">
        <BotaoAssinatura
          tabelaOrigem="dfd"
          documentoId={dfd.id}
          processoId={processoId}
          statusAtual={dfd.status}
        />
        <div className="flex items-center gap-2">
          <Button
            onClick={handleSalvar}
            disabled={salvando || assinado}
            className="bg-blue-700 hover:bg-blue-800 text-white gap-2 h-9 text-sm"
          >
            {salvando
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</>
              : <><Save className="w-4 h-4" /> Salvar</>}
          </Button>
          <Link href={`/processos/${processoId}/cotacao`}>
            <Button variant="outline" className="gap-1.5 h-9 text-sm">
              Proxima etapa
              <ChevronRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </CardFooter>
    </Card>
  )
}
