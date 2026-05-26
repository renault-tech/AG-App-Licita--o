'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { executarIAComCreditos } from '@/lib/ai/wrapper'
import { registrarAuditoria } from '@/lib/audit/log'
import type { ProcessoLicitatorioRow, ETPRow } from '@/types/database'

export async function obterETP(processoId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('etp')
    .select('*')
    .eq('processo_id', processoId)
    .maybeSingle()

  if (data) return data as ETPRow

  const { data: pRaw } = await supabase
    .from('processos_licitatorios')
    .select('organizacao_id')
    .eq('id', processoId)
    .maybeSingle()

  const p = pRaw as Pick<ProcessoLicitatorioRow, 'organizacao_id'> | null
  if (!p) return null

  const supabaseAny = supabase as any
  const { data: nova } = await supabaseAny
    .from('etp')
    .insert({
      processo_id: processoId,
      organizacao_id: p.organizacao_id,
      criado_por: user.id,
      status: 'rascunho',
      gerado_por_ia: false,
    })
    .select('*')
    .single()

  return (nova ?? null) as ETPRow | null
}

export async function atualizarETP(etpId: string, dados: Partial<ETPRow>) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false as const, error: 'Nao autenticado.' }

  const { data: usuarioData } = await supabase
    .from('usuarios')
    .select('id, nome_completo, papel, organizacao_id')
    .eq('id', user.id)
    .maybeSingle()

  const supabaseAny = supabase as any

  const { error } = await supabaseAny
    .from('etp')
    .update({ ...dados, updated_at: new Date().toISOString() })
    .eq('id', etpId)

  if (error) return { success: false as const, error: error.message as string }

  if (usuarioData) {
    const u = usuarioData as any
    void registrarAuditoria({
      organizacaoId: u.organizacao_id,
      usuarioId:     user.id,
      nomeUsuario:   u.nome_completo,
      papelUsuario:  u.papel,
      categoria:     'documento',
      acao:          'etp.editado',
      recursoId:     etpId,
    })
  }

  revalidatePath('/dashboard')
  return { success: true as const }
}

export async function aprimorarETPComIA(textoOriginal: string, campo: string) {
  if (!textoOriginal) return { success: false as const, error: 'Texto vazio.' }

  const prompt = `Você é um especialista em licitações públicas (Lei 14.133/21).
Aprimore o texto abaixo para um Estudo Técnico Preliminar (ETP) governamental (Art. 18).
Campo do ETP: ${campo}
Texto original: "${textoOriginal}"

Retorne APENAS o texto aprimorado, utilizando vocabulário administrativo e formal. Sem aspas, sem introduções.`

  return executarIAComCreditos({ prompt, tipoAcao: 'aprimorar_texto', temperature: 0.3 })
}
