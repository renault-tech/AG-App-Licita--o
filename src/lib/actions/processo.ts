'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { schemaProcessoWizard, type ProcessoWizardInput } from '@/lib/validacao/processo'
import { registrarAuditoria } from '@/lib/audit/log'
import { PODE_CRIAR_PROCESSO, podeFazer } from '@/lib/permissions'
import type { PapelUsuario } from '@/types/database'

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

  // Apenas requisitante e administradores originam processos (ver PODE_CRIAR_PROCESSO)
  if (!podeFazer((userData as any).papel as PapelUsuario, PODE_CRIAR_PROCESSO)) {
    return { success: false, error: 'Seu perfil nao tem permissao para criar processos.' }
  }

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

  void registrarAuditoria({
    organizacaoId: organizacao_id,
    usuarioId:     user.id,
    nomeUsuario:   (userData as any).nome_completo ?? 'Usuario',
    papelUsuario:  (userData as any).papel ?? '',
    categoria:     'processo',
    acao:          'processo.criado',
    recursoId:     processo.id,
    recursoDesc:   input.objeto,
  })

  return { success: true, processoId: processo.id }
}

export async function criarProcessoComDocumentos(
  dados: import('@/app/(dashboard)/processos/novo/types').DadosWizard,
  documentos: import('@/app/(dashboard)/processos/novo/types').DocumentosGerados,
  opcoes?: { avisoId?: string; solicitacaoId?: string }
): Promise<{ success: boolean; processoId?: string; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Não autenticado.' }

  const { data: userData } = await supabase
    .from('usuarios')
    .select('organizacao_id, papel')
    .eq('id', user.id)
    .maybeSingle()
  if (!userData) return { success: false, error: 'Usuario nao encontrado.' }

  // Apenas requisitante e administradores originam processos (ver PODE_CRIAR_PROCESSO)
  if (!podeFazer((userData as any).papel as PapelUsuario, PODE_CRIAR_PROCESSO)) {
    return { success: false, error: 'Seu perfil nao tem permissao para criar processos.' }
  }

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
  const solicitacaoId = opcoes?.solicitacaoId

  // 2. Criar DFD, ETP e TR. Se qualquer um falhar, desfaz o processo.
  try {
    // DFD: quando vem de solicitacao, usa dados dela. Caso contrario, usa texto gerado pelo wizard.
    let justificativaDfd: string | null = null
    let objetoDfd = dados.objeto
    let itensDfdParaInserir: { especificacao: string; unidade_medida: string; observacoes: string }[] = []
    let tipoDfd: 'individual' | 'compartilhado' = 'individual'
    let statusAdesaoDfd: 'rascunho' | 'consolidado' = 'rascunho'
    let geradoPorIa = dados.ia_modelo !== 'sem_ia'

    if (solicitacaoId) {
      // Fluxo DFD-first: DFD criado a partir dos dados da solicitacao de compra
      const { data: sol } = await (supabase as any)
        .from('solicitacoes_compra')
        .select('objeto, justificativa, solicitacoes_itens(numero_item, catmat_codigo, catmat_descricao, especificacao_complementar, quantidade, unidade_medida)')
        .eq('id', solicitacaoId)
        .maybeSingle()

      if (sol) {
        objetoDfd = sol.objeto
        justificativaDfd = sol.justificativa ?? null
        geradoPorIa = false
        itensDfdParaInserir = (sol.solicitacoes_itens ?? []).map((it: any, idx: number) => {
          const descricao = [it.catmat_descricao, it.especificacao_complementar].filter(Boolean).join(' | ') || 'Item sem descricao'
          const codigoObs = it.catmat_codigo ? `CATMAT ${it.catmat_codigo} | ` : ''
          return {
            numero_item: idx + 1,
            especificacao: descricao,
            unidade_medida: it.unidade_medida ?? 'un',
            observacoes: `${codigoObs}Quantidade estimada: ${it.quantidade} ${it.unidade_medida ?? 'un'}`,
          }
        })
      }
    } else {
      const secoesDfd = Object.fromEntries((documentos.dfd?.secoes ?? []).map(s => [s.tipo_campo, s.texto]))
      const dfdTextoCompleto = secoesDfd['texto_completo'] ?? null
      justificativaDfd = secoesDfd['justificativa_necessidade'] ?? dfdTextoCompleto ?? null
      tipoDfd = avisoId ? 'compartilhado' : 'individual'
      statusAdesaoDfd = avisoId ? 'consolidado' : 'rascunho'
      itensDfdParaInserir = (dados.itens ?? []).map((item: any, idx: number) => ({
        numero_item: idx + 1,
        especificacao: item.descricao,
        unidade_medida: item.unidade,
        observacoes: `Quantidade estimada: ${item.quantidade} ${item.unidade}`,
      }))
    }

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
      objeto: objetoDfd,
      justificativa_necessidade: justificativaDfd,
      dotacao_orcamentaria: null,
      tipo: tipoDfd,
      status_adesao: statusAdesaoDfd,
      status: 'rascunho',
      gerado_por_ia: geradoPorIa,
    }).select('id').single()
    if (dfdError) throw new Error(`Erro ao criar DFD: ${dfdError.message}`)

    const dfdId: string = (dfdCriado as any).id

    if (itensDfdParaInserir.length > 0) {
      await (supabase as any).from('dfd_itens').insert(
        itensDfdParaInserir.map(it => ({ dfd_id: dfdId, ...it }))
      )
    }

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

    // Marcar solicitacao como convertida e vincular ao processo
    if (solicitacaoId) {
      await (supabase as any)
        .from('solicitacoes_compra')
        .update({
          status: 'convertida',
          processo_id: processoId,
          convertido_por: user.id,
          convertido_em: new Date().toISOString(),
        })
        .eq('id', solicitacaoId)
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

// ============================================================
// Entrada DFD-first para Compra Compartilhada
// Cria o processo e o DFD ja como compartilhado (sem gerar ETP/TR).
// O rito deriva do flag de Registro de Precos (Art. 82): SRP -> IRP
// (Art. 86-88 + Decreto 11.462/2023); demais -> consolidacao (Art. 6, X).
// O EditorDFD assume a partir daqui (Anexo Unico, convite, consolidacao).
// ============================================================

const schemaProcessoCompartilhado = z.object({
  objeto: z.string().min(10, 'Descreva o objeto com pelo menos 10 caracteres.'),
  modalidade: z.string().min(1, 'Selecione a modalidade.'),
  categoria_objeto: z.string().min(1, 'Selecione a categoria do objeto.'),
  secretaria_id: z.string().uuid('Selecione a secretaria requisitante.'),
  registro_de_precos: z.boolean(),
})

export type ProcessoCompartilhadoInput = z.infer<typeof schemaProcessoCompartilhado>

export async function criarProcessoCompartilhado(
  dados: ProcessoCompartilhadoInput
): Promise<{ success: boolean; processoId?: string; error?: string }> {
  const supabase = await createClient()

  const validacao = schemaProcessoCompartilhado.safeParse(dados)
  if (!validacao.success) {
    return { success: false, error: validacao.error.issues[0].message }
  }
  const input = validacao.data

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Usuário não autenticado.' }

  const { data: userData } = await supabase
    .from('usuarios')
    .select('organizacao_id, papel, nome_completo')
    .eq('id', user.id)
    .maybeSingle()
  if (!userData) return { success: false, error: 'Usuario nao encontrado.' }

  // Apenas requisitante e administradores originam processos (ver PODE_CRIAR_PROCESSO)
  if (!podeFazer((userData as any).papel as PapelUsuario, PODE_CRIAR_PROCESSO)) {
    return { success: false, error: 'Seu perfil nao tem permissao para criar processos.' }
  }

  const orgId = (userData as any).organizacao_id as string
  const nomeCompleto = (userData as any).nome_completo ?? ''

  // Snapshot da secretaria iniciadora (imutabilidade documental)
  const { data: secRaw } = await (supabase as any)
    .from('secretarias')
    .select('id, nome, email, telefone, secretario_nome, responsavel')
    .eq('id', input.secretaria_id)
    .eq('organizacao_id', orgId)
    .maybeSingle()
  const sec = secRaw as {
    id: string; nome: string; email: string | null; telefone: string | null;
    secretario_nome: string | null; responsavel: string | null
  } | null
  if (!sec) return { success: false, error: 'Secretaria requisitante nao encontrada.' }

  const rito = input.registro_de_precos ? 'irp' : 'consolidacao'

  // 1. Criar processo
  const { data: processo, error: procError } = await (supabase as any)
    .from('processos_licitatorios')
    .insert({
      organizacao_id: orgId,
      criado_por: user.id,
      objeto: input.objeto,
      modalidade: input.modalidade,
      categoria_objeto: input.categoria_objeto,
      secretaria_id: input.secretaria_id,
      registro_de_precos: input.registro_de_precos,
      status: 'rascunho',
      etapa_atual: 1,
      fase_atual: 'requisitante',
    })
    .select('id')
    .single()

  if (procError || !processo) {
    return { success: false, error: procError?.message ?? 'Erro ao criar processo.' }
  }

  const processoId: string = processo.id

  try {
    // 2. Criar DFD ja como compartilhado em rascunho
    const { data: dfdCriado, error: dfdError } = await (supabase as any)
      .from('dfd')
      .insert({
        processo_id: processoId,
        organizacao_id: orgId,
        criado_por: user.id,
        objeto: input.objeto,
        justificativa: '',
        justificativa_necessidade: null,
        tipo: 'compartilhado',
        rito,
        status_adesao: 'rascunho',
        secretaria_id: sec.id,
        secretaria_nome: sec.nome,
        secretaria_email: sec.email ?? null,
        secretaria_telefone: sec.telefone ?? null,
        secretario_responsavel: sec.secretario_nome ?? sec.responsavel ?? null,
        responsavel_elaboracao: nomeCompleto,
        status: 'rascunho',
        gerado_por_ia: false,
      })
      .select('id')
      .single()
    if (dfdError || !dfdCriado) throw new Error(dfdError?.message ?? 'Erro ao criar DFD.')

    // 3. Participacao da secretaria iniciadora
    const { error: partError } = await (supabase as any)
      .from('dfd_participacoes')
      .insert({
        dfd_id: dfdCriado.id,
        secretaria_id: sec.id,
        tipo: 'iniciadora',
        status: 'aderida',
        secretaria_nome: sec.nome,
        secretaria_email: sec.email ?? null,
        secretaria_telefone: sec.telefone ?? null,
        secretario_responsavel: sec.secretario_nome ?? sec.responsavel ?? null,
        enviado_em: new Date().toISOString(),
        respondido_em: new Date().toISOString(),
        respondido_por: user.id,
      })
    if (partError) throw new Error(partError.message)
  } catch (err) {
    // Rollback: remove o processo para nao deixar registro incompleto
    await (supabase as any).from('processos_licitatorios').delete().eq('id', processoId)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Erro ao criar DFD compartilhado.',
    }
  }

  void registrarAuditoria({
    organizacaoId: orgId,
    usuarioId:     user.id,
    nomeUsuario:   nomeCompleto,
    papelUsuario:  (userData as any).papel ?? '',
    categoria:     'processo',
    acao:          'processo.criado',
    recursoId:     processoId,
    recursoDesc:   `Compra compartilhada: ${input.objeto}`,
  })

  revalidatePath('/processos')
  return { success: true, processoId }
}

