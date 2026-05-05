'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import { ChevronRight, ChevronLeft, Save, Loader2, FileText, Settings, ClipboardList } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'

import { schemaProcessoWizard, type ProcessoWizardInput } from '@/lib/validacao/processo'
import { criarProcessoInicial } from '@/lib/actions/processo'

const MODALIDADES = [
  { value: 'pregao_eletronico', label: 'Pregão Eletrônico' },
  { value: 'pregao_presencial', label: 'Pregão Presencial' },
  { value: 'concorrencia', label: 'Concorrência' },
  { value: 'concurso', label: 'Concurso' },
  { value: 'leilao', label: 'Leilão' },
  { value: 'dialogo_competitivo', label: 'Diálogo Competitivo' },
  { value: 'dispensa', label: 'Dispensa de Licitação' },
  { value: 'inexigibilidade', label: 'Inexigibilidade' },
]

export default function NovoProcessoPage() {
  const router = useRouter()
  const [etapa, setEtapa] = useState<1 | 2 | 3>(1)
  const [salvando, setSalvando] = useState(false)

  const form = useForm<ProcessoWizardInput>({
    resolver: zodResolver(schemaProcessoWizard),
    defaultValues: {
      objeto: '',
      justificativa: '',
      modalidade: undefined,
      valor_estimado: undefined,
      prazo_contratacao: '',
      observacoes: '',
    },
  })

  const { register, handleSubmit, formState: { errors }, setValue, watch, trigger } = form

  async function avancar() {
    let camposValidos = false
    if (etapa === 1) {
      camposValidos = await trigger(['objeto', 'justificativa'])
    } else if (etapa === 2) {
      camposValidos = await trigger(['modalidade', 'valor_estimado'])
    }
    
    if (camposValidos) {
      setEtapa((e) => (e + 1) as 1 | 2 | 3)
    }
  }

  function voltar() {
    setEtapa((e) => (e - 1) as 1 | 2 | 3)
  }

  async function onSubmit(data: ProcessoWizardInput) {
    setSalvando(true)
    const result = await criarProcessoInicial(data)
    
    if (!result?.success) {
      toast.error(result?.error || 'Erro ao criar processo.')
      setSalvando(false)
      return
    }

    toast.success('Processo e DFD inicial criados com sucesso!')
    router.push(`/processos/${result.processoId}/dfd`)
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Novo Processo Licitatório</h1>
        <p className="text-gray-500 mt-1">Preencha os dados básicos para iniciar o Documento de Formalização de Demanda (DFD).</p>
      </div>

      <div className="flex items-center gap-2 mb-8">
        {[1, 2, 3].map((step) => (
          <div key={step} className="flex-1 flex flex-col gap-2">
            <div className={`h-2 rounded-full transition-colors ${step <= etapa ? 'bg-blue-600' : 'bg-gray-200'}`} />
            <span className={`text-xs font-medium ${step <= etapa ? 'text-blue-700' : 'text-gray-400'}`}>
              {step === 1 && '1. Identificação'}
              {step === 2 && '2. Modalidade'}
              {step === 3 && '3. Requisitos'}
            </span>
          </div>
        ))}
      </div>

      <Card className="shadow-sm border-gray-200">
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              {etapa === 1 && <><FileText className="w-5 h-5 text-blue-600"/> Dados Principais do Objeto</>}
              {etapa === 2 && <><Settings className="w-5 h-5 text-blue-600"/> Enquadramento Legal</>}
              {etapa === 3 && <><ClipboardList className="w-5 h-5 text-blue-600"/> Requisitos e Prazos</>}
            </CardTitle>
          </CardHeader>
          
          <CardContent className="space-y-6">
            {etapa === 1 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="objeto">Descrição do Objeto (O que será contratado/adquirido?) *</Label>
                  <Textarea
                    id="objeto"
                    rows={3}
                    placeholder="Ex: Aquisição de equipamentos de informática para as escolas municipais..."
                    {...register('objeto')}
                  />
                  {errors.objeto && <p className="text-xs text-red-600">{errors.objeto.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="justificativa">Justificativa da Necessidade *</Label>
                  <Textarea
                    id="justificativa"
                    rows={4}
                    placeholder="Ex: A contratação faz-se necessária para substituir os equipamentos obsoletos..."
                    {...register('justificativa')}
                  />
                  {errors.justificativa && <p className="text-xs text-red-600">{errors.justificativa.message}</p>}
                </div>
              </div>
            )}

            {etapa === 2 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Modalidade Sugerida *</Label>
                  <Select onValueChange={(v) => setValue('modalidade', v as any)} value={watch('modalidade')}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a modalidade aplicável" />
                    </SelectTrigger>
                    <SelectContent>
                      {MODALIDADES.map((mod) => (
                        <SelectItem key={mod.value} value={mod.value}>{mod.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.modalidade && <p className="text-xs text-red-600">{errors.modalidade.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="valor_estimado">Valor Estimado (R$) - Opcional nesta fase</Label>
                  <Input
                    id="valor_estimado"
                    type="number"
                    step="0.01"
                    placeholder="0.00"
                    {...register('valor_estimado', { valueAsNumber: true })}
                  />
                  {errors.valor_estimado && <p className="text-xs text-red-600">{errors.valor_estimado.message}</p>}
                  <p className="text-xs text-gray-500">Pode ser preenchido após a etapa de Cotação.</p>
                </div>
              </div>
            )}

            {etapa === 3 && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="prazo_contratacao">Prazo Esperado de Contratação *</Label>
                  <Input
                    id="prazo_contratacao"
                    placeholder="Ex: 60 dias, 1º semestre de 2026..."
                    {...register('prazo_contratacao')}
                  />
                  {errors.prazo_contratacao && <p className="text-xs text-red-600">{errors.prazo_contratacao.message}</p>}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="observacoes">Observações Adicionais (Opcional)</Label>
                  <Textarea
                    id="observacoes"
                    rows={3}
                    placeholder="Quaisquer informações relevantes para o setor de compras..."
                    {...register('observacoes')}
                  />
                </div>
              </div>
            )}
          </CardContent>

          <CardFooter className="flex justify-between border-t p-4 bg-gray-50/50 rounded-b-lg mt-4">
            <Button
              type="button"
              variant="outline"
              onClick={etapa === 1 ? () => router.push('/dashboard') : voltar}
              disabled={salvando}
            >
              {etapa === 1 ? 'Cancelar' : <><ChevronLeft className="w-4 h-4 mr-1"/> Voltar</>}
            </Button>
            
            {etapa < 3 ? (
              <Button type="button" onClick={avancar} className="bg-blue-700 hover:bg-blue-800 text-white">
                Próxima Etapa <ChevronRight className="w-4 h-4 ml-1"/>
              </Button>
            ) : (
              <Button type="submit" disabled={salvando} className="bg-blue-700 hover:bg-blue-800 text-white">
                {salvando ? (
                  <><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Salvando...</>
                ) : (
                  <><Save className="w-4 h-4 mr-2" /> Criar Processo</>
                )}
              </Button>
            )}
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
