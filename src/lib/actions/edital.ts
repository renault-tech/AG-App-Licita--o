'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { executarIAComCreditos } from '@/lib/ai/wrapper'
import type { ProcessoLicitatorioRow, EditalRow, ModalidadeLicitacao } from '@/types/database'

export async function obterEdital(processoId: string) {
  const supabase = await createClient()

  const { data } = await supabase
    .from('edital')
    .select('*, processos_licitatorios(objeto, modalidade)')
    .eq('processo_id', processoId)
    .maybeSingle()

  if (data) return data

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: pRaw } = await supabase
    .from('processos_licitatorios')
    .select('*')
    .eq('id', processoId)
    .maybeSingle()

  const p = pRaw as ProcessoLicitatorioRow | null
  if (!p) return null

  const conteudo = gerarTemplateEdital(p.modalidade, p.objeto)

  const supabaseAny = supabase as any
  const { data: novo } = await supabaseAny
    .from('edital')
    .insert({
      processo_id: processoId,
      organizacao_id: p.organizacao_id,
      criado_por: user.id,
      conteudo,
      status: 'rascunho',
      gerado_por_ia: false,
    })
    .select('*, processos_licitatorios(objeto, modalidade)')
    .single()

  return novo ?? null
}

export async function atualizarEdital(editalId: string, conteudo: EditalRow['conteudo']) {
  const supabase = await createClient()
  const supabaseAny = supabase as any

  const { error } = await supabaseAny
    .from('edital')
    .update({ conteudo, updated_at: new Date().toISOString() })
    .eq('id', editalId)

  if (error) return { success: false as const, error: error.message as string }

  revalidatePath('/dashboard')
  return { success: true as const }
}

function gerarTemplateEdital(modalidade: ModalidadeLicitacao, objeto: string) {
  const tipo = modalidade.toUpperCase().replace(/_/g, ' ')
  return [
    { id: '1', titulo: 'Preâmbulo', texto: `Edital de ${tipo} para ${objeto}. Em conformidade com a Lei nº 14.133/21.` },
    { id: '2', titulo: 'Objeto', texto: `O presente edital tem por objeto a contratação de: ${objeto}.` },
    { id: '3', titulo: 'Condições de Participação', texto: 'Poderão participar os interessados que atenderem às exigências de habilitação...' },
    { id: '4', titulo: 'Apresentação das Propostas', texto: 'As propostas deverão ser apresentadas eletronicamente até a data estipulada...' },
    { id: '5', titulo: 'Julgamento das Propostas', texto: 'O critério de julgamento será o de menor preço global, conforme disposto no Termo de Referência.' },
    { id: '6', titulo: 'Habilitação', texto: 'Os documentos exigidos para habilitação jurídica, fiscal e trabalhista estão listados em anexo.' },
    { id: '7', titulo: 'Recursos', texto: 'O prazo para interposição de recursos será de 3 (três) dias úteis.' },
    { id: '8', titulo: 'Disposições Gerais', texto: 'Os casos omissos serão resolvidos pela autoridade competente.' },
  ]
}

export async function revisarEditalComIA(textoOriginal: string, modalidade: ModalidadeLicitacao) {
  if (!textoOriginal) return { success: false as const, error: 'Texto vazio.' }

  const prompt = `Você é um pregoeiro experiente baseando-se na Lei 14.133/21.
Aprimore e refine a cláusula do edital abaixo, considerando que a modalidade do processo é: ${modalidade}.
Texto original da cláusula: "${textoOriginal}"

Ajuste a linguagem para o padrão jurídico formal de editais públicos. Retorne EXCLUSIVAMENTE o texto final aprimorado. Sem aspas iniciais/finais.`

  return executarIAComCreditos({ prompt, tipoAcao: 'aprimorar_texto', temperature: 0.2 })
}
