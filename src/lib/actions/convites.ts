'use server'

import { z } from 'zod'
import { createClient, createServiceClient } from '@/lib/supabase/server'
import { enviarConvitePrefeitura } from '@/lib/email/send'
import { revalidatePath } from 'next/cache'

export interface Convite {
  id: string
  token: string
  email_destino: string
  nome_prefeitura: string | null
  municipio: string | null
  estado: string | null
  status: 'pendente' | 'aceito' | 'revogado' | 'expirado'
  expires_at: string
  created_at: string
  accepted_at: string | null
}

const SchemaConvite = z.object({
  email:          z.string().email('E-mail invalido'),
  nomePrefeitura: z.string().min(3).max(200).optional(),
  municipio:      z.string().max(100).optional(),
  estado:         z.string().length(2, 'UF deve ter 2 caracteres').optional(),
})

export async function criarConvite(
  input: z.infer<typeof SchemaConvite>
): Promise<{ success: boolean; error?: string }> {
  const parsed = SchemaConvite.safeParse(input)
  if (!parsed.success) return { success: false, error: parsed.error.issues[0].message }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Nao autenticado.' }

  const { data: usuarioData } = await (supabase as any)
    .from('usuarios')
    .select('papel')
    .eq('id', user.id)
    .maybeSingle()

  if ((usuarioData as any)?.papel !== 'admin_plataforma') {
    return { success: false, error: 'Sem permissao.' }
  }

  const { data: convite, error: dbError } = await (supabase as any)
    .from('convites_organizacao')
    .insert({
      criado_por:      user.id,
      email_destino:   parsed.data.email,
      nome_prefeitura: parsed.data.nomePrefeitura ?? null,
      municipio:       parsed.data.municipio ?? null,
      estado:          parsed.data.estado ?? null,
    })
    .select('token')
    .single()

  if (dbError || !convite) {
    return { success: false, error: dbError?.message ?? 'Erro ao criar convite.' }
  }

  const emailResult = await enviarConvitePrefeitura({
    email:          parsed.data.email,
    nomePrefeitura: parsed.data.nomePrefeitura,
    municipio:      parsed.data.municipio,
    estado:         parsed.data.estado,
    token:          (convite as any).token,
  })

  if (!emailResult.success) {
    return { success: false, error: `Convite criado mas e-mail falhou: ${emailResult.error}` }
  }

  revalidatePath('/configuracoes/convites')
  return { success: true }
}

export async function listarConvites(): Promise<Convite[]> {
  const supabase = await createClient()

  const { data } = await (supabase as any)
    .from('convites_organizacao')
    .select('id, token, email_destino, nome_prefeitura, municipio, estado, status, expires_at, created_at, accepted_at')
    .order('created_at', { ascending: false })
    .limit(50)

  return ((data as Convite[]) ?? []).map((c) => ({
    ...c,
    status: new Date(c.expires_at) < new Date() && c.status === 'pendente' ? 'expirado' : c.status,
  }))
}

export async function revogarConvite(id: string): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()

  const { error } = await (supabase as any)
    .from('convites_organizacao')
    .update({ status: 'revogado' })
    .eq('id', id)
    .eq('status', 'pendente')

  if (error) return { success: false, error: error.message }
  revalidatePath('/configuracoes/convites')
  return { success: true }
}

export async function validarConvite(token: string): Promise<{
  valido: boolean
  convite?: Convite
  error?: string
}> {
  // Usa service client pois o usuario nao tem sessao ainda
  const supabase = await createServiceClient()

  const { data } = await (supabase as any)
    .from('convites_organizacao')
    .select('id, token, email_destino, nome_prefeitura, municipio, estado, status, expires_at, created_at, accepted_at')
    .eq('token', token)
    .maybeSingle()

  if (!data) return { valido: false, error: 'Convite nao encontrado.' }

  const convite = data as Convite
  if (convite.status === 'aceito')   return { valido: false, error: 'Este convite ja foi utilizado.' }
  if (convite.status === 'revogado') return { valido: false, error: 'Este convite foi revogado.' }
  if (new Date(convite.expires_at) < new Date()) {
    return { valido: false, error: 'Este convite expirou. Solicite um novo convite ao administrador.' }
  }

  return { valido: true, convite }
}

export async function marcarConviteAceito(token: string): Promise<void> {
  const supabase = await createServiceClient()
  await (supabase as any)
    .from('convites_organizacao')
    .update({ status: 'aceito', accepted_at: new Date().toISOString() })
    .eq('token', token)
}