const PAPEIS_ADMIN = ['admin_organizacao', 'admin_plataforma'] as const

export async function excluirProcesso(processoId: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Nao autenticado.' }

  const { data: userData } = await supabase
    .from('usuarios')
    .select('organizacao_id, papel, nome_completo')
    .eq('id', user.id)
    .maybeSingle()
  if (!userData) return { success: false, error: 'Usuario nao encontrado.' }

  const { organizacao_id: orgId, papel, nome_completo: nomeCompleto } = userData as any

  // Somente administradores podem excluir processos
  if (!PAPEIS_ADMIN.includes(papel)) {
    return { success: false, error: 'Apenas administradores podem excluir processos.' }
  }

  const { data: processo } = await (supabase as any)
    .from('processos_licitatorios')
    .select('id, status, organizacao_id, objeto')
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

  void registrarAuditoria({
    organizacaoId: orgId,
    usuarioId:     user.id,
    nomeUsuario:   nomeCompleto ?? 'Usuario',
    papelUsuario:  papel,
    categoria:     'processo',
    acao:          'processo.excluido',
    recursoId:     processoId,
    recursoDesc:   (processo as any).objeto,
  })

  revalidatePath('/processos')
  return { success: true }
}

// Tipos de status das etapas para o nav do processo
export type StatusEtapa = 'nao_iniciado' | 'rascunho' | 'em_revisao' | 'assinado' | 'devolvido'
export type EtapaStatus = { slug: string; status: StatusEtapa; updated_at: string | null }

