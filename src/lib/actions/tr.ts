'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { executarIAComCreditos } from '@/lib/ai/wrapper'
import { buildPromptMelhorarCampo } from '@/lib/ai/prompts/melhorar-campo'
import { registrarAuditoria } from '@/lib/audit/log'
import type { ProcessoLicitatorioRow, TermoReferenciaRow } from '@/types/database'

export async function obterTR(processoId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('termo_referencia')
    .select('*')
    .eq('processo_id', processoId)
    .maybeSingle()

  if (data) return data as TermoReferenciaRow

  const { data: pRaw } = await supabase
    .from('processos_licitatorios')
    .select('organizacao_id')
    .eq('id', processoId)
    .maybeSingle()

  const p = pRaw as Pick<ProcessoLicitatorioRow, 'organizacao_id'> | null
  if (!p) return null

  const supabaseAny = supabase as any
  const { data: nova } = await supabaseAny
    .from('termo_referencia')
    .insert({
      processo_id: processoId,
      organizacao_id: p.organizacao_id,
      criado_por: user.id,
      status: 'rascunho',
      gerado_por_ia: false,
    })
    .select('*')
    .single()

  return (nova ?? null) as TermoReferenciaRow | null
}

export async function atualizarTR(trId: string, dados: Partial<TermoReferenciaRow>) {
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
    .from('termo_referencia')
    .update({ ...dados, updated_at: new Date().toISOString() })
    .eq('id', trId)

  if (error) return { success: false as const, error: error.message as string }

  if (usuarioData) {
    const u = usuarioData as any
    void registrarAuditoria({
      organizacaoId: u.organizacao_id,
      usuarioId:     user.id,
      nomeUsuario:   u.nome_completo,
      papelUsuario:  u.papel,
      categoria:     'documento',
      acao:          'tr.editado',
      recursoId:     trId,
    })
  }

  revalidatePath('/dashboard')
  return { success: true as const }
}

export async function aprimorarTRComIA(textoOriginal: string, campo: string, processoId?: string) {
  if (!textoOriginal) return { success: false as const, error: 'Texto vazio.' }

  let dadosProcesso: { objeto?: string; modalidade?: string; valorEstimado?: number } | undefined
  if (processoId) {
    const supabase = await createClient()
    const { data } = await supabase
      .from('processos_licitatorios')
      .select('objeto, modalidade, valor_estimado')
      .eq('id', processoId)
      .maybeSingle()
    const proc = data as { objeto: string; modalidade: string; valor_estimado: number | null } | null
    if (proc) {
      dadosProcesso = {
        objeto: proc.objeto,
        modalidade: proc.modalidade,
        valorEstimado: proc.valor_estimado ?? undefined,
      }
    }
  }

  const prompt = buildPromptMelhorarCampo({
    nomeCampo: campo,
    documentoContexto: 'Termo de Referencia (TR)',
    artigo: 'Art. 6, XXIII da Lei 14.133/21',
    textoAtual: textoOriginal,
    dadosProcesso,
  })

  return executarIAComCreditos({ prompt, tipoAcao: 'aprimorar_texto', processoId, temperature: 0.2 })
}
