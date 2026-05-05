'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function obterDFD(processoId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: dfd, error } = await supabase
    .from('dfd')
    .select('*')
    .eq('processo_id', processoId)
    .single()

  if (error || !dfd) return null
  return dfd
}

export async function atualizarDFD(dfdId: string, dados: any) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('dfd')
    .update({ ...dados, updated_at: new Date().toISOString() })
    .eq('id', dfdId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/dashboard')
  return { success: true }
}

export async function aprimorarTextoIA(textoOriginal: string, campo: string) {
  if (!textoOriginal) return { success: false, error: 'Texto vazio.' }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return { success: true, texto: textoOriginal + '\n\n[APRIMORADO POR IA - MOCK (Chave GEMINI_API_KEY ausente)]' }
  }

  try {
    const prompt = `Você é um especialista em licitações públicas (Lei 14.133/21). 
Aprimore o texto abaixo para um DFD institucional, mantendo o sentido original, mas com um vocabulário formal e adequado à administração pública.
Campo do documento: ${campo}
Texto original fornecido pelo usuário: "${textoOriginal}"
Regra: Retorne APENAS o texto aprimorado, sem introduções, sem aspas no começo ou no fim, sem dizer "aqui está o texto".`

    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3 }
      })
    })

    if (!res.ok) {
      return { success: false, error: 'Erro de comunicação com a API Gemini.' }
    }

    const data = await res.json()
    const textoAprimorado = data?.candidates?.[0]?.content?.parts?.[0]?.text
    
    if (textoAprimorado) {
      return { success: true, texto: textoAprimorado.trim() }
    }
    return { success: false, error: 'Falha ao processar resposta da IA.' }
  } catch (err) {
    return { success: false, error: 'Erro interno ao chamar IA.' }
  }
}
