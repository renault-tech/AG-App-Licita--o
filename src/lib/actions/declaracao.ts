'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { executarIAComCreditos } from '@/lib/ai/wrapper'

// -----------------------------------------------------------------------
// Declaração do Setor Requisitante
// Conforme fluxo administrativo da Lei 14.133/21 — Módulo 9
// -----------------------------------------------------------------------

export interface DeclaracaoData {
  id: string
  processo_id: string
  organizacao_id: string
  objeto: string
  justificativa: string
  declarante_nome: string
  declarante_cargo: string
  declarante_setor: string
  local_data: string
  status: string
  gerado_por_ia: boolean
  created_at: string
  updated_at: string
}

export async function obterDeclaracao(processoId: string): Promise<DeclaracaoData | null> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  // Busca declaração existente
  const { data } = await (supabase as any)
    .from('declaracoes_setor')
    .select('*')
    .eq('processo_id', processoId)
    .maybeSingle()

  if (data) return data as DeclaracaoData

  // Cria nova declaração baseada nos dados do processo
  const { data: processo } = await (supabase as any)
    .from('processos_licitatorios')
    .select('objeto, organizacao_id, valor_estimado, modalidade')
    .eq('id', processoId)
    .maybeSingle()

  if (!processo) return null

  const { data: usuarioData } = await supabase
    .from('usuarios')
    .select('nome_completo, cargo, organizacao_id')
    .eq('id', user.id)
    .maybeSingle()

  const usuario = usuarioData as { nome_completo: string; cargo: string; organizacao_id: string } | null

  const { data: nova } = await (supabase as any)
    .from('declaracoes_setor')
    .insert({
      processo_id:     processoId,
      organizacao_id:  processo.organizacao_id,
      objeto:          processo.objeto,
      justificativa:   '',
      declarante_nome: usuario?.nome_completo ?? '',
      declarante_cargo:usuario?.cargo ?? '',
      declarante_setor:'',
      local_data:      '',
      status:          'rascunho',
      gerado_por_ia:   false,
      criado_por:      user.id,
    })
    .select('*')
    .single()

  return (nova ?? null) as DeclaracaoData | null
}

export async function atualizarDeclaracao(
  declaracaoId: string,
  dados: Partial<Pick<DeclaracaoData, 'objeto' | 'justificativa' | 'declarante_nome' | 'declarante_cargo' | 'declarante_setor' | 'local_data'>>
): Promise<{ success: true } | { success: false; error: string }> {
  const supabase = await createClient()
  const { error } = await (supabase as any)
    .from('declaracoes_setor')
    .update({ ...dados, updated_at: new Date().toISOString() })
    .eq('id', declaracaoId)

  if (error) return { success: false, error: error.message }
  revalidatePath('/processos')
  return { success: true }
}

export async function gerarJustificativaDeclaracaoIA(
  objeto: string,
  setor: string,
  processoId: string
): Promise<{ success: true; texto: string } | { success: false; error: string }> {
  if (!objeto) return { success: false, error: 'Objeto não informado.' }

  // Buscar dados reais do processo e do DFD para fundamentar a declaracao
  const supabase = await createClient()
  const [procRes, dfdRes] = await Promise.all([
    supabase
      .from('processos_licitatorios')
      .select('modalidade, valor_estimado')
      .eq('id', processoId)
      .maybeSingle(),
    (supabase as any)
      .from('dfd')
      .select('justificativa_necessidade')
      .eq('processo_id', processoId)
      .maybeSingle(),
  ])
  const proc = procRes.data as { modalidade: string | null; valor_estimado: number | null } | null
  const dfd = dfdRes.data as { justificativa_necessidade: string | null } | null

  const prompt = `<instrucoes>
Voce e um servidor publico especializado em licitacoes (Lei 14.133/21).
Redija a justificativa para a Declaracao do Setor Requisitante, documento que atesta a necessidade da contratacao e a disponibilidade orcamentaria antes da abertura do certame.
Use linguagem administrativa formal e impessoal, sem travessao (em dash).
</instrucoes>

<dados_processo>
  <setor_requisitante>${setor || 'Setor Requisitante'}</setor_requisitante>
  <objeto>${objeto}</objeto>
  ${proc?.modalidade ? `<modalidade>${proc.modalidade}</modalidade>` : ''}
  ${proc?.valor_estimado ? `<valor_estimado>R$ ${proc.valor_estimado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</valor_estimado>` : ''}
  ${dfd?.justificativa_necessidade ? `<justificativa_dfd>${dfd.justificativa_necessidade.slice(0, 1500)}</justificativa_dfd>` : ''}
</dados_processo>

<conteudo_obrigatorio>
A declaracao deve afirmar que:
1. A necessidade da contratacao esta devidamente caracterizada (coerente com a justificativa do DFD, quando fornecida)
2. Os recursos orcamentarios estao reservados (ou serao reservados)
3. O objeto atende ao interesse publico e e imprescindivel a continuidade dos servicos
</conteudo_obrigatorio>

<formato_saida>
Retorne APENAS o texto da justificativa, em linguagem administrativa formal, sem titulo, sem aspas.
Nao invente numeros de dotacao orcamentaria ou datas que nao foram fornecidos.
</formato_saida>`

  return executarIAComCreditos({ prompt, tipoAcao: 'aprimorar_texto', processoId, temperature: 0.3 })
}
