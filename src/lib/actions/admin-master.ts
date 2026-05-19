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

export async function marcarOrgCataguases(organizacaoId: string): Promise<ResultadoAdmin> {
  const supabase = await createClient()
  const admin = await verificarAdminMaster()
  if (!admin) return { success: false, error: 'Sem permissao.' }

  const { data: org } = await (supabase as any)
    .from('organizacoes')
    .select('is_demo')
    .eq('id', organizacaoId)
    .maybeSingle()

  if (org?.is_demo) return { success: false, error: 'Nao e possivel marcar a org de demo como Cataguases.' }

  // Remove flag de qualquer org que a tenha atualmente
  await (supabase as any)
    .from('organizacoes')
    .update({ is_cataguases: false })
    .eq('is_cataguases', true)

  const { error } = await (supabase as any)
    .from('organizacoes')
    .update({ is_cataguases: true })
    .eq('id', organizacaoId)

  if (error) return { success: false, error: error.message }

  revalidatePath('/admin/organizacoes')
  revalidatePath('/admin/painel-master')
  return { success: true }
}

export async function concederCreditosAdmin(
  organizacaoId: string,
  creditos: number,
  motivo: string
): Promise<ResultadoAdmin> {
  if (creditos <= 0) return { success: false, error: 'Quantidade deve ser maior que zero.' }
  if (!motivo.trim()) return { success: false, error: 'Motivo obrigatorio.' }

  const supabase = await createClient()
  const admin = await verificarAdminMaster()
  if (!admin) return { success: false, error: 'Sem permissao.' }

  // Buscar admin_organizacao da org; se nao houver, qualquer usuario ativo
  const { data: usuarios } = await (supabase as any)
    .from('usuarios')
    .select('id')
    .eq('organizacao_id', organizacaoId)
    .order('papel', { ascending: true }) // admin_organizacao < outros na ordem alfabetica
    .limit(5)

  const lista = (usuarios ?? []) as { id: string }[]
  const admOrg = lista.find((_, i) => i === 0) // pega o primeiro; ordenado por papel
  if (!admOrg) return { success: false, error: 'Nenhum usuario encontrado nessa organizacao.' }

  const { concederCreditos } = await import('@/lib/actions/creditos')
  const ref = `admin_manual_${organizacaoId}_${Date.now()}`
  const res = await concederCreditos({
    usuarioId: admOrg.id,
    creditos,
    referenciaExterna: ref,
    descricao: `Concessao manual pelo admin da plataforma: ${motivo}`,
    provedor: 'manual',
  })

  if (!res.success) return { success: false, error: (res as { success: false; error: string }).error }

  revalidatePath('/admin/creditos')
  return { success: true }
}

export async function listarOrgsComCreditos() {
  const supabase = await createClient()
  const admin = await verificarAdminMaster()
  if (!admin) return null

  const { data: orgs } = await (supabase as any)
    .from('organizacoes')
    .select('id, nome, municipio, estado, is_cataguases, is_demo')
    .order('nome')

  const { data: creditos } = await (supabase as any)
    .from('creditos_usuario')
    .select('organizacao_id, saldo')

  const saldoPorOrg: Record<string, number> = {}
  for (const c of (creditos ?? []) as { organizacao_id: string; saldo: number }[]) {
    saldoPorOrg[c.organizacao_id] = (saldoPorOrg[c.organizacao_id] ?? 0) + c.saldo
  }

  return ((orgs ?? []) as { id: string; nome: string; municipio: string; estado: string; is_cataguases: boolean; is_demo: boolean }[])
    .map(o => ({ ...o, saldo_total: saldoPorOrg[o.id] ?? 0 }))
}
