'use client'

import { useState, useTransition } from 'react'
import { salvarPermissoesPapel, restaurarPadraoPermissoesPapel } from '@/lib/actions/permissoes'
import type { DadosPermissaoPapel, ItemPermissao } from '@/lib/actions/permissoes'
import type { PapelUsuario } from '@/types/database'

const TABS_PROCESSO = [
  { slug: 'dfd',         label: 'DFD',         desc: 'Formalizacao da Demanda' },
  { slug: 'cotacao',     label: 'Cotacao',      desc: 'Pesquisa de Precos' },
  { slug: 'etp',         label: 'ETP',          desc: 'Estudo Tecnico Preliminar' },
  { slug: 'tr',          label: 'TR',           desc: 'Termo de Referencia' },
  { slug: 'riscos',      label: 'Riscos',       desc: 'Mapa de Riscos' },
  { slug: 'edital',      label: 'Edital',       desc: 'Edital da Licitacao' },
  { slug: 'revisao',     label: 'Revisao',      desc: 'Revisao do Setor de Licitacoes' },
  { slug: 'parecer',     label: 'Parecer',      desc: 'Parecer Juridico (Art. 53)' },
  { slug: 'autorizacao', label: 'Autorizacao',  desc: 'Autorizacao da Autoridade Competente' },
  { slug: 'publicacao',  label: 'Publicacao',   desc: 'Publicacao do Processo' },
]

const PAPEIS_CONFIGURÁVEIS: { papel: PapelUsuario; label: string; descricao: string }[] = [
  { papel: 'requisitante',          label: 'Requisitante',          descricao: 'Servidor que solicita a contratacao' },
  { papel: 'setor_licitacao',       label: 'Setor de Licitacoes',   descricao: 'Responsavel pela instrucao processual' },
  { papel: 'procurador',            label: 'Procurador',            descricao: 'Emite parecer juridico (Art. 53)' },
  { papel: 'autoridade_competente', label: 'Autoridade Competente', descricao: 'Autoriza a abertura do certame' },
]

type Props = {
  initialData: Record<string, DadosPermissaoPapel>
}

function Toggle({ ativo, onChange, disabled }: { ativo: boolean; onChange: () => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={ativo}
      disabled={disabled}
      onClick={onChange}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1A365D] focus-visible:ring-offset-2 ${
        disabled
          ? 'cursor-not-allowed opacity-40'
          : 'cursor-pointer'
      } ${ativo ? 'bg-[#1A365D]' : 'bg-[#E3E2E6]'}`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 rounded-full bg-white shadow transition-transform ${
          ativo ? 'translate-x-4' : 'translate-x-0.5'
        }`}
      />
    </button>
  )
}

