'use server'

import { createServiceClient } from '@/lib/supabase/server'

interface UploadResult {
  success: boolean
  url?:    string
  error?:  string
}

/**
 * Faz upload da logo para uma org recém-criada (ativo=false).
 * Usa service client pois o usuario ainda nao esta autenticado.
 * Segurança: só atualiza orgs inativas (recém-criadas, não aprovadas).
 */
export async function uploadOrgLogoRegistro(
  orgId:    string,
  formData: FormData
): Promise<UploadResult> {
  const file = formData.get('file') as File | null
  if (!file || !orgId) return { success: false, error: 'Dados invalidos' }

  const supabase = await createServiceClient()

  // Segurança: org deve estar inativa (recém-criada, não aprovada ainda)
  const { data: org } = await supabase
    .from('organizacoes')
    .select('id')
    .eq('id', orgId)
    .eq('ativo', false)
    .maybeSingle()

  if (!org) return { success: false, error: 'Organizacao nao encontrada' }

  const bytes  = await file.arrayBuffer()
  const buffer = Buffer.from(bytes)
  const ext    = file.name.split('.').pop() ?? 'png'
  const path   = `organizacoes/${orgId}/logo.${ext}`

  const { error: storageError } = await supabase.storage
    .from('org-logos')
    .upload(path, buffer, { upsert: true, contentType: file.type })

  if (storageError) {
    console.error('[uploadOrgLogoRegistro] storage error:', storageError.message)
    return { success: false, error: 'Erro ao enviar logo.' }
  }

  const { data: { publicUrl } } = supabase.storage.from('org-logos').getPublicUrl(path)

  await supabase
    .from('organizacoes')
    .update({ brasao_url: publicUrl })
    .eq('id', orgId)

  return { success: true, url: publicUrl }
}
