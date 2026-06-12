'use server'

import { z } from 'zod'
import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { registrarAuditoria } from '@/lib/audit/log'
import type { SolicitacaoCompraRow, SolicitacaoItemRow } from '@/types/database'

// -------------------------------------------------------
// Schemas Zod
// -------------------------------------------------------

const ItemSolicitacaoSchema = z.object({
  numero_item: z.number().int().positive(),
  catmat_codigo: z.string().max(10).optional(),
  catmat_pdm_codigo: z.string().max(10).optional(),
  catmat_descricao: z.string().min(1, 'Descrição do item é obrigatória'),
  catmat_unidade: z.string().max(20).optional(),
  especificacao_complementar: z.string().optional(),
  quantidade: z.number().positive('Quantidade deve ser maior que zero'),
  unidade_medida: z.string().min(1, 'Unidade de medida é obrigatória').max(20),
  valor_estimado_unitario: z.number().nonnegative().optional(),
})

const SolicitacaoSchema = z.object({
  secretaria_id: z.string().uuid().optional(),
  objeto: z.string().min(5, 'Objeto deve ter ao menos 5 caracteres').max(500),
  justificativa: z.string().optional(),
  prioridade: z.enum(['baixa', 'media', 'alta', 'urgente']),
  data_necessidade: z.string().optional(),
  itens: z.array(ItemSolicitacaoSchema).min(1, 'Adicione ao menos um item'),
})

// -------------------------------------------------------
// Helpers
// -------------------------------------------------------