const SLUG_TABELA: Array<{ slug: string; tabela: string; temStatus: boolean }> = [
  { slug: 'dfd',         tabela: 'dfd',             temStatus: true  },
  { slug: 'cotacao',     tabela: 'cotacoes',         temStatus: false },
  { slug: 'etp',         tabela: 'etp',              temStatus: true  },
  { slug: 'tr',          tabela: 'termo_referencia', temStatus: true  },
  { slug: 'riscos',      tabela: 'mapa_riscos',      temStatus: true  },
  { slug: 'edital',      tabela: 'edital',           temStatus: true  },
  { slug: 'declaracao',  tabela: 'declaracoes_setor', temStatus: true  },
  { slug: 'oficio',      tabela: 'oficios_abertura',  temStatus: true  },
  { slug: 'parecer',     tabela: 'pareceres',        temStatus: true  },
  { slug: 'autorizacao', tabela: 'autorizacoes',     temStatus: true  },
  { slug: 'publicacao',  tabela: 'publicacoes',      temStatus: true  },
]

export async function obterStatusEtapas(processoId: string): Promise<EtapaStatus[]> {
  const supabase = await createClient()

  const resultados = await Promise.all(
    SLUG_TABELA.map(async ({ slug, tabela, temStatus }) => {
      const { data } = await (supabase as any)
        .from(tabela)
        .select(temStatus ? 'status, updated_at' : 'updated_at')
        .eq('processo_id', processoId)
        .maybeSingle()

      if (!data) {
        return { slug, status: 'nao_iniciado' as StatusEtapa, updated_at: null }
      }

      if (!temStatus) {
        return { slug, status: 'rascunho' as StatusEtapa, updated_at: data.updated_at ?? null }
      }

      const s = (data.status ?? 'rascunho') as StatusEtapa
      return { slug, status: s, updated_at: data.updated_at ?? null }
    })
  )

  // revisao: inferir do processo (fase_atual)
  const { data: processo } = await (supabase as any)
    .from('processos_licitatorios')
    .select('fase_atual')
    .eq('id', processoId)
    .maybeSingle()

  const faseAtual = processo?.fase_atual as string | null
  const revisaoStatus: StatusEtapa =
    faseAtual === 'setor_licitacao' ? 'rascunho'
    : faseAtual === 'procurador'   ? 'assinado'
    : 'nao_iniciado'

  resultados.push({ slug: 'revisao', status: revisaoStatus, updated_at: null })

  return resultados
}