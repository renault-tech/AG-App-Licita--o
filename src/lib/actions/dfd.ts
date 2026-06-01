'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { executarIAComCreditos } from '@/lib/ai/wrapper'
import { buildPromptETP, buildPromptTR } from '@/lib/ai/prompts/gerar-documentos-simultaneos'
import { registrarAuditoria } from '@/lib/audit/log'
import type {
  DFDRow,
  DFDItemRow,
  DFDParticipacaoRow,
  DFDParticipacaoItemRow,
  ProcessoLicitatorioRow,
} from '@/types/database'

// -------------------------------------------------------
// Helpers
// -------------------------------------------------------

async function obterUsuarioEOrg() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('usuarios')
    .select('id, nome_completo, organizacao_id, papel')
    .eq('id', user.id)
    .maybeSingle()

  if (!data) return null
  return { supabase, user, usuario: data as { id: string; nome_completo: string; organizacao_id: string; papel: string } }
}

// -------------------------------------------------------
// Carregar DFD completo (com itens e participacoes)
// -------------------------------------------------------

export async function obterDFD(processoId: string) {
  const ctx = await obterUsuarioEOrg()
  if (!ctx) return null
  const { supabase, user } = ctx

  const { data: dfdRaw } = await (supabase as any)
    .from('dfd')
    .select('*')
    .eq('processo_id', processoId)
    .maybeSingle()

  if (dfdRaw) {
    const [itens, participacoes] = await Promise.all([
      obterItensDFD(dfdRaw.id),
      obterParticipacoesDFD(dfdRaw.id),
    ])
    return { ...dfdRaw as DFDRow, itens, participacoes }
  }

  // DFD nao existe, cria automaticamente
  const { data: pRaw } = await supabase
    .from('processos_licitatorios')
    .select('*')
    .eq('id', processoId)
    .maybeSingle()

  const p = pRaw as ProcessoLicitatorioRow | null
  if (!p) return null

  // Tenta buscar secretaria vinculada ao usuario
  const { data: secRaw } = await (supabase as any)
    .from('secretarias')
    .select('id, nome, email, telefone, secretario_nome, responsavel')
    .eq('organizacao_id', p.organizacao_id)
    .eq('ativo', true)
    .limit(1)
    .maybeSingle()

  const sec = secRaw as { id: string; nome: string; email: string | null; telefone: string | null; secretario_nome: string | null; responsavel: string | null } | null

  const { data: usuarioRaw } = await supabase
    .from('usuarios')
    .select('nome_completo')
    .eq('id', user.id)
    .maybeSingle()

  const nomeCompleto = (usuarioRaw as any)?.nome_completo ?? ''

  const { data: novo } = await (supabase as any)
    .from('dfd')
    .insert({
      processo_id: processoId,
      organizacao_id: p.organizacao_id,
      criado_por: user.id,
      objeto: p.objeto,
      justificativa: '',
      justificativa_necessidade: null,
      tipo: 'individual',
      status_adesao: 'rascunho',
      secretaria_id: sec?.id ?? null,
      secretaria_nome: sec?.nome ?? '',
      secretaria_email: sec?.email ?? null,
      secretaria_telefone: sec?.telefone ?? null,
      secretario_responsavel: sec?.secretario_nome ?? sec?.responsavel ?? null,
      responsavel_elaboracao: nomeCompleto,
      status: 'rascunho',
      gerado_por_ia: false,
    })
    .select('*')
    .maybeSingle()

  if (!novo) return null

  // Cria participacao da secretaria iniciadora automaticamente
  if (sec?.id) {
    await (supabase as any)
      .from('dfd_participacoes')
      .insert({
        dfd_id: novo.id,
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
  }

  return { ...novo as DFDRow, itens: [] as DFDItemRow[], participacoes: [] as DFDParticipacaoRow[] }
}

// -------------------------------------------------------
// Itens do DFD (Anexo Unico)
// -------------------------------------------------------

export async function obterItensDFD(dfdId: string): Promise<DFDItemRow[]> {
  const ctx = await obterUsuarioEOrg()
  if (!ctx) return []
  const { supabase } = ctx

  const { data } = await (supabase as any)
    .from('dfd_itens')
    .select('*')
    .eq('dfd_id', dfdId)
    .order('numero_item')

  return (data ?? []) as DFDItemRow[]
}

export async function salvarItensDFD(
  dfdId: string,
  itens: Array<{ numero_item: number; especificacao: string; unidade_medida: string; observacoes?: string }>
): Promise<{ success: boolean; error?: string }> {
  const ctx = await obterUsuarioEOrg()
  if (!ctx) return { success: false, error: 'Não autenticado.' }
  const { supabase } = ctx

  // Remove todos e reinseere (upsert por numero_item)
  await (supabase as any).from('dfd_itens').delete().eq('dfd_id', dfdId)

  if (itens.length > 0) {
    const { error } = await (supabase as any)
      .from('dfd_itens')
      .insert(itens.map(i => ({ ...i, dfd_id: dfdId })))

    if (error) return { success: false, error: error.message }
  }

  return { success: true }
}

// -------------------------------------------------------
// Atualizar campos principais do DFD
// -------------------------------------------------------

export async function atualizarDFD(
  dfdId: string,
  dados: {
    objeto?: string
    justificativa_necessidade?: string
    fiscal_contrato?: string
    dotacao_orcamentaria?: string
  }
): Promise<{ success: boolean; error?: string }> {
  const ctx = await obterUsuarioEOrg()
  if (!ctx) return { success: false, error: 'Não autenticado.' }
  const { supabase } = ctx

  const { error } = await (supabase as any)
    .from('dfd')
    .update({ ...dados, updated_at: new Date().toISOString() })
    .eq('id', dfdId)

  if (error) return { success: false, error: error.message }

  const { usuario } = ctx
  void registrarAuditoria({
    organizacaoId: usuario.organizacao_id,
    usuarioId:     usuario.id,
    nomeUsuario:   usuario.nome_completo,
    papelUsuario:  usuario.papel,
    categoria:     'documento',
    acao:          'dfd.editado',
    recursoId:     dfdId,
  })

  revalidatePath('/dashboard')
  return { success: true }
}

// -------------------------------------------------------
// IA: gerar justificativa a partir do objeto
// -------------------------------------------------------

export async function gerarJustificativaIA(
  objeto: string,
  processoId?: string
): Promise<{ success: boolean; texto?: string; error?: string }> {
  if (!objeto || objeto.length < 5) return { success: false, error: 'Objeto muito curto.' }

  const prompt = `Você é um especialista em licitações públicas conforme a Lei Federal 14.133/21.
Redija a justificativa da necessidade da contratação para um DFD (Documento de Formalização da Demanda) com base no objeto abaixo.
A justificativa deve:
- Explicar a necessidade do objeto para o funcionamento da secretaria
- Mencionar as consequências da nao contratacao
- Ter linguagem institucional formal, sem travessao (em dash)
- Ter entre 3 e 5 linhas
- Nao inventar dados objetivos (CNPJ, valores, fornecedores)

Objeto: ${objeto}

Retorne APENAS o texto da justificativa, sem introducao, sem aspas.`

  const res = await executarIAComCreditos({
    prompt,
    tipoAcao: 'sugerir_conteudo',
    processoId,
    temperature: 0.4,
  })

  if (!res.success) return { success: false, error: res.error }
  return { success: true, texto: res.texto }
}

export async function aprimorarTextoIA(
  textoOriginal: string,
  campo: string
): Promise<{ success: boolean; texto?: string; error?: string }> {
  if (!textoOriginal || textoOriginal.length < 10) {
    return { success: false, error: 'Texto muito curto para aprimorar.' }
  }

  const prompt = `Você é um especialista em licitações públicas (Lei 14.133/21).
Aprimore o texto abaixo para um DFD institucional, mantendo o sentido original, com vocabulário formal adequado à administração pública. Sem travessao (em dash).
Campo do documento: ${campo}
Texto original: "${textoOriginal}"
Retorne APENAS o texto aprimorado, sem introducao, sem aspas.`

  const res = await executarIAComCreditos({
    prompt,
    tipoAcao: 'aprimorar_texto',
    temperature: 0.3,
  })

  if (!res.success) return { success: false, error: res.error }
  return { success: true, texto: res.texto }
}

// -------------------------------------------------------
// Compartilhamento: encaminhar DFD para outras secretarias
// -------------------------------------------------------

export async function encaminharDFDParaAdesao(
  dfdId: string,
  secretariaIds: string[],
  prazoAdesao: string // ISO date string
): Promise<{ success: boolean; error?: string }> {
  const ctx = await obterUsuarioEOrg()
  if (!ctx) return { success: false, error: 'Não autenticado.' }
  const { supabase } = ctx

  if (!secretariaIds.length) return { success: false, error: 'Selecione ao menos uma secretaria.' }

  // Atualiza o DFD para compartilhado e aguardando adesao
  const { error: errDfd } = await (supabase as any)
    .from('dfd')
    .update({
      tipo: 'compartilhado',
      status_adesao: 'aguardando_adesao',
      prazo_adesao: prazoAdesao,
      updated_at: new Date().toISOString(),
    })
    .eq('id', dfdId)

  if (errDfd) return { success: false, error: errDfd.message }

  // Busca dados das secretarias para snapshot
  const { data: secsRaw } = await (supabase as any)
    .from('secretarias')
    .select('id, nome, email, telefone, secretario_nome, responsavel')
    .in('id', secretariaIds)

  const secs = (secsRaw ?? []) as Array<{
    id: string; nome: string; email: string | null; telefone: string | null; secretario_nome: string | null; responsavel: string | null
  }>

  // Insere participacoes para cada secretaria convidada (ignora se ja existir)
  const participacoes = secs.map(s => ({
    dfd_id: dfdId,
    secretaria_id: s.id,
    tipo: 'participante',
    status: 'pendente',
    secretaria_nome: s.nome,
    secretaria_email: s.email ?? null,
    secretaria_telefone: s.telefone ?? null,
    secretario_responsavel: s.secretario_nome ?? s.responsavel ?? null,
    enviado_em: new Date().toISOString(),
    prazo_resposta: prazoAdesao,
  }))

  if (participacoes.length > 0) {
    const { error: errPart } = await (supabase as any)
      .from('dfd_participacoes')
      .upsert(participacoes, { onConflict: 'dfd_id,secretaria_id', ignoreDuplicates: true })

    if (errPart) return { success: false, error: errPart.message }
  }

  // Cria notificacoes apenas para usuarios das secretarias convidadas
  const { data: usuariosRaw } = await (supabase as any)
    .from('usuarios')
    .select('id, organizacao_id')
    .eq('organizacao_id', ctx.usuario.organizacao_id)
    .eq('ativo', true)
    .in('secretaria_id', secretariaIds)

  // Busca o processo para montar o link
  const { data: dfdRaw } = await (supabase as any)
    .from('dfd')
    .select('processo_id, secretaria_nome, objeto')
    .eq('id', dfdId)
    .maybeSingle()

  const processoId = (dfdRaw as any)?.processo_id
  const nomeSecretaria = (dfdRaw as any)?.secretaria_nome ?? ''
  const objeto = (dfdRaw as any)?.objeto ?? ''

  const usuarios = (usuariosRaw ?? []) as Array<{ id: string; organizacao_id: string }>
  if (usuarios.length > 0 && processoId) {
    const notificacoes = usuarios.map(u => ({
      usuario_id: u.id,
      organizacao_id: u.organizacao_id,
      processo_id: processoId,
      titulo: 'DFD disponivel para adesao',
      mensagem: `A ${nomeSecretaria} abriu um processo de compra compartilhada para: ${objeto.substring(0, 80)}${objeto.length > 80 ? '...' : ''}. Acesse para manifestar interesse.`,
      lida: false,
      link: `/processos/${processoId}/dfd`,
    }))

    await (supabase as any).from('notificacoes').insert(notificacoes)
  }

  revalidatePath(`/processos/${processoId}/dfd`)
  return { success: true }
}

// -------------------------------------------------------
// Participacoes
// -------------------------------------------------------

export async function obterParticipacoesDFD(dfdId: string): Promise<DFDParticipacaoRow[]> {
  const ctx = await obterUsuarioEOrg()
  if (!ctx) return []
  const { supabase } = ctx

  const { data } = await (supabase as any)
    .from('dfd_participacoes')
    .select('*')
    .eq('dfd_id', dfdId)
    .order('tipo', { ascending: false }) // iniciadora primeiro

  return (data ?? []) as DFDParticipacaoRow[]
}

export async function obterParticipacoesComItens(dfdId: string) {
  const ctx = await obterUsuarioEOrg()
  if (!ctx) return []
  const { supabase } = ctx

  const { data: partsRaw } = await (supabase as any)
    .from('dfd_participacoes')
    .select('*, dfd_participacoes_itens(*)')
    .eq('dfd_id', dfdId)
    .order('tipo', { ascending: false })

  return (partsRaw ?? []) as Array<DFDParticipacaoRow & { dfd_participacoes_itens: DFDParticipacaoItemRow[] }>
}

// Secretaria participante responde ao convite
export async function responderAdesaoDFD(
  participacaoId: string,
  dados: {
    status: 'aderida' | 'recusada'
    fiscal_contrato?: string
    dotacao_orcamentaria?: string
    itens?: Array<{ dfd_item_id: string; quantidade: number; observacoes?: string }>
  }
): Promise<{ success: boolean; error?: string }> {
  const ctx = await obterUsuarioEOrg()
  if (!ctx) return { success: false, error: 'Não autenticado.' }
  const { supabase, user } = ctx

  const { error: errPart } = await (supabase as any)
    .from('dfd_participacoes')
    .update({
      status: dados.status,
      fiscal_contrato: dados.fiscal_contrato ?? null,
      dotacao_orcamentaria: dados.dotacao_orcamentaria ?? null,
      respondido_em: new Date().toISOString(),
      respondido_por: user.id,
    })
    .eq('id', participacaoId)

  if (errPart) return { success: false, error: errPart.message }

  // Salva quantidades por item se aderida
  if (dados.status === 'aderida' && dados.itens?.length) {
    await (supabase as any)
      .from('dfd_participacoes_itens')
      .delete()
      .eq('participacao_id', participacaoId)

    const itensParaInserir = dados.itens
      .filter(i => i.quantidade > 0)
      .map(i => ({
        participacao_id: participacaoId,
        dfd_item_id: i.dfd_item_id,
        quantidade: i.quantidade,
        observacoes: i.observacoes ?? null,
      }))

    if (itensParaInserir.length > 0) {
      const { error: errItens } = await (supabase as any)
        .from('dfd_participacoes_itens')
        .insert(itensParaInserir)

      if (errItens) return { success: false, error: errItens.message }
    }
  }

  return { success: true }
}

// -------------------------------------------------------
// Consolidacao do DFD
// -------------------------------------------------------

export async function consolidarDFD(
  dfdId: string
): Promise<{ success: boolean; error?: string }> {
  const ctx = await obterUsuarioEOrg()
  if (!ctx) return { success: false, error: 'Não autenticado.' }
  const { supabase } = ctx

  // Verifica se prazo ja passou ou se status permite consolidar
  const { data: dfdRaw } = await (supabase as any)
    .from('dfd')
    .select('status_adesao, prazo_adesao, processo_id')
    .eq('id', dfdId)
    .maybeSingle()

  const dfd = dfdRaw as { status_adesao: string; prazo_adesao: string | null; processo_id: string } | null
  if (!dfd) return { success: false, error: 'DFD nao encontrado.' }

  if (!['aguardando_adesao', 'prazo_encerrado'].includes(dfd.status_adesao)) {
    return { success: false, error: 'DFD nao esta em estado de adesao.' }
  }

  const { error } = await (supabase as any)
    .from('dfd')
    .update({
      status_adesao: 'consolidado',
      consolidado_em: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    })
    .eq('id', dfdId)

  if (error) return { success: false, error: error.message }

  revalidatePath(`/processos/${dfd.processo_id}/dfd`)
  return { success: true }
}

// Verifica e atualiza automaticamente prazo encerrado
export async function verificarPrazoAdesao(dfdId: string): Promise<void> {
  const ctx = await obterUsuarioEOrg()
  if (!ctx) return
  const { supabase } = ctx

  const { data } = await (supabase as any)
    .from('dfd')
    .select('status_adesao, prazo_adesao')
    .eq('id', dfdId)
    .maybeSingle()

  if (!data) return
  if (data.status_adesao !== 'aguardando_adesao') return
  if (!data.prazo_adesao) return

  const prazo = new Date(data.prazo_adesao)
  if (new Date() >= prazo) {
    await (supabase as any)
      .from('dfd')
      .update({ status_adesao: 'prazo_encerrado', updated_at: new Date().toISOString() })
      .eq('id', dfdId)
  }
}

// -------------------------------------------------------
// Geracao de ETP e TR a partir do DFD consolidado
// Vincula a geracao ao processo existente (nao cria processo novo).
// Pre-preenche com objeto, justificativa e itens consolidados do DFD.
// -------------------------------------------------------

function stripHtml(s: string | null | undefined): string {
  if (!s) return ''
  return s.replace(/<[^>]*>/g, ' ').replace(/&nbsp;/g, ' ').replace(/\s+/g, ' ').trim()
}

export async function gerarETPeTRDoDFDConsolidado(
  processoId: string
): Promise<{ success: boolean; error?: string }> {
  const ctx = await obterUsuarioEOrg()
  if (!ctx) return { success: false, error: 'Não autenticado.' }
  const { supabase, usuario } = ctx

  // 1. DFD consolidado
  const dfd = await obterDFD(processoId)
  if (!dfd) return { success: false, error: 'DFD nao encontrado.' }
  if (dfd.status_adesao !== 'consolidado') {
    return { success: false, error: 'Consolide as demandas antes de gerar ETP e TR.' }
  }

  // 2. Processo e organizacao
  const [{ data: procRaw }, { data: orgRaw }] = await Promise.all([
    (supabase as any)
      .from('processos_licitatorios')
      .select('modalidade, valor_estimado, registro_de_precos')
      .eq('id', processoId)
      .maybeSingle(),
    (supabase as any)
      .from('organizacoes')
      .select('municipio, estado')
      .eq('id', usuario.organizacao_id)
      .maybeSingle(),
  ])
  const proc = procRaw as { modalidade: string; valor_estimado: number | null; registro_de_precos: boolean } | null
  if (!proc) return { success: false, error: 'Processo nao encontrado.' }
  const org = orgRaw as { municipio: string | null; estado: string | null } | null

  // 3. Quantidades consolidadas por item (soma das secretarias aderidas)
  const participacoes = await obterParticipacoesComItens(dfd.id)
  const aderidas = participacoes.filter(p => p.status === 'aderida')
  const descricaoItens = dfd.itens
    .map(item => {
      const total = aderidas.reduce((acc, p) => {
        const pit = p.dfd_participacoes_itens.find(i => i.dfd_item_id === item.id)
        return acc + (pit ? Number(pit.quantidade) : 0)
      }, 0)
      const espec = stripHtml(item.especificacao)
      return total > 0 ? `${total} ${item.unidade_medida} de ${espec}` : espec
    })
    .filter(Boolean)
    .join('; ')

  const dadosPrompt = {
    objeto: stripHtml(dfd.objeto),
    justificativaNecessidade: stripHtml(dfd.justificativa_necessidade),
    modalidade: proc.modalidade,
    valorEstimado: proc.valor_estimado ?? undefined,
    prazoExecucao: undefined,
    secretaria: dfd.secretaria_nome,
    municipio: org?.municipio ?? undefined,
    estado: org?.estado ?? undefined,
    requisitosEspecificos: undefined,
    quantidadeItens: dfd.itens.length || undefined,
    descricaoItens: descricaoItens || undefined,
    fonteRecurso: undefined,
    unidadeRequisitante: dfd.secretaria_nome,
  }

  // 4. Gerar ETP e TR sequencialmente (respeita rate limit do provider)
  const resETP = await executarIAComCreditos({
    prompt: buildPromptETP(dadosPrompt),
    tipoAcao: 'gerar_documento',
    processoId,
    temperature: 0.3,
  })
  if (!resETP.success) return { success: false, error: resETP.error }

  const resTR = await executarIAComCreditos({
    prompt: buildPromptTR(dadosPrompt),
    tipoAcao: 'gerar_documento',
    processoId,
    temperature: 0.3,
  })
  if (!resTR.success) return { success: false, error: resTR.error }

  // 5. Gravar ETP e TR no processo (atualiza se ja existir)
  const [{ data: etpExistente }, { data: trExistente }] = await Promise.all([
    (supabase as any).from('etp').select('id').eq('processo_id', processoId).maybeSingle(),
    (supabase as any).from('termo_referencia').select('id').eq('processo_id', processoId).maybeSingle(),
  ])

  if (etpExistente) {
    await (supabase as any).from('etp')
      .update({ descricao_necessidade: resETP.texto, gerado_por_ia: true, updated_at: new Date().toISOString() })
      .eq('id', (etpExistente as any).id)
  } else {
    const { error: etpErr } = await (supabase as any).from('etp').insert({
      processo_id: processoId,
      organizacao_id: usuario.organizacao_id,
      criado_por: usuario.id,
      descricao_necessidade: resETP.texto,
      status: 'rascunho',
      gerado_por_ia: true,
    })
    if (etpErr) return { success: false, error: `Erro ao salvar ETP: ${etpErr.message}` }
  }

  if (trExistente) {
    await (supabase as any).from('termo_referencia')
      .update({ fundamentacao: resTR.texto, gerado_por_ia: true, updated_at: new Date().toISOString() })
      .eq('id', (trExistente as any).id)
  } else {
    const { error: trErr } = await (supabase as any).from('termo_referencia').insert({
      processo_id: processoId,
      organizacao_id: usuario.organizacao_id,
      criado_por: usuario.id,
      fundamentacao: resTR.texto,
      status: 'rascunho',
      gerado_por_ia: true,
    })
    if (trErr) return { success: false, error: `Erro ao salvar TR: ${trErr.message}` }
  }

  void registrarAuditoria({
    organizacaoId: usuario.organizacao_id,
    usuarioId:     usuario.id,
    nomeUsuario:   usuario.nome_completo,
    papelUsuario:  usuario.papel,
    categoria:     'documento',
    acao:          'documento.gerado_ia',
    recursoId:     processoId,
    recursoDesc:   'ETP e TR gerados a partir do DFD consolidado',
  })

  revalidatePath(`/processos/${processoId}/etp`)
  revalidatePath(`/processos/${processoId}/tr`)
  return { success: true }
}

// -------------------------------------------------------
// Buscar secretarias disponiveis para convite
// -------------------------------------------------------

export async function listarSecretariasParaConvite(
  dfdId: string
): Promise<Array<{ id: string; nome: string; sigla: string | null; ja_convidada: boolean }>> {
  const ctx = await obterUsuarioEOrg()
  if (!ctx) return []
  const { supabase } = ctx

  const [secsRaw, partsRaw] = await Promise.all([
    (supabase as any)
      .from('secretarias')
      .select('id, nome, sigla')
      .eq('organizacao_id', ctx.usuario.organizacao_id)
      .eq('ativo', true)
      .order('nome'),
    (supabase as any)
      .from('dfd_participacoes')
      .select('secretaria_id')
      .eq('dfd_id', dfdId),
  ])

  const secretarias = (secsRaw.data ?? []) as Array<{ id: string; nome: string; sigla: string | null }>
  const jaConvidadas = new Set((partsRaw.data ?? []).map((p: any) => p.secretaria_id as string))

  return secretarias.map(s => ({ ...s, ja_convidada: jaConvidadas.has(s.id) }))
}