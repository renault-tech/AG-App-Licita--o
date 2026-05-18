'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
export type StatusPublicacao = 'publicado' | 'suspenso' | 'cancelado' | 'encerrado'

export interface PublicacaoRow {
  id: string
  processo_id: string
  organizacao_id: string
  publicado_por: string
  pncp_numero: string | null
  pncp_url: string | null
  diario_oficial: string | null
  portal_proprio: string | null
  data_publicacao: string
  data_abertura: string | null
  status: StatusPublicacao
  observacoes: string | null
  created_at: string
}

export interface DadosPublicacao {
  pncp_numero?: string
  pncp_url?: string
  diario_oficial?: string
  portal_proprio?: string
  data_publicacao: string
  data_abertura?: string
  observacoes?: string
}

interface Resultado {
  success: boolean
  error?: string
}

async function obterUsuarioSetor() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('id, papel, organizacao_id, nome_completo')
    .eq('id', user.id)
    .maybeSingle()

  const u = usuario as { id: string; papel: string; organizacao_id: string; nome_completo: string } | null
  if (!u) return null

  const papeis = ['setor_licitacao', 'gestor_publico', 'admin_organizacao', 'admin_plataforma']
  if (!papeis.includes(u.papel)) return null
  return u
}

export async function obterPublicacao(processoId: string): Promise<PublicacaoRow | null> {
  const supabase = await createClient()

  const { data } = await (supabase as any)
    .from('publicacoes')
    .select('*')
    .eq('processo_id', processoId)
    .maybeSingle()

  return data as PublicacaoRow | null
}

export async function registrarPublicacao(
  processoId: string,
  dados: DadosPublicacao
): Promise<Resultado> {
  const supabase = await createClient()
  const usuario = await obterUsuarioSetor()
  if (!usuario) return { success: false, error: 'Sem permissao para publicar processos.' }

  // Valida que ha autorizacao
  const { data: autorizacao } = await (supabase as any)
    .from('autorizacoes')
    .select('status')
    .eq('processo_id', processoId)
    .maybeSingle()

  if (!autorizacao || autorizacao.status !== 'autorizado') {
    return { success: false, error: 'O processo precisa de autorizacao da autoridade competente antes da publicacao.' }
  }

  const agora = new Date().toISOString()
  const { error } = await (supabase as any)
    .from('publicacoes')
    .upsert({
      processo_id:    processoId,
      organizacao_id: usuario.organizacao_id,
      publicado_por:  usuario.id,
      pncp_numero:    dados.pncp_numero || null,
      pncp_url:       dados.pncp_url || null,
      diario_oficial: dados.diario_oficial || null,
      portal_proprio: dados.portal_proprio || null,
      data_publicacao: dados.data_publicacao,
      data_abertura:  dados.data_abertura || null,
      observacoes:    dados.observacoes || null,
      status:         'publicado',
      updated_at:     agora,
    }, { onConflict: 'processo_id' })

  if (error) return { success: false, error: error.message }

  // Atualiza status do processo
  await (supabase as any)
    .from('processos_licitatorios')
    .update({ status: 'publicado', updated_at: agora })
    .eq('id', processoId)

  revalidatePath(`/processos/${processoId}`)
  return { success: true }
}

export async function atualizarStatusPublicacao(
  processoId: string,
  status: StatusPublicacao,
  observacoes?: string
): Promise<Resultado> {
  const supabase = await createClient()
  const usuario = await obterUsuarioSetor()
  if (!usuario) return { success: false, error: 'Sem permissao.' }

  const agora = new Date().toISOString()
  const { error } = await (supabase as any)
    .from('publicacoes')
    .update({ status, observacoes: observacoes || null, updated_at: agora })
    .eq('processo_id', processoId)

  if (error) return { success: false, error: error.message }

  // Espelha status no processo quando suspenso ou cancelado
  if (status === 'suspenso' || status === 'cancelado') {
    await (supabase as any)
      .from('processos_licitatorios')
      .update({ status: 'em_revisao', updated_at: agora })
      .eq('id', processoId)
  }

  revalidatePath(`/processos/${processoId}`)
  return { success: true }
}
