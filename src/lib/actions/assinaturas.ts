'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function assinarDocumento(tabelaOrigem: string, documentoId: string, processoId: string) {
  const supabase = await createClient()

  // 1. Pegar usuário e permissões
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Usuário não autenticado.' }

  const { data } = await supabase
    .from('usuarios')
    .select('*')
    .eq('id', user.id)
    .single()
  const userData = data as any

  if (!userData) return { success: false, error: 'Usuário sem organização.' }

  // 2. Criar Hash simples mockado (MVP)
  const hashDocumento = 'hash_simulado_' + Date.now().toString(16)

  // 3. Atualizar o status do documento para 'assinado'
  // Nota: Precisamos rodar um SQL dinâmico ou usar a lib do supabase com tipagem loose
  const { error: updateError } = await (supabase
    .from(tabelaOrigem) as any)
    .update({ status: 'assinado', updated_at: new Date().toISOString() })
    .eq('id', documentoId)

  if (updateError) {
    return { success: false, error: 'Falha ao atualizar status do documento: ' + updateError.message }
  }

  // 4. Inserir registro na tabela de assinaturas
  const { error: insertError } = await (supabase
    .from('assinaturas') as any)
    .insert({
      tabela_origem: tabelaOrigem,
      documento_id: documentoId,
      organizacao_id: userData.organizacao_id,
      usuario_id: user.id,
      provedor: 'interno',
      hash_documento: hashDocumento,
      timestamp_assinatura: new Date().toISOString(),
      status: 'concluido'
    })

  if (insertError) {
    // Fazer rollback manual se necessário, mas para MVP vamos apenas reportar
    return { success: false, error: 'Falha ao registrar assinatura: ' + insertError.message }
  }

  revalidatePath(`/processos/${processoId}/${tabelaOrigem === 'termo_referencia' ? 'tr' : tabelaOrigem}`)
  return { success: true }
}
