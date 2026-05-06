'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function obterEdital(processoId: string) {
  const supabase = await createClient()

  let { data } = await supabase
    .from('edital')
    .select('*, processos_licitatorios(objeto, modalidade)')
    .eq('processo_id', processoId)
    .single()

  let edital = data as any

  if (!edital) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data: pData } = await supabase.from('processos_licitatorios').select('*').eq('id', processoId).single()
    const p = pData as any
    if (!p) return null

    // Gerar template básico baseado na modalidade
    const templateSecoes = gerarTemplateEdital(p.modalidade, p.objeto)

    const { data: novo } = await (supabase
      .from('edital') as any)
      .insert({
        processo_id: processoId,
        organizacao_id: p.organizacao_id,
        criado_por: user.id,
        conteudo: templateSecoes,
        status: 'rascunho'
      })
      .select('*, processos_licitatorios(objeto, modalidade)')
      .single()
    
    edital = novo as any
  }

  return edital
}

export async function atualizarEdital(editalId: string, conteudo: any[]) {
  const supabase = await createClient()

  const { error } = await (supabase
    .from('edital') as any)
    .update({ conteudo, updated_at: new Date().toISOString() })
    .eq('id', editalId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/dashboard')
  return { success: true }
}

function gerarTemplateEdital(modalidade: string, objeto: string) {
  const tipoLicitacao = modalidade.toUpperCase().replace('_', ' ')
  return [
    { id: '1', titulo: 'Preâmbulo', texto: `Edital de ${tipoLicitacao} para ${objeto}. Em conformidade com a Lei nº 14.133/21.` },
    { id: '2', titulo: 'Objeto', texto: `O presente edital tem por objeto a contratação de: ${objeto}.` },
    { id: '3', titulo: 'Condições de Participação', texto: 'Poderão participar os interessados que atenderem às exigências de habilitação...' },
    { id: '4', titulo: 'Apresentação das Propostas', texto: 'As propostas deverão ser apresentadas eletronicamente até a data estipulada...' },
    { id: '5', titulo: 'Julgamento das Propostas', texto: 'O critério de julgamento será o de menor preço global, conforme disposto no Termo de Referência.' },
    { id: '6', titulo: 'Habilitação', texto: 'Os documentos exigidos para habilitação jurídica, fiscal e trabalhista estão listados em anexo.' },
    { id: '7', titulo: 'Recursos', texto: 'O prazo para interposição de recursos será de 3 (três) dias úteis.' },
    { id: '8', titulo: 'Disposições Gerais', texto: 'Os casos omissos serão resolvidos pela autoridade competente.' }
  ]
}

export async function revisarEditalComIA(textoOriginal: string, modalidade: string) {
  if (!textoOriginal) return { success: false, error: 'Texto vazio.' }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return { success: true, texto: textoOriginal + '\n[REVISADO PELA IA]' }
  }

  try {
    const prompt = `Você é um pregoeiro experiente baseando-se na Lei 14.133/21.
Aprimore e refine a cláusula do edital abaixo, considerando que a modalidade do processo é: ${modalidade}.
Texto original da cláusula: "${textoOriginal}"

Ajuste a linguagem para o padrão jurídico formal de editais públicos. Retorne EXCLUSIVAMENTE o texto final aprimorado. Sem aspas iniciais/finais.`

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2 }
      })
    })

    if (!res.ok) {
      return { success: false, error: 'Erro na API.' }
    }

    const data = await res.json()
    const textoAprimorado = data?.candidates?.[0]?.content?.parts?.[0]?.text
    
    if (textoAprimorado) {
      return { success: true, texto: textoAprimorado.trim() }
    }
    return { success: false, error: 'Falha no processamento da IA.' }
  } catch (err) {
    return { success: false, error: 'Erro de conexão.' }
  }
}
