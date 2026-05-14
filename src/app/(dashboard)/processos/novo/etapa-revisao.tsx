'use client'

import { AlertTriangle, CheckCircle2, Settings, Zap } from 'lucide-react'
import { Label } from '@/components/ui/label'
import Link from 'next/link'
import type { DadosWizard } from './types'

const MODELOS_IA: { value: 'com_ia' | 'sem_ia'; label: string; desc: string; badge: string | null; badgeClass: string }[] = [
  {
    value: 'com_ia',
    label: 'Com assistencia de IA',
    desc: 'O sistema refina os textos com IA para maior aderência ao seu contexto específico. O provedor é configurado nas preferências da organização.',
    badge: 'Recomendado',
    badgeClass: 'bg-green-100 text-green-700',
  },
  {
    value: 'sem_ia',
    label: 'Somente templates padrao',
    desc: 'Mais rápido. Documentos preenchidos com os templates padrão e seus dados, sem refinamento por IA.',
    badge: null,
    badgeClass: '',
  },
]

interface Validacao {
  campo: string
  label: string
  ok: boolean
}

function validarDados(dados: DadosWizard): Validacao[] {
  return [
    { campo: 'secretaria_id', label: 'Secretaria requisitante', ok: !!dados.secretaria_id },
    { campo: 'modalidade', label: 'Modalidade de licitacao', ok: !!dados.modalidade },
    { campo: 'categoria_objeto', label: 'Categoria do objeto', ok: !!dados.categoria_objeto },
    { campo: 'objeto', label: 'Descricao do objeto', ok: dados.objeto.length >= 10 },
    { campo: 'problema_atual', label: 'Problema atual', ok: dados.problema_atual.length >= 10 },
    { campo: 'impacto_sem_contratar', label: 'Impacto sem contratar', ok: dados.impacto_sem_contratar.length >= 10 },
    { campo: 'solucao_proposta', label: 'Solucao proposta', ok: dados.solucao_proposta.length >= 10 },
    { campo: 'prazo_dias', label: 'Prazo de entrega', ok: dados.prazo_dias > 0 },
    { campo: 'especificacoes_minimas', label: 'Especificacoes minimas', ok: dados.especificacoes_minimas.length >= 10 },
    { campo: 'forma_pagamento', label: 'Forma de pagamento', ok: !!dados.forma_pagamento },
    { campo: 'garantia', label: 'Garantia contratual', ok: !!dados.garantia },
    { campo: 'prazo_vigencia_meses', label: 'Prazo de vigencia', ok: dados.prazo_vigencia_meses > 0 },
  ]
}

const ETAPA_POR_CAMPO: Record<string, number> = {
  secretaria_id: 1, modalidade: 1, categoria_objeto: 1,
  objeto: 2, problema_atual: 2, impacto_sem_contratar: 2, solucao_proposta: 2, prazo_dias: 2,
  especificacoes_minimas: 3,
  forma_pagamento: 4, garantia: 4, prazo_vigencia_meses: 4,
}

interface Props {
  dados: DadosWizard
  onChange: (campo: keyof DadosWizard, valor: unknown) => void
  onIrParaEtapa: (etapa: number) => void
}

export default function EtapaRevisao({ dados, onChange, onIrParaEtapa }: Props) {
  const validacoes = validarDados(dados)
  const pendentes = validacoes.filter(v => !v.ok)
  const pronto = pendentes.length === 0

  return (
    <div className="space-y-6">
      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-gray-700">Verificacao dos dados</h3>
        {pronto ? (
          <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm font-medium">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            Todos os dados necessarios foram preenchidos.
          </div>
        ) : (
          <div className="space-y-1.5">
            {pendentes.map(v => (
              <div key={v.campo} className="flex items-center justify-between p-2.5 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-center gap-2 text-amber-700 text-sm">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                  {v.label}
                </div>
                <button
                  type="button"
                  onClick={() => onIrParaEtapa(ETAPA_POR_CAMPO[v.campo] ?? 1)}
                  className="text-xs text-amber-700 underline hover:text-amber-900"
                >
                  Corrigir
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2">
        <Label className="text-sm font-medium">Geracao dos documentos</Label>
        <div className="space-y-2">
          {MODELOS_IA.map(m => (
            <label
              key={m.value}
              className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                dados.ia_modelo === m.value ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-blue-200'
              }`}
            >
              <input
                type="radio"
                name="ia_modelo"
                value={m.value}
                checked={dados.ia_modelo === m.value}
                onChange={() => onChange('ia_modelo', m.value)}
                className="mt-0.5 text-blue-600"
              />
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium text-gray-900">{m.label}</p>
                  {m.badge && (
                    <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${m.badgeClass}`}>
                      {m.badge}
                    </span>
                  )}
                </div>
                <p className="text-xs text-gray-500 mt-0.5">{m.desc}</p>
              </div>
            </label>
          ))}
        </div>

        {dados.ia_modelo === 'com_ia' && (
          <div className="flex items-start gap-2 p-2.5 bg-gray-50 border border-gray-200 rounded-lg">
            <Settings className="w-3.5 h-3.5 text-gray-400 mt-0.5 shrink-0" />
            <p className="text-xs text-gray-500">
              O provedor de IA e definido nas{' '}
              <Link href="/configuracoes/ia" className="text-blue-600 hover:underline font-medium">
                configurações da organização
              </Link>
              . Se não houver provedor configurado, os documentos serão gerados com templates padrão.
            </p>
          </div>
        )}
      </div>

      {pronto && (
        <div className="flex items-start gap-2.5 p-3 bg-blue-50 border border-blue-100 rounded-xl">
          <Zap className="w-4 h-4 text-blue-600 mt-0.5 shrink-0" />
          <div className="text-sm text-blue-700">
            <p className="font-medium">Pronto para gerar 3 documentos: DFD, ETP e TR</p>
            <p className="text-xs mt-0.5 text-blue-600">
              Tempo estimado: 10 a 20 segundos. Os documentos serao exibidos para revisao antes de salvar.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}