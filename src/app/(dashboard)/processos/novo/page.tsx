'use client'

import { useState, useTransition, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { toast } from 'sonner'
import { ArrowLeft, ChevronLeft, ChevronRight, Loader2, RotateCcw } from 'lucide-react'
import Link from 'next/link'

import EtapaIdentificacao from './etapa-identificacao'
import EtapaObjeto from './etapa-objeto'
import EtapaRequisitos from './etapa-requisitos'
import EtapaCondicoes from './etapa-condicoes'
import EtapaRevisao from './etapa-revisao'
import TelaDocumentosGerados from './tela-documentos-gerados'
import { gerarDocumentos } from '@/lib/actions/gerar-documentos'
import { gerarDocumentosWizard } from '@/lib/actions/gerar-documentos-wizard'
import { criarProcessoComDocumentos } from '@/lib/actions/processo'
import { listarSecretarias } from '@/lib/actions/secretarias'
import { obterSolicitacao } from '@/lib/actions/solicitacoes'
import { DADOS_WIZARD_INICIAL } from './types'
import type { DadosWizard, DocumentosGerados } from './types'

const SANCOES_PADRAO = `Pelo descumprimento total ou parcial das obrigacoes contratuais, a contratada ficara sujeita as sancoes previstas nos arts. 155 a 163 da Lei no 14.133/2021, a saber: (i) advertencia; (ii) multa moratoria de 0,5% por dia de atraso sobre o valor do contrato, ate o limite de 10%; (iii) multa compensatoria de 10% sobre o valor total do contrato em caso de inexecucao total; (iv) impedimento de licitar e contratar pelo prazo de ate 3 anos; e (v) declaracao de inidoneidade pelo prazo de ate 6 anos.`

const DADOS_INICIAIS: DadosWizard = {
  ...DADOS_WIZARD_INICIAL,
  garantia: '5%',
  sancoes: SANCOES_PADRAO,
}

const STORAGE_KEY = 'licitaia_wizard_draft'

const ETAPAS = [
  { num: 1, label: 'Identificacao' },
  { num: 2, label: 'Objeto' },
  { num: 3, label: 'Requisitos' },
  { num: 4, label: 'Condicoes' },
  { num: 5, label: 'Revisao' },
]

function validarEtapa(etapa: number, dados: DadosWizard): string | null {
  switch (etapa) {
    case 1:
      if (!dados.secretaria_id) return 'Selecione a secretaria requisitante.'
      if (!dados.modalidade) return 'Selecione a modalidade de licitacao.'
      if (!dados.categoria_objeto) return 'Selecione a categoria do objeto.'
      return null
    case 2:
      if (dados.objeto.length < 10) return 'Descreva o objeto com pelo menos 10 caracteres.'
      if (dados.problema_atual.length < 10) return 'Descreva o problema atual.'
      if (dados.impacto_sem_contratar.length < 10) return 'Descreva o impacto sem contratar.'
      if (dados.solucao_proposta.length < 10) return 'Descreva a solucao proposta.'
      return null
    case 3:
      if (dados.especificacoes_minimas.length < 10) return 'Descreva as especificacoes minimas.'
      return null
    case 4:
      if (!dados.forma_pagamento) return 'Selecione a forma de pagamento.'
      if (!dados.garantia) return 'Selecione a garantia contratual.'
      return null
    default:
      return null
  }
}

function todasEtapasValidas(dados: DadosWizard): boolean {
  return [1, 2, 3, 4].every(etapa => validarEtapa(etapa, dados) === null)
}

export default function NovoProcessoPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const solicitacaoId = searchParams.get('solicitacao_id') ?? undefined

  const [etapa, setEtapa] = useState(1)
  const [dados, setDados] = useState<DadosWizard>(DADOS_INICIAIS)
  const [secretarias, setSecretarias] = useState<Array<{ id: string; nome: string; sigla: string | null }>>([])
  const [expandirModalidades, setExpandirModalidades] = useState(false)
  const [documentosGerados, setDocumentosGerados] = useState<DocumentosGerados | null>(null)
  const [gerando, setGerando] = useState(false)
  const [salvando, setSalvando] = useState(false)
  const [rascunhoSalvo, setRascunhoSalvo] = useState<DadosWizard | null>(null)
  const [, startTransition] = useTransition()

  useEffect(() => {
    listarSecretarias().then(secs => setSecretarias(secs))

    // Pré-popular a partir de solicitacao de compra (fluxo DFD-first)
    if (solicitacaoId) {
      obterSolicitacao(solicitacaoId).then(sol => {
        if (!sol) return
        setDados(prev => ({
          ...prev,
          objeto: sol.objeto ?? prev.objeto,
          secretaria_id: sol.secretarias?.id ?? prev.secretaria_id,
          problema_atual: sol.justificativa ?? prev.problema_atual,
        }))
      })
      return // Ignora rascunho do localStorage quando vem de solicitacao
    }

    try {
      const salvo = localStorage.getItem(STORAGE_KEY)
      if (salvo) {
        const parsed = JSON.parse(salvo) as DadosWizard
        // Só considera rascunho se tiver algum campo preenchido além dos defaults
        if (parsed.objeto || parsed.secretaria_id || parsed.modalidade) {
          setRascunhoSalvo(parsed)
        }
      }
    } catch {}
  }, [solicitacaoId])

  function handleRestaurarRascunho() {
    if (!rascunhoSalvo) return
    setDados(prev => ({ ...prev, ...rascunhoSalvo }))
    setRascunhoSalvo(null)
    toast.success('Rascunho restaurado.')
  }

  function handleDescartarRascunho() {
    try { localStorage.removeItem(STORAGE_KEY) } catch {}
    setRascunhoSalvo(null)
  }

  function onChange(campo: keyof DadosWizard, valor: unknown) {
    setDados(prev => {
      const proximo = { ...prev, [campo]: valor }
      try { localStorage.setItem(STORAGE_KEY, JSON.stringify(proximo)) } catch {}
      return proximo
    })
  }

  function handleContinuar() {
    const erro = validarEtapa(etapa, dados)
    if (erro) {
      toast.error(erro)
      return
    }
    setEtapa(e => e + 1)
  }

  async function handleGerar() {
    setGerando(true)
    try { localStorage.removeItem('licitaia_wizard_aviso') } catch {}

    // No fluxo DFD-first (solicitacao), o DFD ja existe — gera apenas ETP e TR
    const skipDfd = !!solicitacaoId

    if (dados.ia_modelo === 'com_ia') {
      const resIA = await gerarDocumentosWizard(dados, { skipDfd })
      if (resIA.success && resIA.documentos) {
        setGerando(false)
        setDocumentosGerados({
          dfd: resIA.documentos.dfd
            ? { secoes: [{ tipo_campo: 'texto_completo', texto: resIA.documentos.dfd, origem: 'ia', processos_referencia: [] }] }
            : { secoes: [] },
          etp: { secoes: [{ tipo_campo: 'texto_completo', texto: resIA.documentos.etp, origem: 'ia', processos_referencia: [] }] },
          tr:  { secoes: [{ tipo_campo: 'texto_completo', texto: resIA.documentos.tr,  origem: 'ia', processos_referencia: [] }] },
        })
        return
      }
      // Fallback para templates quando a IA falha — exibe o motivo real
      const motivoFalha = resIA.error ?? 'Provedor de IA nao respondeu.'
      toast.warning(`Gerando com templates. IA retornou: ${motivoFalha}`, { duration: 6000 })
    }

    const res = await gerarDocumentos(dados)
    setGerando(false)
    if (!res.success || !res.documentos) {
      toast.error(res.error ?? 'Erro ao gerar documentos.')
      return
    }
    setDocumentosGerados(res.documentos)
  }

  function handleEditarSecao(doc: 'dfd' | 'etp' | 'tr', tipoCampo: string, novoTexto: string) {
    if (!documentosGerados) return
    setDocumentosGerados(prev => {
      if (!prev) return prev
      return {
        ...prev,
        [doc]: {
          secoes: prev[doc].secoes.map(s =>
            s.tipo_campo === tipoCampo ? { ...s, texto: novoTexto } : s
          ),
        },
      }
    })
  }

  function handleConfirmar(avisoId?: string) {
    if (!documentosGerados) return
    setSalvando(true)
    startTransition(async () => {
      const res = await criarProcessoComDocumentos(dados, documentosGerados, {
        avisoId,
        solicitacaoId,
      })
      setSalvando(false)
      if (!res.success || !res.processoId) {
        toast.error(res.error ?? 'Erro ao criar processo.')
        return
      }
      try { localStorage.removeItem(STORAGE_KEY) } catch {}
      toast.success('Processo criado com sucesso!')
      router.push(`/processos/${res.processoId}/dfd?revisao=1`)
    })
  }

  if (documentosGerados) {
    return (
      <div className="max-w-5xl mx-auto">
        <TelaDocumentosGerados
          documentos={documentosGerados}
          dados={dados}
          secretarias={secretarias}
          iaModeloSolicitado={dados.ia_modelo === 'com_ia'}
          onEditar={handleEditarSecao}
          onConfirmar={handleConfirmar}
          onVoltar={() => setDocumentosGerados(null)}
          salvando={salvando}
          ocultarDfd={!!solicitacaoId}
        />
      </div>
    )
  }

  const prontoParaGerar = todasEtapasValidas(dados)

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/dashboard"
          className="p-1.5 rounded-[var(--r-md)] transition-colors"
          style={{ color: 'var(--muted)' }}
          onMouseOver={e => (e.currentTarget.style.background = 'var(--surfaceAlt)')}
          onMouseOut={e => (e.currentTarget.style.background = 'transparent')}
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div>
          <h1 className="text-lg font-bold" style={{ color: 'var(--ink)', fontFamily: 'var(--font-heading)' }}>Novo Processo Licitatorio</h1>
          <p className="text-sm" style={{ color: 'var(--muted)' }}>
            {solicitacaoId
              ? 'Dados pre-preenchidos da solicitacao. Complemente e gere ETP e TR.'
              : 'Preencha os dados e o sistema gera ETP e TR automaticamente.'}
          </p>
        </div>
      </div>

      {/* Banner de rascunho salvo */}
      {rascunhoSalvo && (
        <div className="flex items-center justify-between gap-3 px-4 py-3 glass rounded-[var(--r-lg)] text-sm"
          style={{ border: '1px solid var(--warnWash)' }}
        >
          <div className="flex items-center gap-2" style={{ color: 'var(--warn)' }}>
            <RotateCcw className="w-4 h-4 shrink-0" />
            <span>Rascunho salvo encontrado. Deseja continuar de onde parou?</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleDescartarRascunho}
              className="text-xs font-medium underline underline-offset-2"
              style={{ color: 'var(--warn)' }}
            >
              Descartar
            </button>
            <button
              type="button"
              onClick={handleRestaurarRascunho}
              className="px-3 py-1.5 text-xs font-semibold rounded-[var(--r-md)] transition-opacity hover:opacity-80"
              style={{ background: 'var(--warn)', color: 'white' }}
            >
              Restaurar rascunho
            </button>
          </div>
        </div>
      )}

      {/* Stepper */}
      <div className="flex items-center gap-0">
        {ETAPAS.map(({ num, label }, i) => {
          const ativa = num === etapa
          const concluida = num < etapa
          return (
            <div key={num} className="flex items-center flex-1">
              <div className="flex flex-col items-center gap-1.5">
                <div
                className="w-8 h-8 rounded-full flex items-center justify-center border-2 transition-all text-xs font-bold"
                style={
                  ativa
                    ? { background: 'var(--primary)', borderColor: 'var(--primary)', color: 'white' }
                    : concluida
                    ? { background: 'var(--successWash)', borderColor: 'var(--success)', color: 'var(--success)' }
                    : { background: 'var(--surface)', borderColor: 'var(--hairline)', color: 'var(--muted)' }
                }
              >
                {concluida ? '✓' : num}
              </div>
              <span
                className="text-xs font-medium hidden sm:block"
                style={{ color: ativa ? 'var(--primary)' : concluida ? 'var(--success)' : 'var(--muted)' }}
              >
                {label}
              </span>
              </div>
              {i < ETAPAS.length - 1 && (
                <div
                  className="flex-1 h-0.5 mx-2 mb-5 rounded-full"
                  style={{ background: concluida ? 'var(--success)' : 'var(--hairline)', opacity: concluida ? 0.6 : 1 }}
                />
              )}
            </div>
          )
        })}
      </div>

      <div className="glass rounded-[var(--r-lg)] overflow-hidden">
        <div className="p-6">
          {etapa === 1 && (
            <EtapaIdentificacao
              dados={dados}
              onChange={onChange}
              secretarias={secretarias}
              expandirModalidades={expandirModalidades}
              setExpandirModalidades={setExpandirModalidades}
            />
          )}
          {etapa === 2 && <EtapaObjeto dados={dados} onChange={onChange} />}
          {etapa === 3 && <EtapaRequisitos dados={dados} onChange={onChange} />}
          {etapa === 4 && <EtapaCondicoes dados={dados} onChange={onChange} />}
          {etapa === 5 && (
            <EtapaRevisao
              dados={dados}
              onChange={onChange}
              onIrParaEtapa={setEtapa}
            />
          )}
        </div>

        <div
          className="flex items-center justify-between border-t px-6 py-4"
          style={{ borderColor: 'var(--glass-edge)', background: 'rgba(0,0,0,0.025)' }}
        >
          <button
            type="button"
            onClick={etapa === 1 ? () => router.push('/dashboard') : () => setEtapa(e => e - 1)}
            className="flex items-center gap-1.5 px-4 py-2 text-sm rounded-[var(--r-md)] border transition-colors hover:opacity-80"
            style={{ color: 'var(--inkSoft)', borderColor: 'var(--hairline)' }}
          >
            {etapa === 1
              ? <><ArrowLeft className="w-4 h-4" /> Cancelar</>
              : <><ChevronLeft className="w-4 h-4" /> Voltar</>
            }
          </button>

          {etapa < 5 ? (
            <button
              type="button"
              onClick={handleContinuar}
              className="flex items-center gap-1.5 px-4 py-2 text-sm font-semibold rounded-[var(--r-md)] transition-opacity hover:opacity-80"
              style={{ background: 'var(--primary)', color: 'white' }}
            >
              Continuar <ChevronRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleGerar}
              disabled={gerando || !prontoParaGerar}
              title={!prontoParaGerar ? 'Corrija os campos pendentes antes de gerar.' : undefined}
              className="flex items-center gap-2 px-5 py-2 text-sm font-semibold rounded-[var(--r-md)] transition-opacity hover:opacity-80 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ background: 'var(--primary)', color: 'white' }}
            >
              {gerando
                ? <><Loader2 className="w-4 h-4 animate-spin" /> Gerando documentos...</>
                : 'Gerar Documentos'
              }
            </button>
          )}
        </div>
      </div>
    </div>
  )
}