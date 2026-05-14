'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { executarIAComCreditos } from '@/lib/ai/wrapper'

// -----------------------------------------------------------------------
// Ofício de Abertura do Processo Licitatório
// Documento administrativo que formaliza a abertura perante a Procuradoria
// e demais instâncias — Módulo 9 (Lei 14.133/21)
// -----------------------------------------------------------------------

export interface OficioData {
  id: string
  processo_id: string
  organizacao_id: string
  numero_oficio: string
  destinatario_nome: string
  destinatario_cargo: string
  assunto: string
  corpo: string
  emitente_nome: string
  emitente_cargo: string
  local_data: string
  status: string
  gerado_por_ia: boolean
  created_at: string
  updated_at: string
}

export async function obterOficio(processoId: string): Promise<OficioData | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await (supabase as any)
    .from('oficios_abertura')
    .select('*')
    .eq('processo_id', processoId)
    .maybeSingle()

  if (data) return data as OficioData

  const { data: processo } = await (supabase as any)
    .from('processos_licitatorios')
    .select('objeto, organizacao_id, numero_processo, modalidade')
    .eq('id', processoId)
    .maybeSingle()

  if (!processo) return null

  const { data: usuarioData } = await supabase
    .from('usuarios')
    .select('nome_completo, cargo')
    .eq('id', user.id)
    .maybeSingle()

  const usuario = usuarioData as { nome_completo: string; cargo: string } | null

  // Número de ofício padrão
  const anoAtual = new Date().getFullYear()
  const numeroOficio = `OF. Nº ${String(Math.floor(Math.random() * 900) + 100)}/${anoAtual}`

  const { data: nova } = await (supabase as any)
    .from('oficios_abertura')
    .insert({
      processo_id:        processoId,
      organizacao_id:     processo.organizacao_id,
      numero_oficio:      numeroOficio,
      destinatario_nome:  '',
      destinatario_cargo: 'Procurador(a) Municipal',
      assunto:            `Abertura de Processo Licitatório — ${processo.objeto}`,
      corpo:              '',
      emitente_nome:      usuario?.nome_completo ?? '',
      emitente_cargo:     usuario?.cargo ?? '',
      local_data:         '',
      status:             'rascunho',
      gerado_por_ia:      false,
      criado_por:         user.id,
    })
    .select('*')
    .single()

  return (nova ?? null) as OficioData | null
}

export async function atualizarOficio(
  oficioId: string,
  dados: Partial<Pick<OficioData, 'numero_oficio' | 'destinatario_nome' | 'destinatario_cargo' | 'assunto' | 'corpo' | 'emitente_nome' | 'emitente_cargo' | 'local_data'>>
): Promise<{ success: true } | { success: false; error: string }> {
  const supabase = await createClient()
  const { error } = await (supabase as any)
    .from('oficios_abertura')
    .update({ ...dados, updated_at: new Date().toISOString() })
    .eq('id', oficioId)

  if (error) return { success: false, error: error.message }
  revalidatePath('/processos')
  return { success: true }
}

export async function gerarCorpoOficioIA(
  objeto: string,
  modalidade: string,
  destinatario: string,
  processoId: string
): Promise<{ success: true; texto: string } | { success: false; error: string }> {
  if (!objeto) return { success: false, error: 'Objeto não informado.' }

  const prompt = `Você é um servidor público especializado em licitações (Lei 14.133/21).
Redija o corpo de um Ofício de Abertura de Processo Licitatório.
Objeto: ${objeto}
Modalidade: ${modalidade}
Destinatário: ${destinatario || 'Procurador(a) Municipal'}

O ofício deve:
1. Comunicar formalmente a abertura do processo licitatório
2. Referenciar os documentos preparatórios (DFD, ETP, TR, Edital)
3. Solicitar a emissão do Parecer Jurídico conforme Art. 53 da Lei 14.133/21
4. Utilizar linguagem administrativa formal e objetiva

Retorne APENAS o corpo do ofício (sem numeração, sem destinatário, sem assinatura). Texto corrido, formal.`

  return executarIAComCreditos({ prompt, tipoAcao: 'gerar_documento', processoId, temperature: 0.3 })
}
