'use server'

import { createClient } from '@/lib/supabase/server'
import { gerarSecao, montarVariaveis } from '@/lib/motor-templates'
import type { DadosWizard, DocumentosGerados } from '@/app/(dashboard)/processos/novo/types'

const CAMPOS_DFD = ['objeto_dfd', 'justificativa_necessidade', 'dotacao_orcamentaria']
const CAMPOS_ETP = [
  'descricao_necessidade',
  'requisitos_contratacao',
  'levantamento_mercado',
  'justificativa_solucao',
  'parcelamento',
  'resultados_pretendidos',
  'providencias',
]
const CAMPOS_TR = [
  'objeto_tr',
  'fundamentacao',
  'modelo_execucao',
  'modelo_gestao',
  'criterios_medicao',
  'forma_pagamento',
  'garantias',
  'sancoes',
]

export async function gerarDocumentos(
  dados: DadosWizard
): Promise<{ success: boolean; documentos?: DocumentosGerados; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Não autenticado.' }

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('organizacao_id')
    .eq('id', user.id)
    .maybeSingle()
  if (!usuario) return { success: false, error: 'Usuario nao encontrado.' }

  const orgId = (usuario as any).organizacao_id

  const [secretariaRes, orgRes] = await Promise.all([
    (supabase as any)
      .from('secretarias')
      .select('nome')
      .eq('id', dados.secretaria_id)
      .maybeSingle(),
    (supabase as any)
      .from('organizacoes')
      .select('ia_config')
      .eq('id', orgId)
      .maybeSingle(),
  ])

  const secretariaNome = (secretariaRes.data as any)?.nome ?? 'Secretaria Requisitante'
  const iaConfig = (orgRes.data as any)?.ia_config as { provider?: string } | null
  const providerOverride = iaConfig?.provider ?? undefined

  const usarIA = dados.ia_modelo !== 'sem_ia'
  const variaveis = montarVariaveis(dados, secretariaNome)

  const params = (documento: 'dfd' | 'etp' | 'tr', campos: string[]) =>
    campos.map(tipoCampo =>
      gerarSecao({
        documento,
        tipoCampo,
        organizacaoId: orgId,
        modalidade: dados.modalidade,
        categoriaObjeto: dados.categoria_objeto,
        variaveis,
        usarIA,
        modeloIA: dados.ia_modelo,
        providerOverride,
      })
    )

  try {
    const [secoesDFD, secoesETP, secoesTR] = await Promise.all([
      Promise.all(params('dfd', CAMPOS_DFD)),
      Promise.all(params('etp', CAMPOS_ETP)),
      Promise.all(params('tr', CAMPOS_TR)),
    ])

    return {
      success: true,
      documentos: {
        dfd: { secoes: secoesDFD },
        etp: { secoes: secoesETP },
        tr: { secoes: secoesTR },
      },
    }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : 'Erro na geracao dos documentos.' }
  }
}
