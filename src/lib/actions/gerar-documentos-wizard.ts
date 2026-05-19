'use server'

import { createClient } from '@/lib/supabase/server'
import { gerarTextoIA } from '@/lib/ai/client'
import {
  buildPromptDFD,
  buildPromptETP,
  buildPromptTR,
  type DadosWizard,
} from '@/lib/ai/prompts/gerar-documentos-simultaneos'

interface DocumentosGerados {
  dfd: string
  etp: string
  tr: string
}

interface ResultadoGeracao {
  success: boolean
  documentos?: DocumentosGerados
  error?: string
}

async function gerarTextoDocumento(prompt: string): Promise<string> {
  const res = await gerarTextoIA({
    prompt,
    maxTokens: 4096,
    provider: 'anthropic',
  })
  return res.text
}

/**
 * Gera DFD, ETP e TR simultaneamente ao finalizar o wizard.
 * Usa claude via adapter anthropic para documentos completos.
 */
export async function gerarDocumentosWizard(
  processoId: string,
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

  let documentos: DocumentosGerados
  try {
    const [dfd, etp, tr] = await Promise.all([
      gerarTextoDocumento(buildPromptDFD(dados)),
      gerarTextoDocumento(buildPromptETP(dados)),
      gerarTextoDocumento(buildPromptTR(dados)),
    ])
    documentos = { dfd, etp, tr }
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'Erro na geracao com IA.'
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
