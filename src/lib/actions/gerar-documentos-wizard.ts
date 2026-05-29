'use server'

import { createClient } from '@/lib/supabase/server'
import { gerarTextoIA } from '@/lib/ai/client'
import {
  buildPromptDFD,
  buildPromptETP,
  buildPromptTR,
} from '@/lib/ai/prompts/gerar-documentos-simultaneos'
import type { DadosWizard } from '@/app/(dashboard)/processos/novo/types'

interface DocumentosGeradosIA {
  dfd: string
  etp: string
  tr: string
}

interface ResultadoGeracao {
  success: boolean
  documentos?: DocumentosGeradosIA
  error?: string
}

async function gerarTextoDocumento(prompt: string): Promise<string> {
  // Usa o provider ativo do ambiente (AI_PROVIDER), sem forcar Anthropic
  const res = await gerarTextoIA({
    prompt,
    maxTokens: 4096,
  })
  return res.text
}

export async function gerarDocumentosWizard(
  dados: DadosWizard
): Promise<ResultadoGeracao> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false, error: 'Nao autenticado.' }

  const { data: usuario } = await (supabase as any)
    .from('usuarios')
    .select('id, organizacao_id, papel')
    .eq('id', user.id)
    .maybeSingle()

  if (!usuario) return { success: false, error: 'Usuario nao encontrado.' }

  const papeisPermitidos = ['requisitante', 'setor_compras', 'admin_organizacao', 'admin_plataforma']
  if (!papeisPermitidos.includes(usuario.papel)) {
    return { success: false, error: 'Sem permissao para gerar documentos.' }
  }

  // Buscar nome da secretaria e dados da organizacao para enriquecer os prompts
  const [secretariaRes, orgRes] = await Promise.all([
    dados.secretaria_id
      ? (supabase as any).from('secretarias').select('nome').eq('id', dados.secretaria_id).maybeSingle()
      : Promise.resolve({ data: null }),
    (supabase as any)
      .from('organizacoes')
      .select('nome, municipio, estado')
      .eq('id', usuario.organizacao_id)
      .maybeSingle(),
  ])

  const secretariaNome = (secretariaRes.data as any)?.nome as string | undefined
  const org = orgRes.data as { nome: string; municipio: string; estado: string } | null

  const justificativa = [dados.problema_atual, dados.impacto_sem_contratar, dados.solucao_proposta]
    .filter(Boolean)
    .join('\n\n')

  const itensDescricao = dados.itens.length > 0
    ? dados.itens.map(i => `${i.quantidade} ${i.unidade} de ${i.descricao}`).join('; ')
    : undefined

  const dadosPrompt = {
    objeto: dados.objeto,
    justificativaNecessidade: justificativa,
    modalidade: dados.modalidade,
    valorEstimado: dados.valor_estimado ?? undefined,
    prazoExecucao: `${dados.prazo_dias} dias`,
    secretaria: secretariaNome,
    municipio: org?.municipio,
    estado: org?.estado,
    requisitosEspecificos: dados.especificacoes_minimas || undefined,
    quantidadeItens: dados.itens.length || undefined,
    descricaoItens: itensDescricao,
    fonteRecurso: undefined,
    unidadeRequisitante: secretariaNome,
  }

  let documentos: DocumentosGeradosIA
  try {
    const [dfd, etp, tr] = await Promise.all([
      gerarTextoDocumento(buildPromptDFD(dadosPrompt)),
      gerarTextoDocumento(buildPromptETP(dadosPrompt)),
      gerarTextoDocumento(buildPromptTR(dadosPrompt)),
    ])
    documentos = { dfd, etp, tr }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro na geracao com IA.'
    console.error('[gerarDocumentosWizard] falha na IA:', msg)
    return { success: false, error: msg }
  }

  const logsIA = [
    { documento: 'dfd', output: documentos.dfd },
    { documento: 'etp', output: documentos.etp },
    { documento: 'tr',  output: documentos.tr },
  ]

  await Promise.all(logsIA.map(log =>
    (supabase as any).from('acoes_ia').insert({
      usuario_id: usuario.id,
      organizacao_id: usuario.organizacao_id,
      tipo_acao: 'gerar_documento',
      modelo: 'anthropic',
      input_resumo: dados.objeto.slice(0, 200),
      output_resumo: log.output.slice(0, 200),
      tokens_input: 0,
      tokens_output: Math.ceil(log.output.length / 4),
    }).catch(() => {})
  ))

  return { success: true, documentos }
}
