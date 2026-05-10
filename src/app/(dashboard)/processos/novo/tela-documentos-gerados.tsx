'use client'

import { useState } from 'react'
import { Pencil, Check, X } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import BadgeOrigem from './badge-origem'
import type { DocumentosGerados, SecaoGerada } from './types'

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

interface Props {
  documentos: DocumentosGerados
  onEditar: (doc: 'dfd' | 'etp' | 'tr', tipoCampo: string, novoTexto: string) => void
  onConfirmar: () => void
  onVoltar: () => void
  salvando: boolean
}

export default function TelaDocumentosGerados({ documentos, onEditar, onConfirmar, onVoltar, salvando }: Props) {
  const [abaAtiva, setAbaAtiva] = useState<'dfd' | 'etp' | 'tr'>('dfd')

  const abas: { key: 'dfd' | 'etp' | 'tr'; label: string }[] = [
    { key: 'dfd', label: 'DFD' },
    { key: 'etp', label: 'ETP' },
    { key: 'tr', label: 'TR' },
  ]

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-gray-900">Documentos gerados</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Revise o conteudo de cada documento. Edite as secoes se necessario e confirme para criar o processo.
        </p>
      </div>

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

      <div className="flex items-center justify-between pt-2">
        <button
          type="button"
          onClick={onVoltar}
          disabled={salvando}
          className="px-4 py-2 text-sm text-gray-600 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
        >
          Reeditar dados
        </button>
        <button
          type="button"
          onClick={onConfirmar}
          disabled={salvando}
          className="flex items-center gap-2 px-5 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50"
        >
          {salvando ? (
            <>
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Salvando...
            </>
          ) : (
            <>
              <Check className="w-4 h-4" />
              Confirmar e criar processo
            </>
          )}
        </button>
      </div>
    </div>
  )
}