export default function MatrizPermissoes({ initialData }: Props) {
  const [papelAtivo, setPapelAtivo] = useState<PapelUsuario>('requisitante')
  const [estado, setEstado] = useState<Record<string, DadosPermissaoPapel>>(initialData)
  const [dirty, setDirty] = useState<Record<string, boolean>>({})
  const [feedback, setFeedback] = useState<{ tipo: 'sucesso' | 'erro'; msg: string } | null>(null)
  const [isPending, startTransition] = useTransition()

  const dadosPapel = estado[papelAtivo] ?? { permissoes: [], customizado: false }

  function toggleCelula(tabSlug: string, campo: 'pode_ver' | 'pode_editar') {
    setEstado(prev => {
      const atual = prev[papelAtivo]
      const novasPermissoes = atual.permissoes.map(p => {
        if (p.tab_slug !== tabSlug) return p
        if (campo === 'pode_ver') {
          // desativar visivel implica desativar editavel
          return { ...p, pode_ver: !p.pode_ver, pode_editar: !p.pode_ver ? p.pode_editar : false }
        }
        return { ...p, pode_editar: !p.pode_editar }
      })
      return { ...prev, [papelAtivo]: { ...atual, permissoes: novasPermissoes } }
    })
    setDirty(prev => ({ ...prev, [papelAtivo]: true }))
    setFeedback(null)
  }

  function salvar() {
    startTransition(async () => {
      const resultado = await salvarPermissoesPapel(papelAtivo, dadosPapel.permissoes)
      if (resultado.success) {
        setEstado(prev => ({
          ...prev,
          [papelAtivo]: { ...prev[papelAtivo], customizado: true },
        }))
        setDirty(prev => ({ ...prev, [papelAtivo]: false }))
        setFeedback({ tipo: 'sucesso', msg: 'Permissoes salvas com sucesso.' })
      } else {
        setFeedback({ tipo: 'erro', msg: resultado.error ?? 'Erro ao salvar.' })
      }
    })
  }

  function restaurar() {
    startTransition(async () => {
      const resultado = await restaurarPadraoPermissoesPapel(papelAtivo)
      if (resultado.success) {
        const permissoesPadrao = initialData[papelAtivo]
          ? initialData[papelAtivo].permissoes
          : dadosPapel.permissoes
        setEstado(prev => ({
          ...prev,
          [papelAtivo]: { permissoes: permissoesPadrao, customizado: false },
        }))
        setDirty(prev => ({ ...prev, [papelAtivo]: false }))
        setFeedback({ tipo: 'sucesso', msg: 'Configuracao restaurada para o padrao da plataforma.' })
      } else {
        setFeedback({ tipo: 'erro', msg: resultado.error ?? 'Erro ao restaurar.' })
      }
    })
  }

  return (
    <div className="space-y-4">

      {/* Seletor de papel */}
      <div
        className="bg-white border border-[#E3E2E6] rounded-xl p-1 flex gap-1"
        style={{ boxShadow: '0 1px 4px rgba(26,54,93,0.04)' }}
      >
        {PAPEIS_CONFIGURÁVEIS.map(({ papel, label, descricao }) => {
          const isAtivo = papel === papelAtivo
          const isCustomizado = estado[papel]?.customizado ?? false
          return (
            <button
              key={papel}
              type="button"
              onClick={() => { setPapelAtivo(papel); setFeedback(null) }}
              className={`flex-1 flex flex-col items-start px-3 py-2.5 rounded-lg text-left transition-all ${
                isAtivo
                  ? 'bg-[#1A365D] text-white'
                  : 'text-[#43474E] hover:bg-[#F4F3F7]'
              }`}
            >
              <div className="flex items-center gap-2 w-full">
                <span className={`text-[13px] font-semibold ${isAtivo ? 'text-white' : 'text-[#1A365D]'}`}>
                  {label}
                </span>
                {isCustomizado && (
                  <span
                    className={`text-[9px] font-bold px-1.5 py-0.5 rounded-full ml-auto ${
                      isAtivo
                        ? 'bg-white/20 text-white'
                        : 'bg-[#B7935E]/10 text-[#B7935E]'
                    }`}
                  >
                    CUSTOM
                  </span>
                )}
              </div>
              <span className={`text-[11px] mt-0.5 hidden md:block ${isAtivo ? 'text-white/70' : 'text-[#74777F]'}`}>
                {descricao}
              </span>
            </button>
          )
        })}
      </div>

      {/* Matriz de permissoes */}
      <div
        className="bg-white border border-[#E3E2E6] rounded-xl overflow-hidden"
        style={{ boxShadow: '0 1px 4px rgba(26,54,93,0.04)' }}
      >
        {/* Cabecalho da tabela */}
        <div className="grid grid-cols-[1fr_auto_auto] gap-x-8 px-5 py-3 border-b border-[#F4F3F7] bg-[#F9F9FB]">
          <span className="text-[11px] font-semibold text-[#74777F] uppercase tracking-wider">
            Etapa do Processo
          </span>
          <span className="text-[11px] font-semibold text-[#74777F] uppercase tracking-wider w-16 text-center">
            Visivel
          </span>
          <span className="text-[11px] font-semibold text-[#74777F] uppercase tracking-wider w-16 text-center">
            Editavel
          </span>
        </div>

        {/* Linhas */}
        <div className="divide-y divide-[#F4F3F7]">
          {TABS_PROCESSO.map((tab, idx) => {
            const perm = dadosPapel.permissoes.find(p => p.tab_slug === tab.slug) ?? {
              tab_slug: tab.slug, pode_ver: false, pode_editar: false,
            }
            const isImpar = idx % 2 === 1
            return (
              <div
                key={tab.slug}
                className={`grid grid-cols-[1fr_auto_auto] gap-x-8 px-5 py-3 items-center transition-colors ${
                  isImpar ? 'bg-[#FAFAFA]' : 'bg-white'
                } hover:bg-[#F4F3F7]/60`}
              >
                <div>
                  <p className="text-[13px] font-medium text-[#1A1C1E]">{tab.label}</p>
                  <p className="text-[11px] text-[#74777F]">{tab.desc}</p>
                </div>
                <div className="w-16 flex justify-center">
                  <Toggle
                    ativo={perm.pode_ver}
                    onChange={() => toggleCelula(tab.slug, 'pode_ver')}
                    disabled={isPending}
                  />
                </div>
                <div className="w-16 flex justify-center">
                  <Toggle
                    ativo={perm.pode_editar}
                    onChange={() => toggleCelula(tab.slug, 'pode_editar')}
                    disabled={isPending || !perm.pode_ver}
                  />
                </div>
              </div>
            )
          })}
        </div>

        {/* Footer com acoes */}
        <div className="px-5 py-3.5 border-t border-[#E3E2E6] flex items-center justify-between gap-3 bg-white">
          <div className="flex items-center gap-2">
            {feedback && (
              <p className={`text-[12px] font-medium ${feedback.tipo === 'sucesso' ? 'text-[#1A6637]' : 'text-red-600'}`}>
                {feedback.msg}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            {dadosPapel.customizado && (
              <button
                type="button"
                onClick={restaurar}
                disabled={isPending}
                className="px-3 py-1.5 text-[12px] font-medium text-[#74777F] border border-[#E3E2E6] rounded-lg hover:bg-[#F4F3F7] hover:text-[#43474E] transition-colors disabled:opacity-50"
              >
                Restaurar padrao
              </button>
            )}
            <button
              type="button"
              onClick={salvar}
              disabled={isPending || !dirty[papelAtivo]}
              className="px-4 py-1.5 text-[12px] font-semibold text-white rounded-lg transition-colors disabled:opacity-40"
              style={{ backgroundColor: dirty[papelAtivo] && !isPending ? '#1A365D' : '#74777F' }}
            >
              {isPending ? 'Salvando...' : 'Salvar alteracoes'}
            </button>
          </div>
        </div>
      </div>

      {/* Nota sobre admins */}
      <p className="text-[11px] text-[#74777F] px-1">
        Os perfis Administrador e Admin da Plataforma sempre tem acesso completo a todas as etapas e nao sao configuraveis.
      </p>
    </div>
  )
}