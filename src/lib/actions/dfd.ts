'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import type { ProcessoLicitatorioRow } from '@/types/database'

export async function obterDFD(processoId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: dfd } = await supabase
    .from('dfd')
    .select('*')
    .eq('processo_id', processoId)
    .maybeSingle()

  if (dfd) return dfd

  // DFD não existe — cria automaticamente a partir dos dados do processo
  const { data: pRaw } = await supabase
    .from('processos_licitatorios')
    .select('*')
    .eq('id', processoId)
    .maybeSingle()

  const p = pRaw as ProcessoLicitatorioRow | null
  if (!p) return null

  const { data: usuarioRaw } = await supabase
    .from('usuarios')
    .select('nome_completo')
    .eq('id', user.id)
    .maybeSingle()

  const nomeCompleto = (usuarioRaw as any)?.nome_completo ?? ''

  const { data: novo } = await (supabase as any)
    .from('dfd')
    .insert({
      processo_id: processoId,
      organizacao_id: p.organizacao_id,
      criado_por: user.id,
      responsavel_elaboracao: nomeCompleto,
      descricao_necessidade: p.objeto,
      justificativa: '',
      status: 'rascunho',
      gerado_por_ia: false,
    })
    .select('*')
    .maybeSingle()

  return novo ?? null
}

export async function atualizarDFD(dfdId: string, dados: any) {
  const supabase = await createClient()

  const { error } = await (supabase
    .from('dfd') as any)
    .update({ ...dados, updated_at: new Date().toISOString() })
    .eq('id', dfdId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/dashboard')
  return { success: true }
}

import { executarIAComCreditos } from '@/lib/ai/wrapper'

export async function aprimorarTextoIA(textoOriginal: string, campo: string) {
  if (!textoOriginal) return { success: false as const, error: 'Texto vazio.' }

  const prompt = `Você é um especialista em licitações públicas (Lei 14.133/21).
Aprimore o texto abaixo para um DFD institucional, mantendo o sentido original, mas com um vocabulário formal e adequado à administração pública.
Campo do documento: ${campo}
Texto original fornecido pelo usuário: "${textoOriginal}"
Regra: Retorne APENAS o texto aprimorado, sem introduções, sem aspas no começo ou no fim.`

  const res = await executarIAComCreditos({
    prompt,
    tipoAcao: 'aprimorar_texto',
    temperature: 0.3
  })

  return res
}
