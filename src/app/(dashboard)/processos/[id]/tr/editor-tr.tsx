'use client'

import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import { Loader2, Save, Wand2, ChevronLeft, ChevronRight } from 'lucide-react'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { atualizarTR, aprimorarTRComIA } from '@/lib/actions/tr'
import { useAutoSave } from '@/hooks/use-auto-save'
import { AutoSaveIndicator } from '@/components/licita/auto-save-indicator'
import BotaoTramitacao from '@/components/documentos/botao-tramitacao'
import Link from 'next/link'
import type { PapelUsuario } from '@/types/database'

type FormData = {
  objeto:              string
  fundamentacao:       string
  descricao:           string
  requisitos_tecnicos: string
  modelo_execucao:     string
  modelo_gestao:       string
  criterios_medicao:   string
  forma_pagamento:     string
  garantias:           string
  sancoes:             string
}

const CLAUSULAS = [
  { id: 'objeto',              num: '1',  label: 'Objeto',                              placeholder: 'Definição clara e precisa do objeto da contratação...' },
  { id: 'fundamentacao',       num: '2',  label: 'Fundamentação da Contratação',        placeholder: 'Referência ao ETP, DFD e base legal aplicável...' },
  { id: 'descricao',           num: '3',  label: 'Descrição da Solução',                placeholder: 'Especificações técnicas, normas, padrões exigidos...' },
  { id: 'requisitos_tecnicos', num: '4',  label: 'Requisitos da Contratação',           placeholder: 'Condições de sustentabilidade, normas da ABNT, certificações...' },
  { id: 'modelo_execucao',     num: '5',  label: 'Modelo de Execução do Objeto',        placeholder: 'Cronograma, local de entrega/execução, etapas...' },
  { id: 'modelo_gestao',       num: '6',  label: 'Modelo de Gestão do Contrato',        placeholder: 'Designação de fiscais e rotinas de acompanhamento...' },
  { id: 'criterios_medicao',   num: '7',  label: 'Critérios de Medição e Recebimento', placeholder: 'Forma como o serviço/produto será atestado pelo fiscal...' },
  { id: 'forma_pagamento',     num: '8',  label: 'Forma de Pagamento',                  placeholder: 'Condições, prazos e documentos exigidos para liquidação...' },
  { id: 'garantias',           num: '9',  label: 'Garantias',                           placeholder: 'Garantia contratual, prazos de validade do produto...' },
  { id: 'sancoes',             num: '10', label: 'Sanções Administrativas',             placeholder: 'Penalidades por atraso ou inexecução total ou parcial...' },
] as const

export default function EditorTR({ tr, processoId, papelUsuario, podeEditar = true }: { tr: any; processoId: string; papelUsuario: PapelUsuario; podeEditar?: boolean }) {
  const [formData, setFormData] = useState<FormData>({
    objeto:              tr.objeto              || '',
    fundamentacao:       tr.fundamentacao       || '',
    descricao:           tr.descricao           || '',
    requisitos_tecnicos: tr.requisitos_tecnicos || '',
    modelo_execucao:     tr.modelo_execucao     || '',
    modelo_gestao:       tr.modelo_gestao       || '',
    criterios_medicao:   tr.criterios_medicao   || '',
    forma_pagamento:     tr.forma_pagamento     || '',
    garantias:           tr.garantias           || '',
    sancoes:             tr.sancoes             || '',
  })

  const [salvando, setSalvando]   = useState(false)
  const [iaLoading, setIaLoading] = useState<string | null>(null)
  const [iaEditado, setIaEditado] = useState<Set<string>>(new Set())

  const autoSalvarTR = useCallback(async () => {
    if (!podeEditar || tr.status === 'assinado') return
    await atualizarTR(tr.id, formData)
  }, [tr.id, tr.status, formData, podeEditar])

  const { status: autoSaveStatus, lastSavedAt, retrySave } = useAutoSave(
    [formData],
    autoSalvarTR,
  )

  async function handleSalvar() {
    setSalvando(true)
    const res = await atualizarTR(tr.id, formData)
    res.success ? toast.success('TR salvo.') : toast.error('Erro ao salvar TR.')
    setSalvando(false)
  }

  async function handleIA(campo: keyof FormData) {
    const texto = formData[campo]
    if (!texto || texto.length < 5) { toast.warning('Texto muito curto para a IA.'); return }
    setIaLoading(campo)
    const res = await aprimorarTRComIA(texto, campo)
    if (res.success) {
      setFormData(prev => ({ ...prev, [campo]: res.texto }))
      setIaEditado(prev => new Set(prev).add(campo))
      toast.success('Cláusula aprimorada.')
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
            Visualização somente leitura. Seu perfil não tem permissão de editar este documento.
          </p>
        )}
        {CLAUSULAS.map(({ id, num, label, placeholder }) => {
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
                rows={4}
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
          <Link href={`/processos/${processoId}/etp`}>
            <Button variant="outline" className="gap-1.5 h-9 text-sm">
              <ChevronLeft className="w-4 h-4" /> ETP
            </Button>
          </Link>
          <BotaoTramitacao
            tabela="termo_referencia"
            documentoId={tr.id}
            processoId={processoId}
            statusAtual={tr.status}
            papelUsuario={papelUsuario}
          />
        </div>
        <div className="flex items-center gap-2">
          {podeEditar && tr.status !== 'assinado' && (
            <AutoSaveIndicator
              status={autoSaveStatus}
              lastSavedAt={lastSavedAt}
              onRetry={retrySave}
            />
          )}
          <Button onClick={handleSalvar} disabled={salvando || !podeEditar} className="bg-blue-700 hover:bg-blue-800 text-white gap-2 h-9 text-sm">
            {salvando ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</> : <><Save className="w-4 h-4" /> Salvar TR</>}
          </Button>
          <Link href={`/processos/${processoId}/riscos`}>
            <Button variant="outline" className="gap-1.5 h-9 text-sm">
              Próxima <ChevronRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </CardFooter>
    </Card>
  )
}
