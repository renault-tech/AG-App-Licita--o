'use client'

import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import { Loader2, Save, Wand2, FileText, ChevronLeft, ChevronRight } from 'lucide-react'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { RichTextEditor } from '@/components/ui/rich-text-editor'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { atualizarDeclaracao, gerarJustificativaDeclaracaoIA } from '@/lib/actions/declaracao'
import type { DeclaracaoData } from '@/lib/actions/declaracao'

export default function EditorDeclaracao({
  declaracao,
  processoId,
  podeEditar = true,
}: {
  declaracao: DeclaracaoData
  processoId: string
  podeEditar?: boolean
}) {
  const [objeto,          setObjeto]          = useState(declaracao.objeto)
  const [justificativa,   setJustificativa]   = useState(declaracao.justificativa)
  const [declaranteNome,  setDeclaranteNome]  = useState(declaracao.declarante_nome)
  const [declaranteCargo, setDeclaranteCargo] = useState(declaracao.declarante_cargo)
  const [declaranteSetor, setDeclaranteSetor] = useState(declaracao.declarante_setor)
  const [localData,       setLocalData]       = useState(declaracao.local_data)

  const [salvando,     setSalvando]     = useState(false)
  const [gerandoIA,    setGerandoIA]    = useState(false)
  const [geradoPorIA,  setGeradoPorIA]  = useState(declaracao.gerado_por_ia)

  const handleSalvar = useCallback(async () => {
    setSalvando(true)
    const res = await atualizarDeclaracao(declaracao.id, {
      objeto, justificativa, declarante_nome: declaranteNome,
      declarante_cargo: declaranteCargo, declarante_setor: declaranteSetor, local_data: localData,
    })
    res.success ? toast.success('Declaração salva.') : toast.error(res.error)
    setSalvando(false)
  }, [declaracao.id, objeto, justificativa, declaranteNome, declaranteCargo, declaranteSetor, localData])

  async function handleGerarIA() {
    if (!objeto) { toast.warning('Preencha o objeto antes de gerar.'); return }
    setGerandoIA(true)
    const res = await gerarJustificativaDeclaracaoIA(objeto, declaranteSetor, processoId)
    if (res.success) {
      setJustificativa(res.texto)
      setGeradoPorIA(true)
      toast.success('Justificativa gerada pela IA.')
    } else {
      toast.error(res.error)
    }
    setGerandoIA(false)
  }

  const readonly = !podeEditar

  return (
    <Card className="border-gray-200 shadow-sm">
      <CardHeader className="border-b border-gray-100 pb-4">
        <CardTitle className="text-base font-semibold text-gray-800 flex items-center gap-2">
          <FileText className="w-4 h-4 text-gray-400" />
          Declaração do Setor Requisitante
        </CardTitle>
        <p className="text-xs text-gray-500 mt-0.5">
          Conforme requisito administrativo da Lei 14.133/21 — formaliza a necessidade da contratação pelo setor.
        </p>
      </CardHeader>

      <CardContent className="p-6 space-y-5">
        {!podeEditar && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            Visualização somente leitura. Seu perfil não tem permissão de editar este documento.
          </p>
        )}

        {/* Identificação do declarante */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Identificação do Declarante</p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700">Nome completo</Label>
              <Input
                value={declaranteNome}
                onChange={e => setDeclaranteNome(e.target.value)}
                placeholder="Nome do responsável pelo setor"
                disabled={readonly}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700">Cargo / Função</Label>
              <Input
                value={declaranteCargo}
                onChange={e => setDeclaranteCargo(e.target.value)}
                placeholder="Ex: Secretário de Educação"
                disabled={readonly}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700">Setor / Secretaria</Label>
              <Input
                value={declaranteSetor}
                onChange={e => setDeclaranteSetor(e.target.value)}
                placeholder="Ex: Secretaria Municipal de Educação"
                disabled={readonly}
              />
            </div>
          </div>
        </div>

        {/* Objeto */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-gray-700">Objeto da contratação</Label>
          <RichTextEditor
            value={objeto}
            onChange={val => setObjeto(val)}
            placeholder="Descreva o objeto conforme consta no DFD..."
            disabled={readonly}
            minHeight={80}
          />
        </div>

        {/* Justificativa */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
              Justificativa da necessidade
              {geradoPorIA && (
                <span className="text-xs font-normal text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded ml-1">
                  Gerado por IA
                </span>
              )}
            </Label>
            {!readonly && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-xs text-purple-700 border-purple-200 bg-purple-50 hover:bg-purple-100 gap-1"
                onClick={handleGerarIA}
                disabled={gerandoIA}
              >
                {gerandoIA ? <Loader2 className="w-3 h-3 animate-spin" /> : <Wand2 className="w-3 h-3" />}
                Gerar com IA
              </Button>
            )}
          </div>
          <RichTextEditor
            value={justificativa}
            onChange={val => { setJustificativa(val); setGeradoPorIA(false) }}
            placeholder="Declare formalmente a necessidade da contratação, referenciando os documentos do processo..."
            disabled={readonly}
            minHeight={168}
            className={geradoPorIA ? 'border-purple-200' : ''}
          />
        </div>

        {/* Local e data */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-gray-700">Local e data</Label>
          <Input
            value={localData}
            onChange={e => setLocalData(e.target.value)}
            placeholder="Ex: São Paulo, 13 de maio de 2026"
            disabled={readonly}
            className="max-w-sm"
          />
        </div>

        {/* Prévia formal */}
        {(declaranteNome || declaranteCargo) && (
          <div className="border border-gray-200 rounded-xl p-4 bg-gray-50 space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Prévia da assinatura</p>
            <div className="text-center space-y-0.5">
              <div className="w-40 mx-auto border-b border-gray-400 mb-2" />
              <p className="text-sm font-medium text-gray-800">{declaranteNome || '___________________________'}</p>
              <p className="text-xs text-gray-500">{declaranteCargo || 'Cargo'}</p>
              {declaranteSetor && <p className="text-xs text-gray-400">{declaranteSetor}</p>}
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex items-center justify-between border-t border-gray-100 bg-gray-50/50 px-6 py-4 rounded-b-xl gap-3">
        <Link href={`/processos/${processoId}/edital`}>
          <Button variant="outline" className="gap-1.5 h-9 text-sm">
            <ChevronLeft className="w-4 h-4" /> Edital
          </Button>
        </Link>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleSalvar}
            disabled={salvando || readonly}
            className="bg-blue-700 hover:bg-blue-800 text-white gap-2 h-9 text-sm"
          >
            {salvando
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Salvando...</>
              : <><Save className="w-4 h-4" /> Salvar</>}
          </Button>
          <Link href={`/processos/${processoId}/oficio`}>
            <Button variant="outline" className="gap-1.5 h-9 text-sm">
              Ofício <ChevronRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </CardFooter>
    </Card>
  )
}
