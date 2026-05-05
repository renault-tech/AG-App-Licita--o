'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { StatusParecer } from '@/types/database'

export async function obterParecer(processoId: string) {
  const supabase = await createClient()

  let { data: parecer } = await supabase
    .from('pareceres')
    .select('*, processos_licitatorios(objeto)')
    .eq('processo_id', processoId)
    .single()

  if (!parecer) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data: p } = await supabase.from('processos_licitatorios').select('organizacao_id').eq('id', processoId).single()
    if (!p) return null

    const { data: novo } = await supabase
      .from('pareceres')
      .insert({
        processo_id: processoId,
        organizacao_id: p.organizacao_id,
        procurador_id: user.id,
        status: 'pendente',
        conteudo: '',
        gerado_por_ia: false
      })
      .select('*, processos_licitatorios(objeto)')
      .single()
    
    parecer = novo
  }

  return parecer
}

export async function salvarParecer(parecerId: string, conteudo: string, status: StatusParecer) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('pareceres')
    .update({ conteudo, status, updated_at: new Date().toISOString() })
    .eq('id', parecerId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/dashboard')
  return { success: true }
}

export async function gerarParecerIA(processoId: string) {
  const supabase = await createClient()

  // Buscar informações do processo para alimentar a IA
  const { data: proc } = await supabase.from('processos_licitatorios').select('objeto, modalidade').eq('id', processoId).single()
  const { data: tr } = await supabase.from('termo_referencia').select('fundamentacao, modelo_execucao').eq('processo_id', processoId).single()
  
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    const mock = `[GERADO POR IA - MOCK]\nConsiderando o objeto "${proc?.objeto}", atesta-se a regularidade jurídica do presente processo de ${proc?.modalidade}. Recomenda-se o prosseguimento do feito.\nÉ o parecer.`
    return { success: true, conteudo: mock, statusSugerido: 'aprovado' }
  }

  try {
    const prompt = `Você é um Procurador Jurídico Municipal. Analise os seguintes dados do processo licitatório e redija um PARECER JURÍDICO em conformidade com a Lei 14.133/21.
    
Dados do Processo:
- Objeto: ${proc?.objeto || 'Não informado'}
- Modalidade: ${proc?.modalidade || 'Não informada'}
- Fundamentação (TR): ${tr?.fundamentacao || 'Padrão'}
- Modelo de Execução: ${tr?.modelo_execucao || 'Padrão'}

O parecer deve ter uma estrutura formal: Ementa, Relatório, Fundamentação Jurídica e Conclusão.
A conclusão deve ser favorável (aprovando o prosseguimento do processo).
Retorne EXCLUSIVAMENTE o texto do parecer, sem saudações ou explicações adicionais.`

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3 }
      })
    })

    if (!res.ok) {
      return { success: false, error: 'Erro de comunicação com a IA.' }
    }

    const data = await res.json()
    const textoParecer = data?.candidates?.[0]?.content?.parts?.[0]?.text
    
    if (textoParecer) {
      return { success: true, conteudo: textoParecer.trim(), statusSugerido: 'aprovado' }
    }
    return { success: false, error: 'Resposta vazia da IA.' }
  } catch (err) {
    return { success: false, error: 'Falha interna.' }
  }
}
