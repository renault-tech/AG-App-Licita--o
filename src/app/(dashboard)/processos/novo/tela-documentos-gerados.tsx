'use client'

import { useState } from 'react'
import { AlertTriangle, Check, Clock, Pencil, Settings, Share2, X } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import BadgeOrigem from './badge-origem'
import { enviarPedidoAdesaoWizard } from '@/lib/actions/avisos'
import type { DadosWizard, DocumentosGerados, SecaoGerada } from './types'

const LABELS_CAMPOS: Record<string, string> = {
  objeto_dfd: 'Objeto da Demanda',
  justificativa_necessidade: 'Justificativa da Necessidade',
  dotacao_orcamentaria: 'Dotacao Orcamentaria',
  descricao_necessidade: '1. Descricao da Necessidade',
  requisitos_contratacao: '2. Requisitos da Contratacao',
  levantamento_mercado: '3. Levantamento de Mercado',
  justificativa_solucao: '4. Justificativa da Solucao',
  parcelamento: '5. Viabilidade de Parcelamento',
  resultados_pretendidos: '6. Resultados Pretendidos',
  providencias: '7. Providencias Previas',
  objeto_tr: 'Objeto',
  fundamentacao: '1. Fundamentacao',
  modelo_execucao: '2. Modelo de Execucao',
  modelo_gestao: '3. Modelo de Gestao',
  criterios_medicao: '4. Criterios de Medicao',
  forma_pagamento: '5. Forma de Pagamento',
  garantias: '6. Garantias',
  sancoes: '7. Sancoes Administrativas',
}

