'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

// ============================================================
// Schemas de validação
// ============================================================

const ItemAvisoSchema = z.object({
  descricao: z.string().min(2, 'Descricao obrigatoria'),
  unidade: z.string().min(1, 'Unidade obrigatoria'),
  quantidade_origem: z.number().int().positive('Quantidade deve ser maior que zero'),
})

const CriarAvisoSchema = z.object({
  secretaria_origem_id: z.string().uuid(),
  modalidade: z.string().min(1),
  categoria_objeto: z.string().min(1),
  prazo_adesao: z.string().datetime({ offset: true }),
  itens: z.array(ItemAvisoSchema).min(1, 'Adicione ao menos um item'),
  secretarias_destinatarias: z.array(z.string().uuid()).min(1, 'Selecione ao menos uma secretaria'),
})

const ItemAdesaoSchema = z.object({
  aviso_item_id: z.string().uuid().nullable(),
  descricao: z.string().min(2),
  unidade: z.string().min(1),
  quantidade: z.number().int().positive(),
  categoria_objeto: z.string().min(1),
})

const RegistrarAdesaoSchema = z.object({
  aviso_id: z.string().uuid(),
  secretaria_id: z.string().uuid(),
  fiscal_nome: z.string().min(2, 'Informe o fiscal do contrato'),
  dotacao_orcamentaria: z.string().min(2, 'Informe a dotacao orcamentaria'),
  itens: z.array(ItemAdesaoSchema).min(1, 'Selecione ao menos um item'),
})

// ============================================================
// Tipos públicos
// ============================================================

export type ItemAvisoInput = z.infer<typeof ItemAvisoSchema>
export type CriarAvisoInput = z.infer<typeof CriarAvisoSchema>
export type ItemAdesaoInput = z.infer<typeof ItemAdesaoSchema>
export type RegistrarAdesaoInput = z.infer<typeof RegistrarAdesaoSchema>

export interface AvisoResumo {
  id: string
  modalidade: string
  categoria_objeto: string
  prazo_adesao: string
  status: string
  created_at: string
  secretaria_origem: { id: string; nome: string; sigla: string | null }
  total_destinatarias: number
  total_aderidas: number
}

export interface AvisoDetalhe {
  id: string
  organizacao_id: string
  secretaria_origem_id: string
  criado_por: string
  modalidade: string
  categoria_objeto: string
  prazo_adesao: string
  status: string
  processo_id: string | null
  created_at: string
  secretaria_origem: { id: string; nome: string; sigla: string | null }
  itens: Array<{
    id: string
    descricao: string
    unidade: string
    quantidade_origem: number
    categoria_objeto: string
  }>
  destinatarias: Array<{
    id: string
    secretaria_id: string
    status: string
    respondido_em: string | null
    secretaria: { id: string; nome: string; sigla: string | null }
  }>
  adesoes: Array<{
    id: string
    secretaria_id: string
    fiscal_nome: string
    dotacao_orcamentaria: string
    secretaria: { id: string; nome: string; sigla: string | null }
    itens: Array<{
      id: string
      aviso_item_id: string | null
      descricao: string
      unidade: string
      quantidade: number
      categoria_objeto: string
    }>
  }>
}

// ============================================================
// Helpers internos
// ============================================================

async function obterUsuarioEOrg() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('usuarios')
    .select('id, organizacao_id, secretaria_id')
    .eq('id', user.id)
    .maybeSingle()

  if (!data) return null
  return { supabase, user, ...data as { organizacao_id: string; secretaria_id: string | null } }
}

// ============================================================
// Actions públicas
// ============================================================

