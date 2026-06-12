'use server'

import { createClient } from '@/lib/supabase/server'
import { executarIAComCreditos } from '@/lib/ai/wrapper'
import {
  buildPromptDFD,
  buildPromptETP,
  buildPromptTR,
} from '@/lib/ai/prompts/gerar-documentos-simultaneos'
import type { DadosWizard } from '@/app/(dashboard)/processos/novo/types'

interface DocumentosGeradosIA {
  dfd?: string
  etp: string
  tr: string
}

interface ResultadoGeracao {
  success: boolean
  documentos?: DocumentosGeradosIA
  error?: string
}

export async function gerarDocumentosWizard(
  dados: DadosWizard,
  opcoes?: { skipDfd?: boolean }
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

  // Gerar documentos sequencialmente via wrapper padrao.
  // O wrapper le ia_config.provider da org, debita creditos e registra em acoes_ia.
  // Sequencial (nao paralelo) por dois motivos: respeitar rate limit do provider
  // e encadear contexto (o ETP recebe o DFD gerado; o TR recebe o ETP gerado),
  // garantindo coerencia entre os documentos do mesmo processo.

  // Parametros comuns de RAG: o wrapper injeta clausulas aprendidas da organizacao
  // quando documentoTipo + camposNecessarios sao informados.
  const ragComum = {
    modalidade: dados.modalidade,
    categoriaObjeto: dados.categoria_objeto,
  }

  // DFD e gerado apenas quando nao vem de uma solicitacao previa (DFD-first flow).
  let dfdTexto: string | undefined
  if (!opcoes?.skipDfd) {
    const resDFD = await executarIAComCreditos({
      prompt: buildPromptDFD(dadosPrompt),
      tipoAcao: 'gerar_documento',
      temperature: 0.3,
      documentoTipo: 'dfd',
      camposNecessarios: ['objeto', 'justificativa'],
      ...ragComum,
    })
    if (!resDFD.success) {
      console.error('[gerarDocumentosWizard] falha no DFD:', resDFD.error)
      return { success: false, error: resDFD.error }
    }
    dfdTexto = resDFD.texto
  }

  const resETP = await executarIAComCreditos({
    prompt: buildPromptETP(dadosPrompt, dfdTexto),
    tipoAcao: 'gerar_documento',
    temperature: 0.3,
    documentoTipo: 'etp',
    camposNecessarios: [
      'descricao_necessidade', 'requisitos_contratacao', 'levantamento_mercado',
      'estimativa_quantidades', 'justificativa_solucao', 'parcelamento',
      'resultados_pretendidos', 'providencias',
    ],
    ...ragComum,
  })
  if (!resETP.success) {
    console.error('[gerarDocumentosWizard] falha no ETP:', resETP.error)
    return { success: false, error: resETP.error }
  }

  const resTR = await executarIAComCreditos({
    prompt: buildPromptTR(dadosPrompt, resETP.texto),
    tipoAcao: 'gerar_documento',
    temperature: 0.3,
    documentoTipo: 'tr',
    camposNecessarios: [
      'objeto_detalhado', 'fundamentacao', 'modelo_execucao',
      'modelo_gestao', 'criterios_medicao', 'garantias', 'sancoes',
    ],
    ...ragComum,
  })
  if (!resTR.success) {
    console.error('[gerarDocumentosWizard] falha no TR:', resTR.error)
    return { success: false, error: resTR.error }
  }

  return {
    success: true,
    documentos: {
      dfd: dfdTexto,
      etp: resETP.texto,
      tr:  resTR.texto,
    },
  }
}