async function obterCtx() {
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

async function notificarSetorCompras(
  supabase: Awaited<ReturnType<typeof createClient>>,
  organizacaoId: string,
  titulo: string,
  mensagem: string,
  link: string
) {
  const { data: gestores } = await supabase
    .from('usuarios')
    .select('id')
    .eq('organizacao_id', organizacaoId)
    .in('papel', ['setor_compras', 'setor_licitacao', 'admin_organizacao'])
    .eq('ativo', true)

  if (!gestores?.length) return

  const notifs = gestores.map((u) => ({
    usuario_id: u.id,
    titulo,
    mensagem,
    link,
    lida: false,
  }))

  await supabase.from('notificacoes').insert(notifs)
}

// -------------------------------------------------------
// Tipos exportados
// -------------------------------------------------------

export type ItemSolicitacaoInput = z.infer<typeof ItemSolicitacaoSchema>
export type SolicitacaoInput = z.infer<typeof SolicitacaoSchema>

// -------------------------------------------------------
// Salvar rascunho / criar
// -------------------------------------------------------

export async function salvarSolicitacao(
  input: SolicitacaoInput,
  solicitacaoId?: string
): Promise<{ success: boolean; id?: string; error?: string }> {
  const ctx = await obterCtx()
  if (!ctx) return { success: false, error: 'Não autorizado' }
  const { supabase, usuario } = ctx

  const parsed = SolicitacaoSchema.safeParse(input)
  if (!parsed.success) {
    const primeira = parsed.error.errors[0]
    return { success: false, error: primeira?.message ?? 'Dados inválidos' }
  }
  const dados = parsed.data

  const payload = {
    organizacao_id: usuario.organizacao_id,
    secretaria_id: dados.secretaria_id ?? null,
    usuario_id: usuario.id,
    objeto: dados.objeto,
    justificativa: dados.justificativa ?? null,
    prioridade: dados.prioridade,
    data_necessidade: dados.data_necessidade ?? null,
    status: 'rascunho' as const,
  } satisfies Partial<SolicitacaoCompraRow>

  let id = solicitacaoId

  if (id) {
    const { error } = await supabase
      .from('solicitacoes_compra')
      .update(payload)
      .eq('id', id)
      .eq('usuario_id', usuario.id)
      .eq('status', 'rascunho')

    if (error) return { success: false, error: error.message }
  } else {
    const { data, error } = await supabase
      .from('solicitacoes_compra')
      .insert(payload)
      .select('id')
      .single()

    if (error) return { success: false, error: error.message }
    id = data.id
  }

  // Substitui itens
  await supabase.from('solicitacoes_itens').delete().eq('solicitacao_id', id)

  if (dados.itens.length > 0) {
    const itens = dados.itens.map((it) => ({
      solicitacao_id: id as string,
      numero_item: it.numero_item,
      catmat_codigo: it.catmat_codigo ?? null,
      catmat_pdm_codigo: it.catmat_pdm_codigo ?? null,
      catmat_descricao: it.catmat_descricao ?? null,
      catmat_unidade: it.catmat_unidade ?? null,
      especificacao_complementar: it.especificacao_complementar ?? null,
      quantidade: it.quantidade,
      unidade_medida: it.unidade_medida,
      valor_estimado_unitario: it.valor_estimado_unitario ?? null,
    } satisfies Partial<SolicitacaoItemRow>))

    const { error: errItens } = await supabase
      .from('solicitacoes_itens')
      .insert(itens)

    if (errItens) return { success: false, error: errItens.message }
  }

  revalidatePath('/solicitacoes')
  return { success: true, id }
}

// -------------------------------------------------------
// Enviar ao setor de compras
// -------------------------------------------------------

export async function enviarSolicitacao(
  solicitacaoId: string
): Promise<{ success: boolean; error?: string }> {
  const ctx = await obterCtx()
  if (!ctx) return { success: false, error: 'Não autorizado' }
  const { supabase, usuario } = ctx

  const { data: sol } = await supabase
    .from('solicitacoes_compra')
    .select('id, objeto, organizacao_id, status')
    .eq('id', solicitacaoId)
    .eq('usuario_id', usuario.id)
    .maybeSingle()

  if (!sol) return { success: false, error: 'Solicitação não encontrada' }
  if (sol.status !== 'rascunho') return { success: false, error: 'Apenas rascunhos podem ser enviados' }

  const { error } = await supabase
    .from('solicitacoes_compra')
    .update({ status: 'enviada' })
    .eq('id', solicitacaoId)

  if (error) return { success: false, error: error.message }

  await notificarSetorCompras(
    supabase,
    sol.organizacao_id,
    'Nova solicitação de compra',
    `${usuario.nome_completo} enviou uma solicitação: ${sol.objeto}`,
    `/solicitacoes/${sol.id}`
  )

  await registrarAuditoria({
    organizacaoId: sol.organizacao_id,
    usuarioId: usuario.id,
    nomeUsuario: usuario.nome_completo,
    papelUsuario: usuario.papel,
    categoria: 'documento',
    acao: 'solicitacao.enviada',
    recursoId: solicitacaoId,
    recursoDesc: sol.objeto,
  })

  revalidatePath('/solicitacoes')
  return { success: true }
}

// -------------------------------------------------------
// Listar (setor de compras e requisitante)
// -------------------------------------------------------

export interface SolicitacaoResumo {
  id: string
  created_at: string
  objeto: string
  justificativa: string | null
  prioridade: string
  status: string
  data_necessidade: string | null
  secretaria_nome: string | null
  usuario_nome: string
  total_itens: number
}

export async function listarSolicitacoes(filtros?: {
  status?: string
  secretaria_id?: string
  prioridade?: string
}): Promise<SolicitacaoResumo[]> {
  const ctx = await obterCtx()
  if (!ctx) return []
  const { supabase, usuario } = ctx

  let query = supabase
    .from('solicitacoes_compra')
    .select(`
      id, created_at, objeto, justificativa, prioridade, status, data_necessidade,
      secretarias ( nome ),
      usuarios ( nome_completo ),
      solicitacoes_itens ( id )
    `)
    .eq('organizacao_id', usuario.organizacao_id)
    .order('created_at', { ascending: false })

  if (filtros?.status) query = query.eq('status', filtros.status)
  if (filtros?.secretaria_id) query = query.eq('secretaria_id', filtros.secretaria_id)
  if (filtros?.prioridade) query = query.eq('prioridade', filtros.prioridade)

  const { data } = await query
  if (!data) return []

  return (data as unknown as Array<{
    id: string
    created_at: string
    objeto: string
    justificativa: string | null
    prioridade: string
    status: string
    data_necessidade: string | null
    secretarias: { nome: string } | null
    usuarios: { nome_completo: string } | null
    solicitacoes_itens: { id: string }[]
  }>).map((s) => ({
    id: s.id,
    created_at: s.created_at,
    objeto: s.objeto,
    justificativa: s.justificativa,
    prioridade: s.prioridade,
    status: s.status,
    data_necessidade: s.data_necessidade,
    secretaria_nome: s.secretarias?.nome ?? null,
    usuario_nome: s.usuarios?.nome_completo ?? 'Desconhecido',
    total_itens: s.solicitacoes_itens?.length ?? 0,
  }))
}

// -------------------------------------------------------
// Obter uma solicitacao completa
// -------------------------------------------------------

export async function obterSolicitacao(id: string) {
  const ctx = await obterCtx()
  if (!ctx) return null
  const { supabase } = ctx

  const { data } = await supabase
    .from('solicitacoes_compra')
    .select(`
      *,
      secretarias ( id, nome ),
      usuarios ( id, nome_completo ),
      solicitacoes_itens (
        id, numero_item, catmat_codigo, catmat_pdm_codigo, catmat_descricao,
        catmat_unidade, especificacao_complementar, quantidade, unidade_medida,
        valor_estimado_unitario
      )
    `)
    .eq('id', id)
    .maybeSingle()

  return data as (SolicitacaoCompraRow & {
    secretarias: { id: string; nome: string } | null
    usuarios: { id: string; nome_completo: string } | null
    solicitacoes_itens: SolicitacaoItemRow[]
  }) | null
}

// -------------------------------------------------------
// Recusar (setor de compras)
// -------------------------------------------------------

export async function recusarSolicitacao(
  solicitacaoId: string,
  motivo: string
): Promise<{ success: boolean; error?: string }> {
  const ctx = await obterCtx()
  if (!ctx) return { success: false, error: 'Não autorizado' }
  const { supabase, usuario } = ctx

  const papeisGestao = ['setor_compras', 'setor_licitacao', 'admin_organizacao', 'admin_plataforma']
  if (!papeisGestao.includes(usuario.papel)) {
    return { success: false, error: 'Sem permissão para esta ação' }
  }

  const { data: sol } = await supabase
    .from('solicitacoes_compra')
    .select('id, usuario_id, objeto, organizacao_id')
    .eq('id', solicitacaoId)
    .eq('organizacao_id', usuario.organizacao_id)
    .maybeSingle()

  if (!sol) return { success: false, error: 'Solicitação não encontrada' }

  const { error } = await supabase
    .from('solicitacoes_compra')
    .update({
      status: 'recusada',
      motivo_recusa: motivo,
      recusado_por: usuario.id,
      recusado_em: new Date().toISOString(),
    })
    .eq('id', solicitacaoId)

  if (error) return { success: false, error: error.message }

  // Notifica o autor
  await supabase.from('notificacoes').insert({
    usuario_id: sol.usuario_id,
    titulo: 'Solicitação recusada',
    mensagem: `Sua solicitação "${sol.objeto}" foi recusada. Motivo: ${motivo}`,
    link: `/solicitacoes/${sol.id}`,
    lida: false,
  })

  revalidatePath('/solicitacoes')
  return { success: true }
}

// -------------------------------------------------------
// Aprovar e converter em processo (abre o wizard)
// -------------------------------------------------------

export async function aprovarSolicitacao(
  solicitacaoId: string
): Promise<{ success: boolean; redirectUrl?: string; error?: string }> {
  const ctx = await obterCtx()
  if (!ctx) return { success: false, error: 'Não autorizado' }
  const { supabase, usuario } = ctx

  const papeisGestao = ['setor_compras', 'setor_licitacao', 'admin_organizacao', 'admin_plataforma']
  if (!papeisGestao.includes(usuario.papel)) {
    return { success: false, error: 'Sem permissão para esta ação' }
  }

  const { error } = await supabase
    .from('solicitacoes_compra')
    .update({ status: 'aprovada' })
    .eq('id', solicitacaoId)
    .eq('organizacao_id', usuario.organizacao_id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/solicitacoes')
  return {
    success: true,
    redirectUrl: `/processos/novo?solicitacao_id=${solicitacaoId}`,
  }
}
