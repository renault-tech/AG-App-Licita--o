'use client'

import { useState, useCallback } from 'react'
import { AlertDialog } from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import {
  Loader2, Save, Wand2, Plus, Trash2, Share2, ChevronRight,
  Building2, Mail, Phone, User, FileText, Package,
} from 'lucide-react'
import { Card, CardContent, CardFooter } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

import {
  atualizarDFD,
  salvarItensDFD,
  gerarJustificativaIA,
} from '@/lib/actions/dfd'
import { useAutoSave } from '@/hooks/use-auto-save'
import { AutoSaveIndicator } from '@/components/licita/auto-save-indicator'
import BotaoTramitacao from '@/components/documentos/botao-tramitacao'
import ModalEncaminharAdesao from './modal-encaminhar-adesao'
import { BotaoMelhorarCampo } from '@/components/ai/botao-melhorar-campo'
import { BotaoSugerirConteudo } from '@/components/ai/botao-sugerir-conteudo'
import { AvisoCotacaoPendente } from '@/components/processo/aviso-cotacao-pendente'
import type { PapelUsuario, StatusDocumento, DFDItemRow, DFDParticipacaoRow } from '@/types/database'

// -------------------------------------------------------
// Tipos
// -------------------------------------------------------

type ItemLocal = {
  id?: string
  numero_item: number
  especificacao: string
  unidade_medida: string
  observacoes: string
}

type DFDCompleto = {
  id: string
  processo_id: string
  objeto: string
  justificativa_necessidade: string | null
  tipo: string
  status_adesao: string
  prazo_adesao: string | null
  secretaria_nome: string
  secretaria_email: string | null
  secretaria_telefone: string | null
  secretario_responsavel: string | null
  responsavel_elaboracao: string
  fiscal_contrato: string | null
  dotacao_orcamentaria: string | null
  status: StatusDocumento
  itens: DFDItemRow[]
  participacoes: DFDParticipacaoRow[]
}

// -------------------------------------------------------
// Badge de status de adesao
// -------------------------------------------------------

