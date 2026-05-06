'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { toast } from 'sonner'
import {
  ChevronRight, ChevronLeft, Save, Loader2,
  FileText, Settings, ClipboardList, ArrowLeft,
  Gavel, DollarSign, Calendar
} from 'lucide-react'

import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Button } from '@/components/ui/button'

import { schemaProcessoWizard, type ProcessoWizardInput } from '@/lib/validacao/processo'
import { criarProcessoInicial } from '@/lib/actions/processo'
import Link from 'next/link'

const MODALIDADES = [
  { value: 'pregao_eletronico',  label: 'Pregao Eletronico',   desc: 'Compras e servicos comuns por meio eletronico (Art. 28)' },
  { value: 'pregao_presencial',  label: 'Pregao Presencial',   desc: 'Idem, sessao presencial' },
  { value: 'concorrencia',       label: 'Concorrencia',        desc: 'Obras, servicos especiais e grande vulto (Art. 29)' },
  { value: 'concurso',           label: 'Concurso',            desc: 'Trabalho tecnico, cientifico ou artistico (Art. 30)' },
  { value: 'leilao',             label: 'Leilao',              desc: 'Alienacao de bens inservíveis ou apreendidos (Art. 31)' },
  { value: 'dialogo_competitivo',label: 'Dialogo Competitivo', desc: 'Contratacoes inovadoras e complexas (Art. 32)' },
  { value: 'dispensa',           label: 'Dispensa de Licitacao',desc: 'Hipoteses do Art. 75' },
  { value: 'inexigibilidade',    label: 'Inexigibilidade',     desc: 'Fornecedor ou objeto singular (Art. 74)' },
]

