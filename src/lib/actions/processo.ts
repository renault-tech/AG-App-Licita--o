'use server'

import { createClient } from '@/lib/supabase/server'
import { schemaProcessoWizard, type ProcessoWizardInput } from '@/lib/validacao/processo'

export async function criarProcessoInicial(dados: ProcessoWizardInput) {
  const supabase = await createClient()

  // 1. Validar input
  const validacao = schemaProcessoWizard.safeParse(dados)
  if (!validacao.success) {
    return { success: false, error: 'Dados invalidos ou incompletos.' }
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
    return { success: false, error: 'Organizacao do usuario nao encontrada.' }
  }

  const { organizacao_id } = userData as any
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
  documentos: import('@/app/(dashboard)/processos/novo/types').DocumentosGerados,
  opcoes?: { avisoId?: string }
): Promise<{ success: boolean; processoId?: string; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Não autenticado.' }

  const { data: userData } = await supabase
    .from('usuarios')
    .select('organizacao_id')
    .eq('id', user.id)
    .maybeSingle()
  if (!userData) return { success: false, error: 'Usuario nao encontrado.' }

  const orgId = (userData as any).organizacao_id
  const valorNum = dados.valor_estimado && !Number.isNaN(dados.valor_estimado) ? dados.valor_estimado : null

  // Buscar dados da secretaria e nome do usuario para snapshot do DFD
  const [secretariaRes, usuarioNomeRes] = await Promise.all([
    dados.secretaria_id
      ? (supabase as any).from('secretarias')
          .select('nome, email, telefone, secretario_nome')
          .eq('id', dados.secretaria_id)
          .maybeSingle()
      : Promise.resolve({ data: null }),
    supabase.from('usuarios').select('nome_completo').eq('id', user.id).maybeSingle(),
  ])
  const sec = (secretariaRes as any).data as { nome: string; email: string | null; telefone: string | null; secretario_nome: string | null } | null
  const nomeCompleto = ((usuarioNomeRes as any).data as any)?.nome_completo ?? ''

  // 1. Criar processo
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

  const processoId: string = processo.id

  const avisoId = opcoes?.avisoId

  // 2. Criar DFD, ETP e TR. Se qualquer um falhar, desfaz o processo.
  try {
    const secoesDfd = Object.fromEntries(documentos.dfd.secoes.map(s => [s.tipo_campo, s.texto]))

    // Quando ha aviso vinculado, DFD e compartilhado e ja consolidado (prazo expirou)
    const tipoDfd = avisoId ? 'compartilhado' : 'individual'
    const statusAdesaoDfd = avisoId ? 'consolidado' : 'rascunho'

    // Quando a IA gera o documento inteiro, o conteudo vem em 'texto_completo'
    const dfdTextoCompleto = secoesDfd['texto_completo'] ?? null

    const { data: dfdCriado, error: dfdError } = await (supabase as any).from('dfd').insert({
      processo_id: processoId,
      organizacao_id: orgId,
      criado_por: user.id,
      secretaria_id: dados.secretaria_id || null,
      secretaria_nome: sec?.nome ?? 'Sem secretaria designada',
      secretaria_email: sec?.email ?? null,
      secretaria_telefone: sec?.telefone ?? null,
      secretario_responsavel: sec?.secretario_nome ?? null,
      responsavel_elaboracao: nomeCompleto,
      objeto: dados.objeto,
      justificativa_necessidade: secoesDfd['justificativa_necessidade'] ?? dfdTextoCompleto ?? null,
      dotacao_orcamentaria: secoesDfd['dotacao_orcamentaria'] ?? null,
      tipo: tipoDfd,
      status_adesao: statusAdesaoDfd,
      status: 'rascunho',
      gerado_por_ia: dados.ia_modelo !== 'sem_ia',
    }).select('id').single()
    if (dfdError) throw new Error(`Erro ao criar DFD: ${dfdError.message}`)

    const dfdId: string = (dfdCriado as any).id

    // Criar participacao iniciadora
    if (dados.secretaria_id) {
      await (supabase as any).from('dfd_participacoes').insert({
        dfd_id: dfdId,
        secretaria_id: dados.secretaria_id,
        tipo: 'iniciadora',
        status: 'aderida',
        secretaria_nome: sec?.nome ?? '',
        secretaria_email: sec?.email ?? null,
        secretaria_telefone: sec?.telefone ?? null,
        secretario_responsavel: sec?.secretario_nome ?? null,
        respondido_em: new Date().toISOString(),
      })
    }

    // Se ha aviso: criar participacoes das secretarias que aderiram
    if (avisoId) {
      const { data: adesoes } = await (supabase as any)
        .from('avisos_adesoes')
        .select(`
          secretaria_id, fiscal_nome, dotacao_orcamentaria,
          secretaria:secretarias(nome, email, telefone, secretario_nome)
        `)
        .eq('aviso_id', avisoId)

      if (adesoes && (adesoes as any[]).length > 0) {
        await (supabase as any).from('dfd_participacoes').insert(
          (adesoes as any[]).map(a => ({
            dfd_id: dfdId,
            secretaria_id: a.secretaria_id,
            tipo: 'participante',
            status: 'aderida',
            secretaria_nome: a.secretaria?.nome ?? '',
            secretaria_email: a.secretaria?.email ?? null,
            secretaria_telefone: a.secretaria?.telefone ?? null,
            secretario_responsavel: a.secretaria?.secretario_nome ?? null,
            fiscal_contrato: a.fiscal_nome,
            dotacao_orcamentaria: a.dotacao_orcamentaria,
            respondido_em: new Date().toISOString(),
          }))
        )
      }

      // Linkar aviso ao processo e marcar como processo_iniciado
      await (supabase as any)
        .from('avisos_compra_conjunta')
        .update({ status: 'processo_iniciado', processo_id: processoId })
        .eq('id', avisoId)
    }

    const secoesEtp = Object.fromEntries(documentos.etp.secoes.map(s => [s.tipo_campo, s.texto]))
    const etpTextoCompleto = secoesEtp['texto_completo'] ?? null
    const { error: etpError } = await (supabase as any).from('etp').insert({
      processo_id: processoId,
      organizacao_id: orgId,
      criado_por: user.id,
      descricao_necessidade: secoesEtp['descricao_necessidade'] ?? etpTextoCompleto ?? null,
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
    if (etpError) throw new Error(`Erro ao criar ETP: ${etpError.message}`)

    const secoesTr = Object.fromEntries(documentos.tr.secoes.map(s => [s.tipo_campo, s.texto]))
    const trTextoCompleto = secoesTr['texto_completo'] ?? null
    const { error: trError } = await (supabase as any).from('termo_referencia').insert({
      processo_id: processoId,
      organizacao_id: orgId,
      criado_por: user.id,
      objeto: secoesTr['objeto_tr'] ?? null,
      fundamentacao: secoesTr['fundamentacao'] ?? trTextoCompleto ?? null,
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
    if (trError) throw new Error(`Erro ao criar TR: ${trError.message}`)

    return { success: true, processoId }
  } catch (err) {
    // Rollback manual: exclui o processo para nao deixar registro incompleto
    await (supabase as any).from('processos_licitatorios').delete().eq('id', processoId)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Erro ao criar documentos do processo.',
    }
  }
}

export async function excluirProcesso(processoId: string): Promise<{ success: boolean; error?: string }> {
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

  // Confirmar que o processo pertence a organizacao do usuario
  const { data: processo } = await (supabase as any)
    .from('processos_licitatorios')
    .select('id, status, organizacao_id')
    .eq('id', processoId)
    .eq('organizacao_id', orgId)
    .maybeSingle()

  if (!processo) return { success: false, error: 'Processo nao encontrado.' }

  if (processo.status === 'publicado') {
    return { success: false, error: 'Processos publicados nao podem ser excluidos.' }
  }

  const { error } = await (supabase as any)
    .from('processos_licitatorios')
    .delete()
    .eq('id', processoId)
    .eq('organizacao_id', orgId)

  if (error) return { success: false, error: error.message }

  return { success: true }
}