export async function criarAviso(
  input: CriarAvisoInput
): Promise<{ success: boolean; avisoId?: string; error?: string }> {
  const ctx = await obterUsuarioEOrg()
  if (!ctx) return { success: false, error: 'Não autenticado.' }

  const parsed = CriarAvisoSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message }

  const { supabase, user } = ctx
  const d = parsed.data

  // 1. Criar aviso
  const { data: aviso, error: avisoErr } = await (supabase as any)
    .from('avisos_compra_conjunta')
    .insert({
      organizacao_id: ctx.organizacao_id,
      secretaria_origem_id: d.secretaria_origem_id,
      criado_por: user.id,
      modalidade: d.modalidade,
      categoria_objeto: d.categoria_objeto,
      prazo_adesao: d.prazo_adesao,
      status: 'aberto',
    })
    .select('id')
    .single()

  if (avisoErr || !aviso) return { success: false, error: avisoErr?.message ?? 'Erro ao criar aviso.' }

  const avisoId: string = aviso.id

  // 2. Inserir itens
  const { error: itensErr } = await (supabase as any)
    .from('avisos_itens')
    .insert(
      d.itens.map(item => ({
        aviso_id: avisoId,
        descricao: item.descricao,
        unidade: item.unidade,
        quantidade_origem: item.quantidade_origem,
        categoria_objeto: d.categoria_objeto,
      }))
    )
  if (itensErr) {
    await (supabase as any).from('avisos_compra_conjunta').delete().eq('id', avisoId)
    return { success: false, error: `Erro ao inserir itens: ${itensErr.message}` }
  }

  // 3. Inserir destinatárias
  const { error: destErr } = await (supabase as any)
    .from('avisos_destinatarias')
    .insert(
      d.secretarias_destinatarias.map(secId => ({
        aviso_id: avisoId,
        secretaria_id: secId,
        status: 'pendente',
      }))
    )
  if (destErr) {
    await (supabase as any).from('avisos_compra_conjunta').delete().eq('id', avisoId)
    return { success: false, error: `Erro ao inserir destinatarias: ${destErr.message}` }
  }

  // 4. Criar notificações para todos os usuários das secretarias destinatárias
  const { data: usuariosDestinatarios } = await supabase
    .from('usuarios')
    .select('id')
    .in('secretaria_id', d.secretarias_destinatarias)

  if (usuariosDestinatarios?.length) {
    await (supabase as any).from('notificacoes').insert(
      (usuariosDestinatarios as Array<{ id: string }>).map(u => ({
        usuario_id: u.id,
        titulo: 'Aviso de Compra Conjunta',
        mensagem: 'Uma secretaria convidou voce para participar de uma compra conjunta. Acesse para ver os itens e aderir.',
        lida: false,
        link: `/processos/aviso-compra-conjunta/${avisoId}/aderir`,
      }))
    )
  }

  revalidatePath('/processos/aviso-compra-conjunta')
  revalidatePath('/dashboard')
  return { success: true, avisoId }
}

export async function listarAvisos(): Promise<AvisoResumo[]> {
  const ctx = await obterUsuarioEOrg()
  if (!ctx) return []

  const { supabase } = ctx

  const { data } = await (supabase as any)
    .from('avisos_compra_conjunta')
    .select(`
      id, modalidade, categoria_objeto, prazo_adesao, status, created_at,
      secretaria_origem:secretarias!secretaria_origem_id(id, nome, sigla),
      destinatarias:avisos_destinatarias(id, status)
    `)
    .eq('organizacao_id', ctx.organizacao_id)
    .order('created_at', { ascending: false })

  if (!data) return []

  return (data as any[]).map(a => ({
    id: a.id,
    modalidade: a.modalidade,
    categoria_objeto: a.categoria_objeto,
    prazo_adesao: a.prazo_adesao,
    status: a.status,
    created_at: a.created_at,
    secretaria_origem: a.secretaria_origem,
    total_destinatarias: a.destinatarias?.length ?? 0,
    total_aderidas: (a.destinatarias as any[])?.filter((d: any) => d.status === 'aderiu').length ?? 0,
  }))
}

export async function buscarAviso(
  id: string
): Promise<{ success: boolean; aviso?: AvisoDetalhe; error?: string }> {
  const ctx = await obterUsuarioEOrg()
  if (!ctx) return { success: false, error: 'Não autenticado.' }

  const { supabase } = ctx

  const { data, error } = await (supabase as any)
    .from('avisos_compra_conjunta')
    .select(`
      id, organizacao_id, secretaria_origem_id, criado_por,
      modalidade, categoria_objeto, prazo_adesao, status, processo_id, created_at,
      secretaria_origem:secretarias!secretaria_origem_id(id, nome, sigla),
      itens:avisos_itens(id, descricao, unidade, quantidade_origem, categoria_objeto),
      destinatarias:avisos_destinatarias(
        id, secretaria_id, status, respondido_em,
        secretaria:secretarias(id, nome, sigla)
      ),
      adesoes:avisos_adesoes(
        id, secretaria_id, fiscal_nome, dotacao_orcamentaria,
        secretaria:secretarias(id, nome, sigla),
        itens:avisos_adesoes_itens(id, aviso_item_id, descricao, unidade, quantidade, categoria_objeto)
      )
    `)
    .eq('id', id)
    .single()

  if (error || !data) return { success: false, error: error?.message ?? 'Aviso nao encontrado.' }

  return { success: true, aviso: data as AvisoDetalhe }
}

