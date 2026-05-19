'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

interface ResultadoAdmin { success: boolean; error?: string }

async function verificarAdminMaster() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: usuario } = await (supabase as any)
    .from('usuarios')
    .select('id, papel, organizacao_id')
    .eq('id', user.id)
    .maybeSingle()
  if (!usuario || usuario.papel !== 'admin_plataforma') return null
  return usuario as { id: string; papel: string; organizacao_id: string }
}

export async function listarOrganizacoes() {
  const supabase = await createClient()
  const admin = await verificarAdminMaster()
  if (!admin) return { data: null, error: 'Sem permissao.' }

  const { data, error } = await (supabase as any)
    .from('organizacoes')
    .select('id, nome, cnpj, municipio, estado, ativo, is_demo, is_cataguases, created_at')
    .order('nome')

  if (error) return { data: null, error: (error as any).message }
  return { data, error: null }
}

export async function ativarOrganizacao(organizacaoId: string): Promise<ResultadoAdmin> {
  const supabase = await createClient()
  const admin = await verificarAdminMaster()
  if (!admin) return { success: false, error: 'Sem permissao.' }

  const { error: orgError } = await (supabase as any)
    .from('organizacoes')
    .update({ ativo: true })
    .eq('id', organizacaoId)

  if (orgError) return { success: false, error: (orgError as any).message }

  const { data: adminOrg } = await (supabase as any)
    .from('usuarios')
    .select('id, nome_completo')
    .eq('organizacao_id', organizacaoId)
    .eq('papel', 'admin_organizacao')
    .eq('status_aprovacao', 'aguardando_aprovacao')
    .order('created_at')
    .limit(1)
    .maybeSingle()

  if (adminOrg) {
    await (supabase as any)
      .from('usuarios')
      .update({ status_aprovacao: 'ativo', ativo: true })
      .eq('id', adminOrg.id)

    await (supabase as any).from('notificacoes').insert({
      usuario_id: adminOrg.id,
      organizacao_id: organizacaoId,
      titulo: 'Sua prefeitura foi ativada!',
      mensagem: 'Voce ja pode configurar sua prefeitura e convidar usuarios.',
      lida: false,
      link: '/dashboard',
    })
  }

  revalidatePath('/admin/painel-master')
  return { success: true }
}

export async function suspenderOrganizacao(
  organizacaoId: string,
  motivo: string
): Promise<ResultadoAdmin> {
  if (!motivo.trim()) return { success: false, error: 'Motivo obrigatorio.' }
  const supabase = await createClient()
  const admin = await verificarAdminMaster()
  if (!admin) return { success: false, error: 'Sem permissao.' }

  const { data: org } = await (supabase as any)
    .from('organizacoes')
    .select('is_demo, is_cataguases')
    .eq('id', organizacaoId)
    .maybeSingle()

  if (org?.is_demo || org?.is_cataguases) {
    return { success: false, error: 'Nao e possivel suspender organizacoes de sistema.' }
  }

  const { error } = await (supabase as any)
    .from('organizacoes')
    .update({ ativo: false })
    .eq('id', organizacaoId)

  if (error) return { success: false, error: (error as any).message }

  revalidatePath('/admin/painel-master')
  return { success: true }
}

export async function buscarMetricasGlobais() {
  const supabase = await createClient()
  const admin = await verificarAdminMaster()
  if (!admin) return null

  const [orgsResult, usuariosResult, processosResult] = await Promise.all([
    supabase.from('organizacoes').select('id, ativo', { count: 'exact' }),
    supabase.from('usuarios').select('id, ativo', { count: 'exact' }),
    (supabase as any).from('processos_licitatorios').select('id', { count: 'exact' }),
  ])

  return {
    totalOrgs: orgsResult.count ?? 0,
    orgsAtivas: (orgsResult.data?.filter((o: { ativo: boolean }) => o.ativo).length) ?? 0,
    totalUsuarios: usuariosResult.count ?? 0,
    usuariosAtivos: (usuariosResult.data?.filter((u: { ativo: boolean }) => u.ativo).length) ?? 0,
    totalProcessos: processosResult.count ?? 0,
  }
}

export async function buscarOrgCataguases() {
  const supabase = await createClient()
  const { data } = await (supabase as any)
    .from('organizacoes')
    .select('id, nome')
    .eq('is_cataguases', true)
    .maybeSingle()
  return data as { id: string; nome: string } | null
}

export async function buscarOrgDemo() {
  const supabase = await createClient()
  const { data } = await (supabase as any)
    .from('organizacoes')
    .select('id, nome')
    .eq('is_demo', true)
    .maybeSingle()
  return data as { id: string; nome: string } | null
}
