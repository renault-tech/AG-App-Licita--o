'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function obterCotacao(processoId: string) {
  const supabase = await createClient()

  // Buscar cotação principal
  let { data: cotacao } = await supabase
    .from('cotacoes')
    .select('*')
    .eq('processo_id', processoId)
    .single()

  // Se não existe, cria rascunho
  if (!cotacao) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return null

    const { data: p } = await supabase.from('processos_licitatorios').select('organizacao_id').eq('id', processoId).single()
    if (!p) return null

    const { data: nova } = await supabase
      .from('cotacoes')
      .insert({
        processo_id: processoId,
        organizacao_id: p.organizacao_id,
        criado_por: user.id,
        fonte: 'pncp',
        status: 'rascunho'
      })
      .select('*')
      .single()
    
    cotacao = nova
  }

  // Buscar fornecedores vinculados
  const { data: fornecedores } = await supabase
    .from('cotacoes_fornecedores')
    .select('*')
    .eq('cotacao_id', cotacao.id)

  return { cotacao, fornecedores: fornecedores || [] }
}

function calcularMediana(valores: number[]) {
  if (valores.length === 0) return 0
  const nums = [...valores].sort((a, b) => a - b)
  const meio = Math.floor(nums.length / 2)
  if (nums.length % 2 === 0) {
    return (nums[meio - 1] + nums[meio]) / 2
  }
  return nums[meio]
}

export async function salvarCotacaoFornecedores(
  cotacaoId: string, 
  fonte: 'pncp' | 'banco_municipal' | 'pesquisa_direta',
  justificativa_fonte: string,
  fornecedores: any[]
) {
  const supabase = await createClient()

  const valores = fornecedores.map(f => Number(f.valor_proposto)).filter(v => v > 0)
  
  let valor_medio = 0
  let valor_mediana = 0
  let tem_outlier = false

  if (valores.length > 0) {
    valor_medio = valores.reduce((a, b) => a + b, 0) / valores.length
    valor_mediana = calcularMediana(valores)
    
    // Outlier: variação superior a 30% da mediana
    tem_outlier = valores.some(v => v > valor_mediana * 1.3 || v < valor_mediana * 0.7)
  }

  // Atualizar a cotação em si
  await supabase
    .from('cotacoes')
    .update({ 
      fonte,
      justificativa_fonte,
      valor_medio,
      valor_mediana,
      valor_estimado: valor_mediana, // Utilizando a mediana como estimado padrão conforme boas práticas TCU
      tem_outlier
    })
    .eq('id', cotacaoId)

  // Atualizar fornecedores (Apaga e recria para simplificar na POC)
  await supabase.from('cotacoes_fornecedores').delete().eq('cotacao_id', cotacaoId)

  if (fornecedores.length > 0) {
    const fornecedoresInsert = fornecedores.map(f => ({
      cotacao_id: cotacaoId,
      nome_fornecedor: f.nome_fornecedor,
      cnpj_fornecedor: f.cnpj_fornecedor,
      justificativa_escolha: f.justificativa_escolha,
      valor_proposto: f.valor_proposto
    }))
    await supabase.from('cotacoes_fornecedores').insert(fornecedoresInsert)
  }

  revalidatePath('/processos')
  return { success: true, tem_outlier, valor_estimado: valor_mediana }
}