export async function registrarAdesao(
  input: RegistrarAdesaoInput
): Promise<{ success: boolean; error?: string }> {
  const ctx = await obterUsuarioEOrg()
  if (!ctx) return { success: false, error: 'Não autenticado.' }

  const parsed = RegistrarAdesaoSchema.safeParse(input)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message }

  const { supabase } = ctx
  const d = parsed.data

  // Verificar que aviso existe e está aberto
  const { data: aviso } = await (supabase as any)
    .from('avisos_compra_conjunta')
    .select('id, status, categoria_objeto, organizacao_id')
    .eq('id', d.aviso_id)
    .single()

  if (!aviso) return { success: false, error: 'Aviso nao encontrado.' }
  if (aviso.status !== 'aberto') return { success: false, error: 'O prazo para adesao ja foi encerrado.' }

  // Verificar que secretaria está na lista de destinatárias
  const { data: destinataria } = await (supabase as any)
    .from('avisos_destinatarias')
    .select('id, status')
    .eq('aviso_id', d.aviso_id)
    .eq('secretaria_id', d.secretaria_id)
    .single()

  if (!destinataria) return { success: false, error: 'Sua secretaria nao foi convidada para este aviso.' }
  if (destinataria.status === 'aderiu') return { success: false, error: 'Sua secretaria ja aderiu a este aviso.' }

  // Validar que todos os itens são da mesma categoria do aviso
  const categoriaInvalida = d.itens.find(i => i.categoria_objeto !== aviso.categoria_objeto)
  if (categoriaInvalida) {
    return {
      success: false,
      error: `Item "${categoriaInvalida.descricao}" e de categoria diferente da licitacao. Somente itens de "${aviso.categoria_objeto}" sao permitidos.`,
    }
  }

  // 1. Criar adesão
  const { data: adesao, error: adesaoErr } = await (supabase as any)
    .from('avisos_adesoes')
    .insert({
      aviso_id: d.aviso_id,
      secretaria_id: d.secretaria_id,
      fiscal_nome: d.fiscal_nome,
      dotacao_orcamentaria: d.dotacao_orcamentaria,
    })
    .select('id')
    .single()

  if (adesaoErr || !adesao) return { success: false, error: adesaoErr?.message ?? 'Erro ao registrar adesao.' }

  // 2. Inserir itens da adesão
  const { error: itensErr } = await (supabase as any)
    .from('avisos_adesoes_itens')
    .insert(
      d.itens.map(item => ({
        adesao_id: adesao.id,
        aviso_item_id: item.aviso_item_id,
        descricao: item.descricao,
        unidade: item.unidade,
        quantidade: item.quantidade,
        categoria_objeto: item.categoria_objeto,
      }))
    )
  if (itensErr) {
    await (supabase as any).from('avisos_adesoes').delete().eq('id', adesao.id)
    return { success: false, error: `Erro ao inserir itens: ${itensErr.message}` }
  }

  // 3. Atualizar status da destinatária
  await (supabase as any)
    .from('avisos_destinatarias')
    .update({ status: 'aderiu', respondido_em: new Date().toISOString() })
    .eq('id', destinataria.id)

  // 4. Notificar criador do aviso
  const { data: avioCompleto } = await (supabase as any)
    .from('avisos_compra_conjunta')
    .select('criado_por, secretaria_origem:secretarias!secretaria_origem_id(nome)')
    .eq('id', d.aviso_id)
    .single()

  if (avioCompleto) {
    const secNome = (avioCompleto as any).secretaria_origem?.nome ?? 'Uma secretaria'
    await (supabase as any).from('notificacoes').insert({
      usuario_id: (avioCompleto as any).criado_por,
      titulo: 'Nova adesao ao aviso',
      mensagem: `${secNome} aderiu ao seu Aviso de Compra Conjunta.`,
      lida: false,
      link: `/processos/aviso-compra-conjunta/${d.aviso_id}`,
    })
  }

  revalidatePath(`/processos/aviso-compra-conjunta/${d.aviso_id}`)
  return { success: true }
}

// Wrapper para envio de pedido de adesao a partir do wizard
// Cria aviso com dados do wizard + secretarias selecionadas + prazo
export async function enviarPedidoAdesaoWizard(params: {
  secretariaOrigemId: string
  modalidade: string
  categoriaObjeto: string
  objeto: string
  itensWizard: Array<{ descricao: string; unidade: string; quantidade: number }>
  prazoAdesaoDias: number
  secretariasConvidadas: string[]
}): Promise<{ success: boolean; avisoId?: string; prazoAdesao?: string; error?: string }> {
  const prazoAdesao = new Date(Date.now() + params.prazoAdesaoDias * 86_400_000).toISOString()

  const itens = params.itensWizard.length > 0
    ? params.itensWizard.map(i => ({
        descricao: i.descricao,
        unidade: i.unidade || 'unid.',
        quantidade_origem: Math.max(1, i.quantidade),
      }))
    : [{ descricao: params.objeto, unidade: 'unid.', quantidade_origem: 1 }]

  const res = await criarAviso({
    secretaria_origem_id: params.secretariaOrigemId,
    modalidade: params.modalidade,
    categoria_objeto: params.categoriaObjeto,
    prazo_adesao: prazoAdesao,
    itens,
    secretarias_destinatarias: params.secretariasConvidadas,
  })

  if (!res.success) return { success: false, error: res.error }
  return { success: true, avisoId: res.avisoId, prazoAdesao }
}

