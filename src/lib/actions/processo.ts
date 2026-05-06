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

  // 4. Criar DFD inicial atrelado
  const { data: dfdCriado, error: dfdError } = await (supabase
    .from('dfd') as any)
    .insert({
      processo_id: processo.id,
      organizacao_id,
      criado_por: user.id,
      responsavel_elaboracao: nome_completo,
      descricao_necessidade: input.objeto,
      justificativa: input.justificativa,
      prazo_contratacao: input.prazo_contratacao,
      observacoes: input.observacoes,
      status: 'rascunho',
      gerado_por_ia: false
    })
    .select('id')
    .single()

  if (dfdError || !dfdCriado) {
    return { success: false, error: 'Processo criado, mas falhou ao criar DFD: ' + (dfdError?.message ?? 'INSERT retornou vazio') }
  }

  return { success: true, processoId: processo.id }
}
