'use client'

import { useState, useCallback } from 'react'
import { toast } from 'sonner'
import { Loader2, Save, Wand2, Mail, ChevronLeft, ChevronRight } from 'lucide-react'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { RichTextEditor } from '@/components/ui/rich-text-editor'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { atualizarOficio, gerarCorpoOficioIA } from '@/lib/actions/oficio'
import type { OficioData } from '@/lib/actions/oficio'

export default function EditorOficio({
  oficio,
  processoId,
  modalidade,
  podeEditar = true,
}: {
  oficio:      OficioData
  processoId:  string
  modalidade:  string
  podeEditar?: boolean
}) {
  const [numeroOficio,      setNumeroOficio]      = useState(oficio.numero_oficio)
  const [destinatarioNome,  setDestinatarioNome]  = useState(oficio.destinatario_nome)
  const [destinatarioCargo, setDestinatarioCargo] = useState(oficio.destinatario_cargo)
  const [assunto,           setAssunto]           = useState(oficio.assunto)
  const [corpo,             setCorpo]             = useState(oficio.corpo)
  const [emitenteNome,      setEmitenteNome]      = useState(oficio.emitente_nome)
  const [emitenteCargo,     setEmitenteCargo]     = useState(oficio.emitente_cargo)
  const [localData,         setLocalData]         = useState(oficio.local_data)

  const [salvando,    setSalvando]    = useState(false)
  const [gerandoIA,   setGerandoIA]   = useState(false)
  const [geradoPorIA, setGeradoPorIA] = useState(oficio.gerado_por_ia)

  const readonly = !podeEditar

  const handleSalvar = useCallback(async () => {
    setSalvando(true)
    const res = await atualizarOficio(oficio.id, {
      numero_oficio:      numeroOficio,
      destinatario_nome:  destinatarioNome,
      destinatario_cargo: destinatarioCargo,
      assunto,
      corpo,
      emitente_nome:  emitenteNome,
      emitente_cargo: emitenteCargo,
      local_data:     localData,
    })
    res.success ? toast.success('Ofício salvo.') : toast.error(res.error)
    setSalvando(false)
  }, [oficio.id, numeroOficio, destinatarioNome, destinatarioCargo, assunto, corpo, emitenteNome, emitenteCargo, localData])

  async function handleGerarIA() {
    setGerandoIA(true)
    const res = await gerarCorpoOficioIA(assunto, modalidade, destinatarioCargo, processoId)
    if (res.success) {
      setCorpo(res.texto)
      setGeradoPorIA(true)
      toast.success('Corpo do ofício gerado pela IA.')
    } else {
      toast.error(res.error)
    }
    setGerandoIA(false)
  }

  return (
    <Card className="border-gray-200 shadow-sm">
      <CardHeader className="border-b border-gray-100 pb-4">
        <CardTitle className="text-base font-semibold text-gray-800 flex items-center gap-2">
          <Mail className="w-4 h-4 text-gray-400" />
          Ofício de Abertura do Processo Licitatório
        </CardTitle>
        <p className="text-xs text-gray-500 mt-0.5">
          Comunica formalmente a abertura à Procuradoria para emissão do Parecer Jurídico (Art. 53, Lei 14.133/21).
        </p>
      </CardHeader>

      <CardContent className="p-6 space-y-5">
        {!podeEditar && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            Visualização somente leitura. Seu perfil não tem permissão de editar este documento.
          </p>
        )}

        {/* Cabeçalho do ofício */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-gray-700">Número do ofício</Label>
            <Input
              value={numeroOficio}
              onChange={e => setNumeroOficio(e.target.value)}
              placeholder="OF. Nº 001/2026"
              disabled={readonly}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-sm font-medium text-gray-700">Local e data</Label>
            <Input
              value={localData}
              onChange={e => setLocalData(e.target.value)}
              placeholder="Ex: São Paulo, 13 de maio de 2026"
              disabled={readonly}
            />
          </div>
        </div>

        {/* Destinatário */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Destinatário</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700">Nome</Label>
              <Input
                value={destinatarioNome}
                onChange={e => setDestinatarioNome(e.target.value)}
                placeholder="Nome do(a) Procurador(a)"
                disabled={readonly}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700">Cargo</Label>
              <Input
                value={destinatarioCargo}
                onChange={e => setDestinatarioCargo(e.target.value)}
                placeholder="Procurador(a) Municipal"
                disabled={readonly}
              />
            </div>
          </div>
        </div>

        {/* Assunto */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium text-gray-700">Assunto</Label>
          <Input
            value={assunto}
            onChange={e => setAssunto(e.target.value)}
            placeholder="Abertura de Processo Licitatório, objeto..."
            disabled={readonly}
          />
        </div>

        {/* Corpo */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
              Corpo do ofício
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
            value={corpo}
            onChange={val => { setCorpo(val); setGeradoPorIA(false) }}
            placeholder="Senhor(a) Procurador(a), comunicamos a abertura do processo licitatório..."
            disabled={readonly}
            minHeight={224}
            className={geradoPorIA ? 'border-purple-200' : ''}
          />
        </div>

        {/* Emitente */}
        <div>
          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Emitente</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700">Nome</Label>
              <Input
                value={emitenteNome}
                onChange={e => setEmitenteNome(e.target.value)}
                placeholder="Nome do responsável"
                disabled={readonly}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-sm font-medium text-gray-700">Cargo</Label>
              <Input
                value={emitenteCargo}
                onChange={e => setEmitenteCargo(e.target.value)}
                placeholder="Ex: Secretário Municipal de Administração"
                disabled={readonly}
              />
            </div>
          </div>
        </div>

        {/* Prévia de assinatura */}
        {(emitenteNome || emitenteCargo) && (
          <div className="border border-gray-200 rounded-xl p-4 bg-gray-50 space-y-2">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Prévia da assinatura</p>
            <div className="text-center space-y-0.5">
              <div className="w-40 mx-auto border-b border-gray-400 mb-2" />
              <p className="text-sm font-medium text-gray-800">{emitenteNome || '___________________________'}</p>
              <p className="text-xs text-gray-500">{emitenteCargo || 'Cargo'}</p>
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="flex items-center justify-between border-t border-gray-100 bg-gray-50/50 px-6 py-4 rounded-b-xl gap-3">
        <Link href={`/processos/${processoId}/declaracao`}>
          <Button variant="outline" className="gap-1.5 h-9 text-sm">
            <ChevronLeft className="w-4 h-4" /> Declaração
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
          <Link href={`/processos/${processoId}/parecer`}>
            <Button variant="outline" className="gap-1.5 h-9 text-sm">
              Parecer <ChevronRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </CardFooter>
    </Card>
  )
}
