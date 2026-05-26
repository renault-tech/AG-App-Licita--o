'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { executarIAComCreditos } from '@/lib/ai/wrapper'
import { registrarAuditoria } from '@/lib/audit/log'
import type { StatusParecer, ProcessoLicitatorioRow, TermoReferenciaRow } from '@/types/database'

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

export async function gerarParecerIA(processoId: string) {
  const supabase = await createClient()

  const { data: procRaw } = await supabase
    .from('processos_licitatorios')
    .select('objeto, modalidade')
    .eq('id', processoId)
    .single()

  const proc = procRaw as Pick<ProcessoLicitatorioRow, 'objeto' | 'modalidade'> | null

  const { data: trRaw } = await supabase
    .from('termo_referencia')
    .select('fundamentacao, modelo_execucao')
    .eq('processo_id', processoId)
    .maybeSingle()

  const tr = trRaw as Pick<TermoReferenciaRow, 'fundamentacao' | 'modelo_execucao'> | null

  const prompt = `Você é um Procurador Jurídico Municipal. Analise os seguintes dados do processo licitatório e redija um PARECER JURÍDICO em conformidade com a Lei 14.133/21.

Dados do Processo:
- Objeto: ${proc?.objeto ?? 'Não informado'}
- Modalidade: ${proc?.modalidade ?? 'Não informada'}
- Fundamentação (TR): ${tr?.fundamentacao ?? 'Padrão'}
- Modelo de Execução: ${tr?.modelo_execucao ?? 'Padrão'}

O parecer deve ter uma estrutura formal: Ementa, Relatório, Fundamentação Jurídica e Conclusão.
A conclusão deve ser favorável (aprovando o prosseguimento do processo).
Retorne EXCLUSIVAMENTE o texto do parecer, sem saudações ou explicações adicionais.`

  const resultado = await executarIAComCreditos({
    prompt,
    tipoAcao: 'gerar_documento',
    processoId,
    temperature: 0.3,
  })

  if (!resultado.success) return resultado
  return { success: true as const, conteudo: resultado.texto, statusSugerido: 'aprovado' as StatusParecer }
}