export async function encerrarPrazo(
  avisoId: string
): Promise<{ success: boolean; error?: string }> {
  const ctx = await obterUsuarioEOrg()
  if (!ctx) return { success: false, error: 'Não autenticado.' }

  const { supabase } = ctx

  const { error } = await (supabase as any)
    .from('avisos_compra_conjunta')
    .update({ status: 'encerrado' })
    .eq('id', avisoId)
    .eq('organizacao_id', ctx.organizacao_id)
    .eq('status', 'aberto')

  if (error) return { success: false, error: error.message }

  // Notificar criador
  const { data: aviso } = await (supabase as any)
    .from('avisos_compra_conjunta')
    .select('criado_por')
    .eq('id', avisoId)
    .single()

  if (aviso) {
    await (supabase as any).from('notificacoes').insert({
      usuario_id: (aviso as any).criado_por,
      titulo: 'Prazo de adesao encerrado',
      mensagem: 'O prazo do seu Aviso de Compra Conjunta foi encerrado. Voce pode iniciar o processo licitatorio.',
      lida: false,
      link: `/processos/aviso-compra-conjunta/${avisoId}`,
    })
  }

  revalidatePath(`/processos/aviso-compra-conjunta/${avisoId}`)
  return { success: true }
}

export async function iniciarProcessoDoAviso(
  avisoId: string
): Promise<{ success: boolean; processoId?: string; error?: string }> {
  const ctx = await obterUsuarioEOrg()
  if (!ctx) return { success: false, error: 'Não autenticado.' }

  const { supabase } = ctx

  // Buscar aviso completo
  const resultado = await buscarAviso(avisoId)
  if (!resultado.success || !resultado.aviso) {
    return { success: false, error: resultado.error ?? 'Aviso nao encontrado.' }
  }

  const aviso = resultado.aviso

  // Consolidar itens: origem + adesões (deduplicar por aviso_item_id)
  const itensConsolidados: Array<{
    descricao: string
    unidade: string
    quantidade: number
    secretaria: string
  }> = []

  // Itens da origem
  for (const item of aviso.itens) {
    itensConsolidados.push({
      descricao: item.descricao,
      unidade: item.unidade,
      quantidade: item.quantidade_origem,
      secretaria: aviso.secretaria_origem.nome,
    })
  }

  // Itens das adesões (mesmos itens da origem + adicionais)
  for (const adesao of aviso.adesoes) {
    for (const item of adesao.itens) {
      if (item.aviso_item_id) {
        // Item existente: encontrar e somar
        const existente = itensConsolidados.find(
          i => i.descricao === item.descricao && i.unidade === item.unidade
        )
        if (existente) {
          existente.quantidade += item.quantidade
        } else {
          itensConsolidados.push({
            descricao: item.descricao,
            unidade: item.unidade,
            quantidade: item.quantidade,
            secretaria: adesao.secretaria.nome,
          })
        }
      } else {
        // Item adicional
        itensConsolidados.push({
          descricao: item.descricao,
          unidade: item.unidade,
          quantidade: item.quantidade,
          secretaria: adesao.secretaria.nome,
        })
      }
    }
  }

  // Formatar para ItemWizard (formato esperado pelo wizard)
  const itensWizard = itensConsolidados.map(item => ({
    id: crypto.randomUUID(),
    descricao: item.descricao,
    unidade: item.unidade,
    quantidade: item.quantidade,
  }))

  // Marcar aviso como processo_iniciado
  await (supabase as any)
    .from('avisos_compra_conjunta')
    .update({ status: 'processo_iniciado' })
    .eq('id', avisoId)

  // Notificar secretarias que aderiram
  for (const adesao of aviso.adesoes) {
    const { data: usuarios } = await supabase
      .from('usuarios')
      .select('id')
      .eq('secretaria_id', adesao.secretaria_id)

    if (usuarios?.length) {
      await (supabase as any).from('notificacoes').insert(
        (usuarios as Array<{ id: string }>).map(u => ({
          usuario_id: u.id,
          titulo: 'Processo licitatorio iniciado',
          mensagem: 'O processo licitatorio do Aviso de Compra Conjunta do qual sua secretaria participou foi iniciado.',
          lida: false,
          link: `/processos/aviso-compra-conjunta/${avisoId}`,
        }))
      )
    }
  }

  // Retornar dados do wizard para o client serializar no localStorage
  return {
    success: true,
    processoId: JSON.stringify({
      secretaria_id: aviso.secretaria_origem_id,
      modalidade: aviso.modalidade,
      categoria_objeto: aviso.categoria_objeto,
      itens: itensWizard,
    }),
  }
}
