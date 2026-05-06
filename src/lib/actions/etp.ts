'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function obterETP(processoId: string) {
  const supabase = await createClient()

  let { data: etpData } = await supabase
    .from('etp')
    .select('*')
    .eq('processo_id', processoId)
    .single()

  let etp = etpData as any

  if (!etp) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data: pData } = await supabase.from('processos_licitatorios').select('*').eq('id', processoId).single()
    const p = pData as any
    if (!p) return null

    const { data: nova } = await (supabase
      .from('etp') as any)
      .insert({
        processo_id: processoId,
        organizacao_id: p.organizacao_id,
        criado_por: user.id,
        status: 'rascunho'
      })
      .select('*')
      .single()
    
    etp = nova
  }

  return etp
}

export async function atualizarETP(etpId: string, dados: any) {
  const supabase = await createClient()

  const { error } = await (supabase
    .from('etp') as any)
    .update({ ...dados, updated_at: new Date().toISOString() })
    .eq('id', etpId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/dashboard')
  return { success: true }
}

export async function aprimorarETPComIA(textoOriginal: string, campo: string) {
  if (!textoOriginal) return { success: false, error: 'Texto vazio.' }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return { success: true, texto: textoOriginal + '\n\n[APRIMORADO POR IA - MOCK (Chave ausente)]' }
  }

  try {
    const prompt = `Você é um especialista em licitações públicas (Lei 14.133/21). 
Aprimore o texto abaixo para um Estudo Técnico Preliminar (ETP) governamental (Art. 18).
Campo do ETP: ${campo}
Texto original: "${textoOriginal}"

Retorne APENAS o texto aprimorado, utilizando vocabulário administrativo e formal. Sem aspas, sem introduções.`

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3 }
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
