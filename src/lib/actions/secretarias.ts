'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'

const SecretariaSchema = z.object({
  nome: z.string().min(2, 'Nome deve ter ao menos 2 caracteres'),
  sigla: z.string().max(10).optional(),
  responsavel: z.string().optional(),
  ativo: z.boolean().default(true),
})

interface Resultado<T = void> {
  success: boolean
  data?: T
  error?: string
}

async function obterAdminOuRedirecionar() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('usuarios')
    .select('id, papel, organizacao_id')
    .eq('id', user.id)
    .maybeSingle()

  const u = data as { id: string; papel: string; organizacao_id: string } | null
  if (!u) return null
  if (!['admin_organizacao', 'admin_plataforma'].includes(u.papel)) return null
  return u
}

export async function listarSecretarias() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return []

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('organizacao_id')
    .eq('id', user.id)
    .maybeSingle()

  if (!usuario) return []

  const { data } = await (supabase as any)
    .from('secretarias')
    .select('id, nome, sigla, responsavel, ativo')
    .eq('organizacao_id', (usuario as any).organizacao_id)
    .order('nome')

  return (data ?? []) as Array<{
    id: string
    nome: string
    sigla: string | null
    responsavel: string | null
    ativo: boolean
  }>
}

export async function criarSecretaria(
  formData: FormData
): Promise<Resultado<{ id: string }>> {
  const admin = await obterAdminOuRedirecionar()
  if (!admin) return { success: false, error: 'Sem permissao.' }

  const parsed = SecretariaSchema.safeParse({
    nome: formData.get('nome'),
    sigla: formData.get('sigla') || undefined,
    responsavel: formData.get('responsavel') || undefined,
    ativo: true,
  })
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message }

  const supabase = await createClient()
  const { data, error } = await (supabase as any)
    .from('secretarias')
    .insert({ ...parsed.data, organizacao_id: admin.organizacao_id })
    .select('id')
    .single()

  if (error) return { success: false, error: error.message }

  revalidatePath('/configuracoes/secretarias')
  return { success: true, data: { id: data.id } }
}

export async function atualizarSecretaria(
  id: string,
  formData: FormData
): Promise<Resultado> {
  const admin = await obterAdminOuRedirecionar()
  if (!admin) return { success: false, error: 'Sem permissao.' }

  const parsed = SecretariaSchema.safeParse({
    nome: formData.get('nome'),
    sigla: formData.get('sigla') || undefined,
    responsavel: formData.get('responsavel') || undefined,
    ativo: formData.get('ativo') === 'true',
  })
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message }

  const supabase = await createClient()
  const { error } = await (supabase as any)
    .from('secretarias')
    .update(parsed.data)
    .eq('id', id)
    .eq('organizacao_id', admin.organizacao_id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/configuracoes/secretarias')
  return { success: true }
}

export async function alternarAtivoSecretaria(
  id: string,
  ativo: boolean
): Promise<Resultado> {
  const admin = await obterAdminOuRedirecionar()
  if (!admin) return { success: false, error: 'Sem permissao.' }

  const supabase = await createClient()
  const { error } = await (supabase as any)
    .from('secretarias')
    .update({ ativo })
    .eq('id', id)
    .eq('organizacao_id', admin.organizacao_id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/configuracoes/secretarias')
  return { success: true }
}

export async function excluirSecretaria(id: string): Promise<Resultado> {
  const admin = await obterAdminOuRedirecionar()
  if (!admin) return { success: false, error: 'Sem permissao.' }

  const supabase = await createClient()

  // Verifica se secretaria esta em uso em algum processo
  const { data: emUso } = await (supabase as any)
    .from('secretarias_envolvidas')
    .select('processo_id')
    .eq('secretaria_id', id)
    .limit(1)

  if (emUso && (emUso as any[]).length > 0) {
    return {
      success: false,
      error: 'Esta secretaria esta vinculada a processos existentes e nao pode ser excluida. Desative-a em vez disso.',
    }
  }

  const { error } = await (supabase as any)
    .from('secretarias')
    .delete()
    .eq('id', id)
    .eq('organizacao_id', admin.organizacao_id)

  if (error) return { success: false, error: error.message }

  revalidatePath('/configuracoes/secretarias')
  return { success: true }
}