const ETAPAS = [
  { num: 1, label: 'Identificacao', icon: FileText },
  { num: 2, label: 'Modalidade',    icon: Gavel },
  { num: 3, label: 'Requisitos',    icon: ClipboardList },
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
    const campos = etapa === 1
      ? (['objeto', 'justificativa'] as const)
      : (['modalidade', 'valor_estimado'] as const)
    const ok = await trigger(campos)
    if (ok) setEtapa(e => (e + 1) as 1 | 2 | 3)
  }

  async function onSubmit(data: ProcessoWizardInput) {
    setSalvando(true)
    const result = await criarProcessoInicial(data)
    if (!result?.success) {
      toast.error(result?.error || 'Erro ao criar processo.')
      setSalvando(false)
      return
    }
    toast.success('Processo criado. Iniciando DFD...')
    router.push(`/processos/${result.processoId}/dfd`)
  }

  const modalidadeSelecionada = MODALIDADES.find(m => m.value === watch('modalidade'))

  return (
    <div className="max-w-2xl mx-auto space-y-6">

      {/* Cabecalho */}
      <div className="flex items-center gap-3">
        <Link href="/dashboard" className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400 hover:text-gray-700 transition-colors">
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-lg font-bold text-gray-900">Novo Processo Licitatorio</h1>
          <p className="text-sm text-gray-500">Preencha os dados basicos para iniciar o DFD.</p>
        </div>
      </div>

      {/* Stepper */}
      <div className="flex items-center gap-0">
        {ETAPAS.map(({ num, label, icon: Icon }, i) => {
          const ativa   = num === etapa
          const concluida = num < etapa
          return (
            <div key={num} className="flex items-center flex-1">
              <div className="flex flex-col items-center gap-1.5">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all ${
                  ativa     ? 'bg-blue-600 border-blue-600 text-white shadow-sm shadow-blue-200' :
                  concluida ? 'bg-green-50 border-green-400 text-green-600' :
                              'bg-white border-gray-200 text-gray-400'
                }`}>
                  <Icon className="w-4 h-4" />
                </div>
                <span className={`text-xs font-medium hidden sm:block ${ativa ? 'text-blue-700' : concluida ? 'text-green-600' : 'text-gray-400'}`}>
                  {label}
                </span>
              </div>
              {i < ETAPAS.length - 1 && (
                <div className={`flex-1 h-0.5 mx-2 mb-5 rounded-full ${concluida ? 'bg-green-300' : 'bg-gray-200'}`} />
              )}
            </div>
          )
        })}
      </div>

      {/* Card do formulario */}
      <Card className="border-gray-200 shadow-sm">
        <form onSubmit={handleSubmit(onSubmit)}>
          <CardContent className="p-6 space-y-5">

            {etapa === 1 && (
              <>
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-1">
                  <FileText className="w-4 h-4 text-blue-600" />
                  Dados Principais do Objeto
                </div>

                <div className="space-y-2">
                  <Label htmlFor="objeto" className="text-sm">
                    Descricao do Objeto <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    id="objeto"
                    rows={3}
                    placeholder="Ex: Aquisicao de equipamentos de informatica para as escolas municipais..."
                    {...register('objeto')}
                  />
                  {errors.objeto && <p className="text-xs text-red-600">{errors.objeto.message}</p>}
                  <p className="text-xs text-gray-400">Descreva claramente o que sera contratado ou adquirido.</p>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="justificativa" className="text-sm">
                    Justificativa da Necessidade <span className="text-red-500">*</span>
                  </Label>
                  <Textarea
                    id="justificativa"
                    rows={4}
                    placeholder="Ex: A contratacao faz-se necessaria para substituir os equipamentos obsoletos que comprometem o aprendizado..."
                    {...register('justificativa')}
                  />
                  {errors.justificativa && <p className="text-xs text-red-600">{errors.justificativa.message}</p>}
                </div>
              </>
            )}

            {etapa === 2 && (
              <>
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-1">
                  <Settings className="w-4 h-4 text-blue-600" />
                  Enquadramento Legal
                </div>

                <div className="space-y-2">
                  <Label className="text-sm">
                    Modalidade Aplicavel <span className="text-red-500">*</span>
                  </Label>
                  <Select onValueChange={(v) => setValue('modalidade', v as ProcessoWizardInput['modalidade'])} value={watch('modalidade')}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a modalidade da contratacao" />
                    </SelectTrigger>
                    <SelectContent>
                      {MODALIDADES.map(m => (
                        <SelectItem key={m.value} value={m.value}>
                          <div>
                            <p className="font-medium">{m.label}</p>
                            <p className="text-xs text-gray-400">{m.desc}</p>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {errors.modalidade && <p className="text-xs text-red-600">{errors.modalidade.message}</p>}
                  {modalidadeSelecionada && (
                    <p className="text-xs text-blue-600 bg-blue-50 px-3 py-1.5 rounded-lg border border-blue-100">
                      {modalidadeSelecionada.desc}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="valor_estimado" className="text-sm flex items-center gap-1.5">
                    <DollarSign className="w-3.5 h-3.5 text-gray-400" />
                    Valor Estimado (R$)
                    <span className="text-gray-400 font-normal">— opcional nesta fase</span>
                  </Label>
                  <Input
                    id="valor_estimado"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0,00"
                    {...register('valor_estimado', { valueAsNumber: true })}
                  />
                  {errors.valor_estimado && <p className="text-xs text-red-600">{errors.valor_estimado.message}</p>}
                  <p className="text-xs text-gray-400">Pode ser definido apos a etapa de Cotacao.</p>
                </div>
              </>
            )}

            {etapa === 3 && (
              <>
                <div className="flex items-center gap-2 text-sm font-semibold text-gray-700 mb-1">
                  <ClipboardList className="w-4 h-4 text-blue-600" />
                  Requisitos e Prazos
                </div>

                <div className="space-y-2">
                  <Label htmlFor="prazo_contratacao" className="text-sm flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-gray-400" />
                    Prazo Esperado de Contratacao <span className="text-red-500">*</span>
                  </Label>
                  <Input
                    id="prazo_contratacao"
                    placeholder="Ex: 60 dias apos publicacao, 1o semestre de 2026..."
                    {...register('prazo_contratacao')}
                  />
                  {errors.prazo_contratacao && <p className="text-xs text-red-600">{errors.prazo_contratacao.message}</p>}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="observacoes" className="text-sm">
                    Observacoes Adicionais
                    <span className="text-gray-400 font-normal ml-1">— opcional</span>
                  </Label>
                  <Textarea
                    id="observacoes"
                    rows={4}
                    placeholder="Quaisquer informacoes relevantes para o setor de compras..."
                    {...register('observacoes')}
                  />
                </div>

                <div className="p-3 bg-blue-50 border border-blue-100 rounded-lg text-xs text-blue-700">
                  Ao criar o processo, o DFD (Documento de Formalizacao da Demanda) sera gerado automaticamente com os dados informados.
                </div>
              </>
            )}
          </CardContent>

          <CardFooter className="flex items-center justify-between border-t border-gray-100 bg-gray-50/50 px-6 py-4 rounded-b-xl">
            <Button
              type="button"
              variant="outline"
              className="gap-1.5 h-9 text-sm"
              onClick={etapa === 1 ? () => router.push('/dashboard') : () => setEtapa(e => (e - 1) as 1 | 2 | 3)}
              disabled={salvando}
            >
              {etapa === 1 ? (
                <><ArrowLeft className="w-4 h-4" /> Cancelar</>
              ) : (
                <><ChevronLeft className="w-4 h-4" /> Voltar</>
              )}
            </Button>

            {etapa < 3 ? (
              <Button type="button" onClick={avancar} className="bg-blue-700 hover:bg-blue-800 text-white gap-1.5 h-9 text-sm">
                Continuar <ChevronRight className="w-4 h-4" />
              </Button>
            ) : (
              <Button type="submit" disabled={salvando} className="bg-blue-700 hover:bg-blue-800 text-white gap-2 h-9 text-sm">
                {salvando
                  ? <><Loader2 className="w-4 h-4 animate-spin" /> Criando...</>
                  : <><Save className="w-4 h-4" /> Criar Processo</>}
              </Button>
            )}
          </CardFooter>
        </form>
      </Card>
    </div>
  )
}