function BadgeAdesao({ status }: { status: string }) {
  const map: Record<string, { label: string; class: string }> = {
    rascunho:          { label: 'Rascunho',           class: 'bg-gray-100 text-gray-600' },
    aguardando_adesao: { label: 'Aguardando adesao',  class: 'bg-amber-50 text-amber-700 border border-amber-200' },
    prazo_encerrado:   { label: 'Prazo encerrado',    class: 'bg-orange-50 text-orange-700 border border-orange-200' },
    consolidado:       { label: 'Consolidado',         class: 'bg-green-50 text-green-700 border border-green-200' },
  }
  const s = map[status] ?? map.rascunho
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.class}`}>{s.label}</span>
}

// -------------------------------------------------------
// Cabecalho institucional (somente leitura)
// -------------------------------------------------------

function CabecalhoDFD({ dfd }: { dfd: DFDCompleto }) {
  return (
    <div className="border border-gray-200 rounded-xl bg-gray-50 p-4 space-y-2">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Identificacao da Secretaria</p>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="flex items-start gap-2">
          <Building2 className="w-3.5 h-3.5 mt-0.5 text-gray-400 shrink-0" />
          <div>
            <p className="text-xs text-gray-400">Setor requisitante</p>
            <p className="text-sm font-medium text-gray-800">{dfd.secretaria_nome || 'Nao definido'}</p>
          </div>
        </div>
        {dfd.secretaria_email && (
          <div className="flex items-start gap-2">
            <Mail className="w-3.5 h-3.5 mt-0.5 text-gray-400 shrink-0" />
            <div>
              <p className="text-xs text-gray-400">E-mail</p>
              <p className="text-sm text-gray-700">{dfd.secretaria_email}</p>
            </div>
          </div>
        )}
        {dfd.secretaria_telefone && (
          <div className="flex items-start gap-2">
            <Phone className="w-3.5 h-3.5 mt-0.5 text-gray-400 shrink-0" />
            <div>
              <p className="text-xs text-gray-400">Telefone</p>
              <p className="text-sm text-gray-700">{dfd.secretaria_telefone}</p>
            </div>
          </div>
        )}
      </div>
      <div className="flex items-start gap-2 pt-1">
        <User className="w-3.5 h-3.5 mt-0.5 text-gray-400 shrink-0" />
        <div>
          <p className="text-xs text-gray-400">Responsavel pela formalizacao da demanda</p>
          <p className="text-sm font-medium text-gray-800">{dfd.responsavel_elaboracao || 'Nao definido'}</p>
        </div>
      </div>
    </div>
  )
}

// -------------------------------------------------------
// Tabela de itens (Anexo Unico)
// -------------------------------------------------------

function TabelaItens({
  itens,
  onChange,
  readonly,
}: {
  itens: ItemLocal[]
  onChange: (itens: ItemLocal[]) => void
  readonly: boolean
}) {
  const [confirmarRemocao, setConfirmarRemocao] = useState<number | null>(null)

  function addItem() {
    onChange([
      ...itens,
      {
        numero_item: itens.length + 1,
        especificacao: '',
        unidade_medida: 'un',
        observacoes: '',
      },
    ])
  }

  function removeItem(idx: number) {
    const novo = itens.filter((_, i) => i !== idx).map((it, i) => ({ ...it, numero_item: i + 1 }))
    onChange(novo)
  }

  function updateItem(idx: number, campo: keyof ItemLocal, valor: string) {
    onChange(itens.map((it, i) => i === idx ? { ...it, [campo]: valor } : it))
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
          <Package className="w-3.5 h-3.5 text-gray-400" />
          Descricao dos itens (Anexo Unico)
        </Label>
        {!readonly && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={addItem}
            className="h-7 text-xs gap-1"
          >
            <Plus className="w-3 h-3" />
            Adicionar item
          </Button>
        )}
      </div>

      {itens.length === 0 ? (
        <div className="text-center py-8 border border-dashed border-gray-200 rounded-lg text-sm text-gray-400">
          Nenhum item cadastrado. {!readonly && 'Clique em "Adicionar item" para comecar.'}
        </div>
      ) : (
        <div className="border border-gray-200 rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-3 py-2 text-xs font-semibold text-gray-600 w-12">Item</th>
                <th className="text-left px-3 py-2 text-xs font-semibold text-gray-600">Especificacao</th>
                <th className="text-left px-3 py-2 text-xs font-semibold text-gray-600 w-24">Unidade</th>
                {!readonly && <th className="w-10" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {itens.map((item, idx) => (
                <tr key={idx} className="bg-white">
                  <td className="px-3 py-2 text-gray-500 text-center font-mono text-xs">
                    {String(item.numero_item).padStart(2, '0')}
                  </td>
                  <td className="px-3 py-2">
                    {readonly ? (
                      <p className="text-gray-800">{item.especificacao}</p>
                    ) : (
                      <Textarea
                        rows={2}
                        value={item.especificacao}
                        onChange={e => updateItem(idx, 'especificacao', e.target.value)}
                        placeholder="Descreva o item conforme normas tecnicas..."
                        className="resize-none text-sm min-h-0"
                      />
                    )}
                    {item.observacoes && (
                      <p className="text-xs text-gray-400 mt-1">{item.observacoes}</p>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {readonly ? (
                      <span className="text-gray-600">{item.unidade_medida}</span>
                    ) : (
                      <Input
                        value={item.unidade_medida}
                        onChange={e => updateItem(idx, 'unidade_medida', e.target.value)}
                        className="h-8 text-sm"
                        placeholder="un"
                      />
                    )}
                  </td>
                  {!readonly && (
                    <td className="px-2 py-2">
                      <button
                        type="button"
                        onClick={() => setConfirmarRemocao(idx)}
                        className="p-1 rounded text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <AlertDialog
        open={confirmarRemocao !== null}
        onOpenChange={open => { if (!open) setConfirmarRemocao(null) }}
        titulo="Remover item"
        descricao="Esta acao nao pode ser desfeita. O item sera removido do Anexo Unico."
        labelConfirmar="Remover"
        onConfirmar={() => { if (confirmarRemocao !== null) removeItem(confirmarRemocao) }}
      />
    </div>
  )
}

// -------------------------------------------------------
// Painel de participacoes (resumo para a secretaria iniciadora)
// -------------------------------------------------------

function PainelParticipacoes({ participacoes }: { participacoes: DFDParticipacaoRow[] }) {
  if (participacoes.length <= 1) return null

  const respondidas = participacoes.filter(p => p.status !== 'pendente')
  const aderidas = participacoes.filter(p => p.status === 'aderida')

  return (
    <div className="border border-blue-100 bg-blue-50/50 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-semibold text-blue-800 uppercase tracking-wide">Secretarias convidadas</p>
        <span className="text-xs text-blue-600">
          {respondidas.length - 1}/{participacoes.length - 1} responderam
        </span>
      </div>
      <div className="space-y-1.5">
        {participacoes.filter(p => p.tipo === 'participante').map(p => (
          <div key={p.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 border border-blue-100">
            <span className="text-sm text-gray-700">{p.secretaria_nome}</span>
            {p.status === 'pendente' && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200">Aguardando</span>
            )}
            {p.status === 'aderida' && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-200">Aderiu</span>
            )}
            {p.status === 'recusada' && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-200">Recusou</span>
            )}
          </div>
        ))}
      </div>
      {aderidas.length > 1 && (
        <p className="text-xs text-blue-600">
          {aderidas.length - 1} secretaria{aderidas.length - 1 !== 1 ? 's' : ''} confirmou participacao.
        </p>
      )}
    </div>
  )
}

// -------------------------------------------------------
// Componente principal
// -------------------------------------------------------

export default function EditorDFD({
  dfd,
  processoId,
  papelUsuario,
  podeEditar = true,
  cotacaoPendente = false,
}: {
  dfd: DFDCompleto
  processoId: string
  papelUsuario: PapelUsuario
  podeEditar?: boolean
  cotacaoPendente?: boolean
}) {
  const assinado = dfd.status === 'assinado'
  const emAdesao = dfd.status_adesao === 'aguardando_adesao'
  const readonly = assinado || emAdesao || !podeEditar

  const [objeto, setObjeto] = useState(dfd.objeto)
  const [justificativa, setJustificativa] = useState(dfd.justificativa_necessidade ?? '')
  const [fiscal, setFiscal] = useState(dfd.fiscal_contrato ?? '')
  const [dotacao, setDotacao] = useState(dfd.dotacao_orcamentaria ?? '')
  const [itens, setItens] = useState<ItemLocal[]>(
    dfd.itens.map(i => ({
      id: i.id,
      numero_item: i.numero_item,
      especificacao: i.especificacao,
      unidade_medida: i.unidade_medida,
      observacoes: i.observacoes ?? '',
    }))
  )

  const [salvando, setSalvando] = useState(false)
  const [gerandoJust, setGerandoJust] = useState(false)

  const autoSalvarCampos = useCallback(async () => {
    if (readonly) return
    await atualizarDFD(dfd.id, {
      objeto,
      justificativa_necessidade: justificativa,
      fiscal_contrato: fiscal,
      dotacao_orcamentaria: dotacao,
    })
  }, [dfd.id, objeto, justificativa, fiscal, dotacao, readonly])

  const { status: autoSaveStatus, lastSavedAt, retrySave } = useAutoSave(
    [objeto, justificativa, fiscal, dotacao],
    autoSalvarCampos,
  )
  const [modalEncaminhar, setModalEncaminhar] = useState(false)
  const [justEditadaIA, setJustEditadaIA] = useState(false)

  const handleSalvar = useCallback(async () => {
    setSalvando(true)
    const [resDfd, resItens] = await Promise.all([
      atualizarDFD(dfd.id, {
        objeto,
        justificativa_necessidade: justificativa,
        fiscal_contrato: fiscal,
        dotacao_orcamentaria: dotacao,
      }),
      salvarItensDFD(dfd.id, itens.map(i => ({
        numero_item: i.numero_item,
        especificacao: i.especificacao,
        unidade_medida: i.unidade_medida,
        observacoes: i.observacoes || undefined,
      }))),
    ])

    if (!resDfd.success || !resItens.success) {
      toast.error(resDfd.error ?? resItens.error ?? 'Erro ao salvar.')
    } else {
      toast.success('DFD salvo com sucesso.')
    }
    setSalvando(false)
  }, [dfd.id, objeto, justificativa, fiscal, dotacao, itens])

  async function handleGerarJustificativa() {
    if (!objeto || objeto.length < 5) {
      toast.warning('Preencha o campo "Objeto" antes de gerar a justificativa.')
      return
    }
    setGerandoJust(true)
    const res = await gerarJustificativaIA(objeto, processoId)
    if (res.success && res.texto) {
      setJustificativa(res.texto)
      setJustEditadaIA(true)
      toast.success('Justificativa gerada pela IA.')
    } else {
      toast.error(res.error ?? 'Erro ao gerar justificativa.')
    }
    setGerandoJust(false)
  }

  const podeEncaminhar =
    dfd.status_adesao === 'rascunho' &&
    !assinado &&
    itens.length > 0 &&
    objeto.trim().length > 0

  return (
    <>
      <Card className="border-gray-200 shadow-sm">
        <CardContent className="p-6 space-y-6">

          {/* Cabecalho institucional */}
          <CabecalhoDFD dfd={dfd} />

          {/* Badge de status de adesao (se compartilhado) */}
          {dfd.tipo === 'compartilhado' && (
            <div className="flex items-center gap-2">
              <BadgeAdesao status={dfd.status_adesao} />
              {dfd.prazo_adesao && (
                <span className="text-xs text-gray-500">
                  Prazo: {new Date(dfd.prazo_adesao).toLocaleDateString('pt-BR')}
                </span>
              )}
            </div>
          )}

          {/* Painel de participacoes */}
          <PainelParticipacoes participacoes={dfd.participacoes} />

          {/* Objeto */}
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2">
              <Label className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                <FileText className="w-3.5 h-3.5 text-gray-400" />
                1. Objeto
              </Label>
              {!readonly && (
                <div className="flex items-center gap-1.5">
                  <BotaoSugerirConteudo
                    contexto={{
                      nomeCampo: 'Objeto da Contratacao',
                      documentoContexto: 'DFD — Documento de Formalizacao da Demanda',
                      artigo: 'Art. 6, X da Lei 14.133/21',
                      dadosProcesso: {
                        objeto: objeto || dfd.secretaria_nome,
                        secretaria: dfd.secretaria_nome,
                      },
                    }}
                    onTextoSugerido={texto => setObjeto(texto)}
                    secaoLabel="Objeto"
                  />
                  <BotaoMelhorarCampo
                    textoAtual={objeto}
                    contexto={{
                      nomeCampo: 'Objeto da Contratacao',
                      documentoContexto: 'DFD — Documento de Formalizacao da Demanda',
                      artigo: 'Art. 6, X da Lei 14.133/21',
                      dadosProcesso: { secretaria: dfd.secretaria_nome },
                    }}
                    onTextMelhorado={texto => setObjeto(texto)}
                  />
                </div>
              )}
            </div>
            <Textarea
              rows={4}
              value={objeto}
              onChange={e => setObjeto(e.target.value)}
              placeholder="Descreva o objeto a ser contratado ou adquirido..."
              disabled={readonly}
              className="resize-y"
            />
          </div>

          {/* Justificativa da necessidade */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label className="flex items-center gap-1.5 text-sm font-medium text-gray-700">
                <FileText className="w-3.5 h-3.5 text-gray-400" />
                Justificativa da necessidade da contratacao
                {justEditadaIA && (
                  <span className="text-xs font-normal text-purple-600 bg-purple-50 px-1.5 py-0.5 rounded ml-1">
                    Gerado por IA
                  </span>
                )}
              </Label>
              {!readonly && (
                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    className="h-7 text-xs text-purple-700 border-purple-200 bg-purple-50 hover:bg-purple-100 gap-1"
                    onClick={handleGerarJustificativa}
                    disabled={gerandoJust}
                  >
                    {gerandoJust
                      ? <Loader2 className="w-3 h-3 animate-spin" />
                      : <Wand2 className="w-3 h-3" />}
                    Gerar com IA
                  </Button>
                  <BotaoMelhorarCampo
                    textoAtual={justificativa}
                    contexto={{
                      nomeCampo: 'Justificativa da Necessidade',
                      documentoContexto: 'DFD — Documento de Formalizacao da Demanda',
                      artigo: 'Art. 6, X, alinea "a" da Lei 14.133/21',
                    }}
                    onTextMelhorado={texto => { setJustificativa(texto); setJustEditadaIA(true) }}
                  />
                </div>
              )}
            </div>
            <Textarea
              rows={5}
              value={justificativa}
              onChange={e => { setJustificativa(e.target.value); setJustEditadaIA(false) }}
              placeholder="A justificativa será gerada automaticamente ao clicar em 'Gerar com IA', ou pode ser preenchida manualmente..."
              disabled={readonly}
              className={`resize-y ${justEditadaIA ? 'border-purple-200 bg-purple-50/20' : ''}`}
            />
          </div>

          {/* Tabela de itens */}
          <TabelaItens itens={itens} onChange={setItens} readonly={readonly} />

          {/* Fiscal e Dotacao */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Fiscal do Contrato</Label>
              <Input
                value={fiscal}
                onChange={e => setFiscal(e.target.value)}
                placeholder="Nome completo do fiscal"
                disabled={readonly}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-gray-700">Dotacao Orcamentaria</Label>
              <Input
                value={dotacao}
                onChange={e => setDotacao(e.target.value)}
                placeholder="Ex: Centro de custo 02 - Secretaria da Administracao"
                disabled={readonly}
              />
            </div>
          </div>

          {/* Aviso secretario responsavel */}
          {dfd.secretario_responsavel && (
            <div className="flex items-center gap-2 p-3 bg-gray-50 border border-gray-100 rounded-lg text-sm text-gray-600">
              <User className="w-4 h-4 shrink-0 text-gray-400" />
              <span>
                <strong>Secretario(a) da pasta:</strong> {dfd.secretario_responsavel}
              </span>
            </div>
          )}

          {assinado && (
            <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-100 rounded-lg text-sm text-blue-700">
              <Save className="w-4 h-4 shrink-0" />
              Este documento foi assinado e nao pode ser editado.
            </div>
          )}

          {emAdesao && (
            <div className="flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-lg text-sm text-amber-800">
              <Share2 className="w-4 h-4 shrink-0" />
              Este DFD esta aguardando adesao das secretarias convidadas. Edicao bloqueada ate consolidacao.
            </div>
          )}

        </CardContent>

        {cotacaoPendente && !readonly && (
          <div className="px-6 pb-0 pt-4">
            <AvisoCotacaoPendente processoId={processoId} />
          </div>
        )}
        <CardFooter className="flex items-center justify-between border-t border-gray-100 bg-gray-50/50 px-6 py-4 rounded-b-xl gap-3 flex-wrap">
          <div className="flex items-center gap-2">
            <BotaoTramitacao
              tabela="dfd"
              documentoId={dfd.id}
              processoId={processoId}
              statusAtual={dfd.status}
              papelUsuario={papelUsuario}
            />
            {podeEncaminhar && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1.5 h-9 text-sm text-blue-700 border-blue-200 hover:bg-blue-50"
                onClick={() => setModalEncaminhar(true)}
              >
                <Share2 className="w-4 h-4" />
                Encaminhar para adesao
              </Button>
            )}
          </div>

          <div className="flex items-center gap-2">
            {!readonly && (
              <AutoSaveIndicator
                status={autoSaveStatus}
                lastSavedAt={lastSavedAt}
                onRetry={retrySave}
              />
            )}
            <Button
              onClick={handleSalvar}
              disabled={salvando || readonly}
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

      {modalEncaminhar && (
        <ModalEncaminharAdesao
          dfdId={dfd.id}
          processoId={processoId}
          onClose={() => setModalEncaminhar(false)}
        />
      )}
    </>
  )
}