function SecaoDocumento({
  secao,
  onEditar,
}: {
  secao: SecaoGerada
  onEditar: (tipoCampo: string, novoTexto: string) => void
}) {
  const [editando, setEditando] = useState(false)
  const [textoLocal, setTextoLocal] = useState(secao.texto)

  function confirmar() {
    onEditar(secao.tipo_campo, textoLocal)
    setEditando(false)
  }

  function cancelar() {
    setTextoLocal(secao.texto)
    setEditando(false)
  }

  return (
    <div className="space-y-2 pb-4 border-b border-gray-100 last:border-0">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
          {LABELS_CAMPOS[secao.tipo_campo] ?? secao.tipo_campo}
        </p>
        <div className="flex items-center gap-2 shrink-0">
          <BadgeOrigem origem={secao.origem} processosReferencia={secao.processos_referencia} />
          {!editando && (
            <button
              type="button"
              onClick={() => setEditando(true)}
              className="p-1 rounded text-gray-300 hover:text-gray-600 hover:bg-gray-100 transition-colors"
              title="Editar secao"
            >
              <Pencil className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
      {editando ? (
        <div className="space-y-2">
          <Textarea
            value={textoLocal}
            onChange={e => setTextoLocal(e.target.value)}
            rows={6}
            className="text-sm"
            autoFocus
          />
          <div className="flex gap-2 justify-end">
            <button
              type="button"
              onClick={cancelar}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
            >
              <X className="w-3 h-3" /> Cancelar
            </button>
            <button
              type="button"
              onClick={confirmar}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <Check className="w-3 h-3" /> Confirmar
            </button>
          </div>
        </div>
      ) : (
        <p className="text-sm text-gray-700 leading-relaxed whitespace-pre-wrap">
          {secao.texto || <span className="italic text-gray-400">Sem conteudo gerado.</span>}
        </p>
      )}
    </div>
  )
}

interface Secretaria {
  id: string
  nome: string
  sigla: string | null
}

interface Props {
  documentos: DocumentosGerados
  dados: DadosWizard
  secretarias: Secretaria[]
  iaModeloSolicitado: boolean
  onEditar: (doc: 'dfd' | 'etp' | 'tr', tipoCampo: string, novoTexto: string) => void
  onConfirmar: (avisoId?: string) => void
  onVoltar: () => void
  salvando: boolean
}

const STORAGE_KEY_AVISO = 'licitaia_wizard_aviso'

export default function TelaDocumentosGerados({ documentos, dados, secretarias, iaModeloSolicitado, onEditar, onConfirmar, onVoltar, salvando }: Props) {
  const [abaAtiva, setAbaAtiva] = useState<'dfd' | 'etp' | 'tr'>('dfd')
  const [modalAberta, setModalAberta] = useState(false)
  const [secsSelecionadas, setSecsSelecionadas] = useState<string[]>([])
  const [prazoAdesaoDias, setPrazoAdesaoDias] = useState(7)
  const [enviandoPedido, setEnviandoPedido] = useState(false)

  // Estado persistente do aviso enviado (sobrevive a re-render)
  const [avisoState, setAvisoState] = useState<{ avisoId: string; prazoAdesao: string } | null>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY_AVISO) ?? 'null') } catch { return null }
  })

  const abas: { key: 'dfd' | 'etp' | 'tr'; label: string }[] = [
    { key: 'dfd', label: 'DFD' },
    { key: 'etp', label: 'ETP' },
    { key: 'tr', label: 'TR' },
  ]

  const todasSecoes = [...documentos.dfd.secoes, ...documentos.etp.secoes, ...documentos.tr.secoes]
  const iaFoiUsada = todasSecoes.some(s => s.origem === 'ia')
  const temSecoesVazias = todasSecoes.some(s => !s.texto)

  // Secretarias disponiveis para convite (excluindo a propria secretaria do wizard)
  const secretariasDisponiveis = secretarias.filter(s => s.id !== dados.secretaria_id)

  // Verifica se prazo de aviso ainda nao expirou
  const prazoExpirado = avisoState
    ? new Date() >= new Date(avisoState.prazoAdesao)
    : true

  const confirmarDesativado = salvando || (!!avisoState && !prazoExpirado)

  async function handleEnviarPedido() {
    if (secsSelecionadas.length === 0) {
      toast.error('Selecione ao menos uma secretaria para convidar.')
      return
    }
    if (prazoAdesaoDias < 1 || prazoAdesaoDias > 60) {
      toast.error('O prazo deve ser entre 1 e 60 dias.')
      return
    }

    setEnviandoPedido(true)
    const res = await enviarPedidoAdesaoWizard({
      secretariaOrigemId: dados.secretaria_id,
      modalidade: dados.modalidade,
      categoriaObjeto: dados.categoria_objeto,
      objeto: dados.objeto,
      itensWizard: dados.itens.map(i => ({ descricao: i.descricao, unidade: i.unidade, quantidade: i.quantidade })),
      prazoAdesaoDias,
      secretariasConvidadas: secsSelecionadas,
    })
    setEnviandoPedido(false)

    if (!res.success || !res.avisoId) {
      toast.error(res.error ?? 'Erro ao enviar pedido de adesao.')
      return
    }

    const estado = { avisoId: res.avisoId, prazoAdesao: res.prazoAdesao! }
    setAvisoState(estado)
    try { localStorage.setItem(STORAGE_KEY_AVISO, JSON.stringify(estado)) } catch {}
    setModalAberta(false)
    toast.success('Pedido de adesao enviado. Aguardando respostas das secretarias.')
  }

  function toggleSecretaria(id: string) {
    setSecsSelecionadas(prev =>
      prev.includes(id) ? prev.filter(s => s !== id) : [...prev, id]
    )
  }

  function handleConfirmar() {
    try { localStorage.removeItem(STORAGE_KEY_AVISO) } catch {}
    onConfirmar(avisoState?.avisoId)
  }

  const prazoAdesaoFormatada = avisoState
    ? new Date(avisoState.prazoAdesao).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : null

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-gray-900">Documentos gerados</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Revise o conteudo de cada documento. Edite as secoes se necessario e confirme para criar o processo.
        </p>
      </div>

      {/* Banner: IA solicitada mas nao utilizada */}
      {iaModeloSolicitado && !iaFoiUsada && (
        <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
          <AlertTriangle className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-amber-800">
              IA nao foi utilizada nesta geracao
            </p>
            <p className="text-xs text-amber-700 mt-0.5">
              Os documentos foram gerados com os templates padrao. Para ativar o refinamento por IA, configure o provedor nas{' '}
              <Link href="/configuracoes/ia" className="font-semibold underline hover:text-amber-900">
                configuracoes da organizacao
              </Link>
              .
            </p>
          </div>
          <Link
            href="/configuracoes/ia"
            className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-amber-700 border border-amber-300 rounded-lg hover:bg-amber-100 transition-colors shrink-0"
          >
            <Settings className="w-3 h-3" />
            Configurar
          </Link>
        </div>
      )}

      {/* Banner: secoes sem conteudo */}
      {temSecoesVazias && (
        <div className="flex items-start gap-3 p-3 bg-red-50 border border-red-200 rounded-xl">
          <AlertTriangle className="w-4 h-4 text-red-500 mt-0.5 shrink-0" />
          <p className="text-sm text-red-700">
            Algumas secoes ficaram sem conteudo. Clique no icone de edicao (lapiz) para preenche-las manualmente antes de confirmar.
          </p>
        </div>
      )}

      {/* Banner: aviso enviado, aguardando respostas */}
      {avisoState && !prazoExpirado && (
        <div className="flex items-start gap-3 p-3 bg-blue-50 border border-blue-200 rounded-xl">
          <Clock className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-blue-800">
              Aguardando respostas das secretarias
            </p>
            <p className="text-xs text-blue-700 mt-0.5">
              Pedido de adesao enviado. O prazo para resposta encerra em {prazoAdesaoFormatada}. O botao de confirmacao sera liberado apos o prazo.
            </p>
          </div>
        </div>
      )}

      {/* Banner: prazo expirado, pronto para confirmar */}
      {avisoState && prazoExpirado && (
        <div className="flex items-start gap-3 p-3 bg-green-50 border border-green-200 rounded-xl">
          <Check className="w-4 h-4 text-green-600 mt-0.5 shrink-0" />
          <div className="flex-1">
            <p className="text-sm font-medium text-green-800">
              Prazo encerrado. Processo pronto para ser criado com os dados consolidados.
            </p>
            <p className="text-xs text-green-700 mt-0.5">
              As respostas das secretarias serao incorporadas ao DFD automaticamente.
            </p>
          </div>
        </div>
      )}

      <div className="flex border-b border-gray-200">
        {abas.map(aba => (
          <button
            key={aba.key}
            type="button"
            onClick={() => setAbaAtiva(aba.key)}
            className={`px-5 py-2.5 text-sm font-medium border-b-2 transition-colors ${
              abaAtiva === aba.key
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            {aba.label}
          </button>
        ))}
      </div>

      <div className="space-y-4 bg-white border border-gray-200 rounded-xl p-5">
        {documentos[abaAtiva].secoes.map(secao => (
          <SecaoDocumento
            key={secao.tipo_campo}
            secao={secao}
            onEditar={(campo, texto) => onEditar(abaAtiva, campo, texto)}
          />
        ))}
      </div>

      <div className="flex items-center justify-between pt-2 gap-3 flex-wrap">
        <button
          type="button"
          onClick={onVoltar}
          disabled={salvando}
          className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          Reeditar dados
        </button>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Botao Compra Compartilhada — visivel apenas se ainda nao enviou pedido */}
          {!avisoState && secretariasDisponiveis.length > 0 && (
            <button
              type="button"
              onClick={() => setModalAberta(true)}
              disabled={salvando}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-medium text-blue-700 border border-blue-300 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors disabled:opacity-50"
            >
              <Share2 className="w-3.5 h-3.5" />
              Compra Compartilhada
            </button>
          )}

          <button
            type="button"
            onClick={handleConfirmar}
            disabled={confirmarDesativado}
            title={avisoState && !prazoExpirado ? `Aguardando respostas ate ${prazoAdesaoFormatada}` : undefined}
            className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {salvando ? (
              <>
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                Salvando...
              </>
            ) : avisoState && !prazoExpirado ? (
              <>
                <Clock className="w-4 h-4" />
                Aguardando respostas...
              </>
            ) : (
              <>
                <Check className="w-4 h-4" />
                {avisoState ? 'Confirmar e criar processo (consolidado)' : 'Confirmar e criar processo'}
              </>
            )}
          </button>
        </div>
      </div>

      {/* Modal de Compra Compartilhada */}
      {modalAberta && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 space-y-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-semibold text-gray-900">Compra Compartilhada</h3>
                <p className="text-xs text-gray-500 mt-0.5">
                  Convide outras secretarias a participar deste processo. O botao de confirmacao so sera liberado apos o prazo.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setModalAberta(false)}
                className="p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Secretarias a convidar</Label>
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {secretariasDisponiveis.map(s => (
                  <label
                    key={s.id}
                    className={`flex items-center gap-2.5 p-2.5 rounded-lg border cursor-pointer transition-colors ${
                      secsSelecionadas.includes(s.id)
                        ? 'border-blue-400 bg-blue-50'
                        : 'border-gray-200 hover:border-blue-200 hover:bg-gray-50'
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={secsSelecionadas.includes(s.id)}
                      onChange={() => toggleSecretaria(s.id)}
                      className="rounded text-blue-600"
                    />
                    <span className="text-sm text-gray-800">
                      {s.nome}{s.sigla ? ` (${s.sigla})` : ''}
                    </span>
                  </label>
                ))}
                {secretariasDisponiveis.length === 0 && (
                  <p className="text-sm text-gray-400 text-center py-3">
                    Nenhuma outra secretaria cadastrada.
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium">Prazo para resposta (dias corridos)</Label>
              <input
                type="number"
                min={1}
                max={60}
                value={prazoAdesaoDias}
                onChange={e => setPrazoAdesaoDias(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <p className="text-xs text-gray-400">
                Prazo estimado: ate {new Date(Date.now() + prazoAdesaoDias * 86_400_000).toLocaleDateString('pt-BR')}
              </p>
            </div>

            <div className="flex gap-2 justify-end pt-1">
              <button
                type="button"
                onClick={() => setModalAberta(false)}
                disabled={enviandoPedido}
                className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleEnviarPedido}
                disabled={enviandoPedido || secsSelecionadas.length === 0}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {enviandoPedido ? (
                  <>
                    <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Enviando...
                  </>
                ) : (
                  'Enviar Pedido de Adesao'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
