import { createClient } from '@/lib/supabase/server'
import { TipoAcaoIA } from '@/types/database'

interface RequestIA {
  prompt: string;
  tipoAcao: TipoAcaoIA;
  processoId?: string;
  temperature?: number;
}

export async function executarIAComCreditos(params: RequestIA) {
  const supabase = await createClient()

  // 1. Identificar usuário
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Usuário não autenticado.' }

  const { data: userData } = await supabase
    .from('usuarios')
    .select('organizacao_id')
    .eq('id', user.id)
    .single()

  if (!userData) return { success: false, error: 'Organização não encontrada.' }
  const organizacaoId = userData.organizacao_id

  // 2. Verificar saldo de créditos
  const { data: creditos } = await supabase
    .from('creditos_usuario')
    .select('saldo, id')
    .eq('usuario_id', user.id)
    .single()

  // Se não tem registro de créditos, vamos dar 500 de cortesia pro MVP
  let saldoAtual = 0
  let creditosId = null
  
  if (!creditos) {
    const { data: novoCredito } = await supabase
      .from('creditos_usuario')
      .insert({
        usuario_id: user.id,
        organizacao_id: organizacaoId,
        saldo: 500
      })
      .select('saldo, id')
      .single()
    
    saldoAtual = novoCredito?.saldo || 0
    creditosId = novoCredito?.id
  } else {
    saldoAtual = creditos.saldo
    creditosId = creditos.id
  }

  if (saldoAtual <= 0) {
    return { success: false, error: 'Saldo de créditos insuficiente. Adquira mais créditos para continuar usando a IA.' }
  }

  // 3. Executar chamada à API (Google Gemini Flash)
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    return { success: false, error: 'Chave de API não configurada no servidor.' }
  }

  let textoRetorno = ''
  let sucesso = false
  let msgErro = null
  let creditosDebitar = 1 // Custo fixo por ação no MVP

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: params.prompt }] }],
        generationConfig: { temperature: params.temperature || 0.3 }
      })
    })

    if (!res.ok) {
      throw new Error('Erro retornado pela API do provedor de IA.')
    }

    const data = await res.json()
    textoRetorno = data?.candidates?.[0]?.content?.parts?.[0]?.text || ''
    
    if (textoRetorno) {
      sucesso = true
    } else {
      throw new Error('Resposta vazia da IA.')
    }
  } catch (err: any) {
    sucesso = false
    msgErro = err.message || 'Falha de comunicação.'
    creditosDebitar = 0 // Não debita se houver falha de rede grave
  }

  // 4. Registrar Ação na tabela acoes_ia
  await supabase.from('acoes_ia').insert({
    usuario_id: user.id,
    organizacao_id: organizacaoId,
    processo_id: params.processoId || null,
    tipo_acao: params.tipoAcao,
    provedor: 'google',
    modelo: 'gemini-2.5-flash',
    tokens_entrada: params.prompt.length, // aproximação grosseira para MVP
    tokens_saida: textoRetorno.length,
    creditos_consumidos: creditosDebitar,
    input_resumo: params.prompt.substring(0, 100),
    sucesso: sucesso,
    erro_mensagem: msgErro
  })

  // 5. Debitar Crédito se houver sucesso
  if (sucesso && creditosId) {
    await supabase
      .from('creditos_usuario')
      .update({ saldo: saldoAtual - creditosDebitar, updated_at: new Date().toISOString() })
      .eq('id', creditosId)
  }

  if (!sucesso) {
    return { success: false, error: msgErro }
  }

  return { success: true, texto: textoRetorno.trim() }
}
