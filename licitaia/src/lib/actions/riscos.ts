'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function obterMapaRiscos(processoId: string) {
  const supabase = await createClient()

  let { data: mapa } = await supabase
    .from('mapa_riscos')
    .select('*, processos_licitatorios(objeto)')
    .eq('processo_id', processoId)
    .single()

  if (!mapa) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data: p } = await supabase.from('processos_licitatorios').select('organizacao_id, objeto').eq('id', processoId).single()
    if (!p) return null

    const { data: novo } = await supabase
      .from('mapa_riscos')
      .insert({
        processo_id: processoId,
        organizacao_id: p.organizacao_id,
        criado_por: user.id,
        riscos: [],
        status: 'rascunho'
      })
      .select('*, processos_licitatorios(objeto)')
      .single()
    
    mapa = novo
  }

  return mapa
}

export async function atualizarMapaRiscos(mapaId: string, riscos: any[]) {
  const supabase = await createClient()

  const { error } = await supabase
    .from('mapa_riscos')
    .update({ riscos, updated_at: new Date().toISOString() })
    .eq('id', mapaId)

  if (error) {
    return { success: false, error: error.message }
  }

  revalidatePath('/dashboard')
  return { success: true }
}

export async function sugerirRiscosIA(objeto: string) {
  if (!objeto) return { success: false, error: 'Objeto vazio.' }

  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    // Mock
    const mock = [
      { id: Date.now().toString(), identificacao: 'Atraso na entrega', probabilidade: 'Média', impacto: 'Alto', mitigacao: 'Definir multas contratuais rigorosas.' },
      { id: (Date.now() + 1).toString(), identificacao: 'Produto fora das especificações', probabilidade: 'Baixa', impacto: 'Alto', mitigacao: 'Exigir amostra antes do aceite definitivo.' }
    ]
    return { success: true, riscos: mock }
  }

  try {
    const prompt = `Você é um pregoeiro/especialista em licitações públicas (Lei 14.133/21). 
Gere de 3 a 5 riscos inerentes à seguinte contratação/aquisição: "${objeto}".
Para cada risco, defina a probabilidade (Baixa, Média, Alta), o impacto (Baixo, Médio, Alto) e a mitigação.
Retorne EXCLUSIVAMENTE um array JSON com objetos. Sem formatação markdown (\`\`\`json), apenas o array puro.
Formato exato de cada objeto:
{"id": "gerar_um_id_unico", "identificacao": "descrição do risco", "probabilidade": "Média", "impacto": "Alto", "mitigacao": "ação de contingência/prevenção"}`

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
    const texto = data?.candidates?.[0]?.content?.parts?.[0]?.text
    
    if (texto) {
      const cleanJson = texto.replace(/```json/g, '').replace(/```/g, '').trim()
      return { success: true, riscos: JSON.parse(cleanJson) }
    }
    return { success: false, error: 'Falha ao processar IA.' }
  } catch (err) {
    return { success: false, error: 'Erro interno na IA ou conversão JSON inválida.' }
  }
}
