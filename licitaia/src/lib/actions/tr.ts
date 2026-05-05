'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function obterTR(processoId: string) {
  const supabase = await createClient()

  let { data: tr } = await supabase
    .from('termo_referencia')
    .select('*')
    .eq('processo_id', processoId)
    .single()

  if (!tr) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data: p } = await supabase.from('processos_licitatorios').select('organizacao_id').eq('id', processoId).single()
    if (!p) return null

    const { data: nova } = await supabase
      .from('termo_referencia')
      .insert({
        processo_id: processoId,
        organizacao_id: p.organizacao_id,
        criado_por: user.id,
        status: 'rascunho'
      })
      .select('*')
      .single()
    
    tr = nova
  }

  return tr
}

export async function atualizarTR(trId: string, dados: any) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('termo_referencia')
    .update({ ...dados, updated_at: new Date().toISOString() })
    .eq('id', trId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/dashboard')
  return { success: true }
}

export async function aprimorarTRComIA(textoOriginal: string, campo: string) {
  if (!textoOriginal) return { success: false, error: 'Texto vazio.' }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return { success: true, texto: textoOriginal + '\n\n[APRIMORADO POR IA - MOCK]' }
  }

  try {
    const prompt = `Você é um especialista em licitações públicas (Lei 14.133/21). 
Aprimore o texto abaixo para um Termo de Referência (TR).
Seção do TR: ${campo}
Texto original: "${textoOriginal}"

Retorne APENAS o texto aprimorado final, redigido de forma clara, técnica, objetiva e formal (linguagem governamental). 
Sem introduções, sem aspas, focado puramente no conteúdo.`

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.2 }
      })
    })

    if (!res.ok) {
      return { success: false, error: 'Erro de comunicação com a API.' }
    }

    const data = await res.json()
    const textoAprimorado = data?.candidates?.[0]?.content?.parts?.[0]?.text
    
    if (textoAprimorado) {
      return { success: true, texto: textoAprimorado.trim() }
    }
    return { success: false, error: 'Falha ao processar IA.' }
  } catch (err) {
    return { success: false, error: 'Erro interno na IA.' }
  }
}
