'use server'

import { createClient } from '@/lib/supabase/server'
import { schemaProcessoWizard, type ProcessoWizardInput } from '@/lib/validacao/processo'

export async function criarProcessoInicial(dados: ProcessoWizardInput) {
  const supabase = await createClient()

  // 1. Validar input
  const validacao = schemaProcessoWizard.safeParse(dados)
  if (!validacao.success) {
    return { success: false, error: 'Dados inválidos ou incompletos.' }
  }
  const input = validacao.data

  // 2. Pegar usuario e organizacao
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Usuário não autenticado.' }

  const { data: userData, error: userError } = await supabase
    .from('usuarios')
    .select('*')
    .eq('id', user.id)
    .single()

  if (userError || !userData) {
    return { success: false, error: 'Organização do usuário não encontrada.' }
  }

  const { organizacao_id, nome_completo } = userData as any
  const valorNum = Number.isNaN(input.valor_estimado) ? null : input.valor_estimado

  // 3. Criar Processo
  const { data: processo, error: procError } = await (supabase
    .from('processos_licitatorios') as any)
    .insert({
      organizacao_id,
      criado_por: user.id,
      objeto: input.objeto,
      modalidade: input.modalidade,
      valor_estimado: valorNum,
      status: 'rascunho',
      etapa_atual: 1
    })
    .select('*')
    .single()

  if (procError || !processo) {
    return { success: false, error: procError?.message || 'Erro ao criar processo.' }
  }

  return { success: true, processoId: processo.id }
}

export async function criarProcessoComDocumentos(
  dados: import('@/app/(dashboard)/processos/novo/types').DadosWizard,
  documentos: import('@/app/(dashboard)/processos/novo/types').DocumentosGerados
): Promise<{ success: boolean; processoId?: string; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Nao autenticado.' }

  const { data: userData } = await supabase
    .from('usuarios')
    .select('organizacao_id')
    .eq('id', user.id)
    .maybeSingle()
  if (!userData) return { success: false, error: 'Usuario nao encontrado.' }

  const orgId = (userData as any).organizacao_id
  const valorNum = dados.valor_estimado && !Number.isNaN(dados.valor_estimado) ? dados.valor_estimado : null

  const { data: processo, error: procError } = await (supabase as any)
    .from('processos_licitatorios')
    .insert({
      organizacao_id: orgId,
      criado_por: user.id,
      objeto: dados.objeto,
      modalidade: dados.modalidade,
      valor_estimado: valorNum,
      categoria_objeto: dados.categoria_objeto,
      secretaria_id: dados.secretaria_id || null,
      status: 'rascunho',
      etapa_atual: 1,
      ia_config: { modelo: dados.ia_modelo, aprovado_em: new Date().toISOString() },
    })
    .select('id')
    .single()

  if (procError || !processo) {
    return { success: false, error: procError?.message ?? 'Erro ao criar processo.' }
  }

  const processoId = processo.id

  // Cria DFD com conteudo gerado
  const secoesDfd = Object.fromEntries(documentos.dfd.secoes.map(s => [s.tipo_campo, s.texto]))
  await (supabase as any).from('dfd').insert({
    processo_id: processoId,
    organizacao_id: orgId,
    criado_por: user.id,
    secretaria_id: dados.secretaria_id || null,
    objeto: dados.objeto,
    justificativa_necessidade: secoesDfd['justificativa_necessidade'] ?? null,
    tipo: 'individual',
    status_adesao: 'rascunho',
    responsavel_elaboracao: '',
    status: 'rascunho',
    gerado_por_ia: dados.ia_modelo !== 'sem_ia',
  })

  // Cria ETP com conteudo gerado
  const secoesEtp = Object.fromEntries(documentos.etp.secoes.map(s => [s.tipo_campo, s.texto]))
  await (supabase as any).from('etp').insert({
    processo_id: processoId,
    organizacao_id: orgId,
    criado_por: user.id,
    descricao_necessidade: secoesEtp['descricao_necessidade'] ?? null,
    requisitos_contratacao: secoesEtp['requisitos_contratacao'] ?? null,
    levantamento_mercado: secoesEtp['levantamento_mercado'] ?? null,
    estimativa_quantidades: null,
    justificativa_solucao: secoesEtp['justificativa_solucao'] ?? null,
    parcelamento: secoesEtp['parcelamento'] ?? null,
    resultados_pretendidos: secoesEtp['resultados_pretendidos'] ?? null,
    providencias: secoesEtp['providencias'] ?? null,
    status: 'rascunho',
    gerado_por_ia: dados.ia_modelo !== 'sem_ia',
  })

  // Cria TR com conteudo gerado
  const secoesTr = Object.fromEntries(documentos.tr.secoes.map(s => [s.tipo_campo, s.texto]))
  await (supabase as any).from('termo_referencia').insert({
    processo_id: processoId,
    organizacao_id: orgId,
    criado_por: user.id,
    objeto: secoesTr['objeto_tr'] ?? null,
    fundamentacao: secoesTr['fundamentacao'] ?? null,
    descricao: null,
    requisitos_tecnicos: dados.especificacoes_minimas || null,
    modelo_execucao: secoesTr['modelo_execucao'] ?? null,
    modelo_gestao: secoesTr['modelo_gestao'] ?? null,
    criterios_medicao: secoesTr['criterios_medicao'] ?? null,
    forma_pagamento: secoesTr['forma_pagamento'] ?? null,
    garantias: secoesTr['garantias'] ?? null,
    sancoes: secoesTr['sancoes'] ?? null,
    status: 'rascunho',
    gerado_por_ia: dados.ia_modelo !== 'sem_ia',
  })

  return { success: true, processoId }
}
