'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { getAssinaturaAdapter } from '@/lib/assinatura/client'
import type { ProvedorAssinatura } from '@/lib/assinatura/types'

type ActionResult<T = undefined> =
  | { success: true; data?: T }
  | { success: false; error: string }

const SLUG_POR_TABELA: Record<string, string> = {
  dfd:               'dfd',
  etp:               'etp',
  termo_referencia:  'tr',
  mapa_riscos:       'riscos',
  edital:            'edital',
  pareceres:         'parecer',
}

export async function assinarDocumento(
  tabelaOrigem: string,
  documentoId: string,
  processoId: string
): Promise<ActionResult> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Nao autenticado.' }

  const { data: usuarioRaw } = await supabase
    .from('usuarios')
    .select('id, organizacao_id, nome_completo')
    .eq('id', user.id)
    .single()

  const usuario = usuarioRaw as { id: string; organizacao_id: string; nome_completo: string } | null
  if (!usuario) return { success: false, error: 'Perfil de usuario nao encontrado.' }

  // Busca provedor de assinatura configurado na org
  const { data: orgRaw } = await (supabase as any)
    .from('organizacoes')
    .select('assinatura_config')
    .eq('id', usuario.organizacao_id)
    .maybeSingle()

  const assinaturaConfig = (orgRaw as any)?.assinatura_config as { provider?: string } | null
  const provedorEscolhido = (assinaturaConfig?.provider ?? 'interno') as ProvedorAssinatura

  const adapter = getAssinaturaAdapter(provedorEscolhido)

  const resultado = await adapter.assinar({
    documentoId,
    tabelaOrigem,
    processoId,
    usuarioId: usuario.id,
    organizacaoId: usuario.organizacao_id,
    nomeSignatario: usuario.nome_completo ?? user.email ?? 'Usuario',
    emailSignatario: user.email ?? '',
  })

  if (!resultado.sucesso) {
    return { success: false, error: resultado.erro }
  }

  // Atualiza status do documento
  const { error: updateError } = await (supabase.from(tabelaOrigem) as any)
    .update({ status: 'assinado', updated_at: new Date().toISOString() })
    .eq('id', documentoId)

  if (updateError) {
    return { success: false, error: 'Falha ao atualizar status do documento.' }
  }

  // Registra assinatura
  await (supabase.from('assinaturas') as any).insert({
    tabela_origem: tabelaOrigem,
    documento_id: documentoId,
    organizacao_id: usuario.organizacao_id,
    usuario_id: user.id,
    provedor: resultado.provedor,
    hash_documento: resultado.hashDocumento,
    timestamp_assinatura: resultado.timestampAssinatura,
    status: 'concluido',
    referencia_externa: resultado.referencia_externa ?? null,
  })

  const slug = SLUG_POR_TABELA[tabelaOrigem] ?? tabelaOrigem
  revalidatePath(`/processos/${processoId}/${slug}`)
  return { success: true }
}

export async function salvarConfigAssinatura(provedor: string): Promise<ActionResult> {
  const provedoresValidos = ['interno', 'clicksign', 'zapsign', 'govbr', 'docusign']
  if (!provedoresValidos.includes(provedor)) {
    return { success: false, error: 'Provedor invalido.' }
  }

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Sessao expirada.' }

  const { data: usuarioRaw } = await supabase
    .from('usuarios')
    .select('papel, organizacao_id')
    .eq('id', user.id)
    .maybeSingle()

  const usuario = usuarioRaw as { papel: string; organizacao_id: string } | null
  if (!usuario) return { success: false, error: 'Usuario nao encontrado.' }
  if (!['admin_organizacao', 'admin_plataforma'].includes(usuario.papel)) {
    return { success: false, error: 'Sem permissao.' }
  }

  const { error } = await (supabase.from('organizacoes') as any)
    .update({ assinatura_config: { provider: provedor } })
    .eq('id', usuario.organizacao_id)

  if (error) return { success: false, error: 'Erro ao salvar configuracao.' }

  revalidatePath('/configuracoes/assinatura-eletronica')
  return { success: true }
}