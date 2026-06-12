'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { registrarAuditoria } from '@/lib/audit/log'
import type { StatusParecer, ProcessoLicitatorioRow } from '@/types/database'

export async function obterParecer(processoId: string) {
  const supabase = await createClient()

  const { data } = await supabase
    .from('pareceres')
    .select('*, processos_licitatorios(objeto)')
    .eq('processo_id', processoId)
    .maybeSingle()

  if (data) return data

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: pRaw } = await supabase
    .from('processos_licitatorios')
    .select('*')
    .eq('id', processoId)
    .single()

  const p = pRaw as ProcessoLicitatorioRow | null
  if (!p) return null

  const supabaseAny = supabase as any
  const { data: novo } = await supabaseAny
    .from('pareceres')
    .insert({
      processo_id: processoId,
      organizacao_id: p.organizacao_id,
      procurador_id: user.id,
      status: 'pendente' as StatusParecer,
      conteudo: '',
      gerado_por_ia: false,
    })
    .select('*, processos_licitatorios(objeto)')
    .single()

  return novo ?? null
}

export async function salvarParecer(parecerId: string, conteudo: string, status: StatusParecer) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Nao autenticado.' }

  const { data: usuarioData } = await supabase
    .from('usuarios')
    .select('id, nome_completo, papel, organizacao_id')
    .eq('id', user.id)
    .maybeSingle()

  const supabaseAny = supabase as any

  const { error } = await supabaseAny
    .from('pareceres')
    .update({ conteudo, status, updated_at: new Date().toISOString() })
    .eq('id', parecerId)

  if (error) return { success: false, error: error.message as string }

  if (usuarioData) {
    const u = usuarioData as any
    const acaoFinal = status === 'aprovado'
      ? 'parecer.aprovado'
      : status === 'devolvido'
      ? 'parecer.devolvido'
      : 'parecer.editado'
    void registrarAuditoria({
      organizacaoId: u.organizacao_id,
      usuarioId:     user.id,
      nomeUsuario:   u.nome_completo,
      papelUsuario:  u.papel,
      categoria:     'documento',
      acao:          acaoFinal,
      recursoId:     parecerId,
    })
  }

  revalidatePath('/dashboard')
  return { success: true }
}

// A geracao de minuta de parecer via IA fica em procuradoria.ts (gerarMinutaIA),
// que recebe o veredito decidido pelo procurador. Conforme o Art. 53 da Lei 14.133/21,
// a conclusao juridica e ato privativo do procurador; a IA apenas redige a minuta
// a partir da decisao humana, nunca o contrario.
