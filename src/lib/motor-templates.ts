import type { DadosWizard, SecaoGerada } from '@/app/(dashboard)/processos/novo/types'
import { buscarClausulaParaCampo, buscarProcessosReferencia } from './actions/clausulas'
import { gerarTextoIA } from './ai/client'

function substituirVariaveis(template: string, variaveis: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, chave) => variaveis[chave] ?? `[${chave}]`)
}

function numeroPorExtenso(n: number): string {
  const map: Record<number, string> = {
    15: 'quinze', 30: 'trinta', 45: 'quarenta e cinco', 60: 'sessenta',
    90: 'noventa', 120: 'cento e vinte', 180: 'cento e oitenta', 365: 'trezentos e sessenta e cinco',
  }
  return map[n] ?? String(n)
}

function formasPagamentoTexto(forma: string): string {
  const map: Record<string, string> = {
    '30_dias_medicao': 'O pagamento sera realizado em ate 30 (trinta) dias corridos apos o ateste da nota fiscal pelo fiscal do contrato.',
    'parcelas_mensais': 'O pagamento sera realizado mensalmente, proporcionalmente a execucao dos servicos, mediante ateste do fiscal do contrato.',
    'entrega_unica': 'O pagamento sera realizado em parcela unica, em ate 30 (trinta) dias corridos apos o recebimento definitivo do objeto e ateste da nota fiscal.',
  }
  return map[forma] ?? forma
}

function garantiaTexto(garantia: string, valorEstimado: number | null): string {
  if (garantia === 'dispensada') {
    return 'Fica dispensada a exigencia de garantia contratual, tendo em vista o reduzido risco da contratacao e o valor estimado do contrato.'
  }
  const pct = garantia === '5%' ? '5% (cinco por cento)' : '10% (dez por cento)'
  const valor = valorEstimado
    ? `, correspondente a ${pct} do valor total estimado de R$ ${valorEstimado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`
    : ''
  return `Sera exigida garantia contratual no valor equivalente a ${pct} do valor do contrato${valor}, nos termos do art. 96 da Lei no 14.133/2021.`
}

function montarObjetoCompleto(dados: DadosWizard): string {
  if (!dados.itens.length) return dados.objeto
  const itensStr = dados.itens
    .map(i => `${i.quantidade} ${i.unidade} de ${i.descricao}`)
    .join('; ')
  return `${dados.objeto}, compreendendo: ${itensStr}`
}

export function montarVariaveis(dados: DadosWizard, secretariaNome: string): Record<string, string> {
  return {
    objeto_completo: montarObjetoCompleto(dados),
    problema_atual: dados.problema_atual,
    impacto_sem_contratar: dados.impacto_sem_contratar,
    solucao_proposta: dados.solucao_proposta,
    secretaria_nome: secretariaNome,
    especificacoes_minimas: dados.especificacoes_minimas,
    criterios_sustentabilidade: dados.criterios_sustentabilidade.join(', ') || 'nao aplicavel',
    prazo_dias: String(dados.prazo_dias),
    prazo_dias_extenso: numeroPorExtenso(dados.prazo_dias),
    forma_pagamento_texto: formasPagamentoTexto(dados.forma_pagamento),
    garantia_texto: garantiaTexto(dados.garantia, dados.valor_estimado),
  }
}

export async function gerarSecao(params: {
  documento: 'dfd' | 'etp' | 'tr'
  tipoCampo: string
  organizacaoId: string
  modalidade: string
  categoriaObjeto: string
  variaveis: Record<string, string>
  usarIA: boolean
  modeloIA: string
}): Promise<SecaoGerada> {
  const { texto: textoBase, origem, processosReferencia } = await buscarClausulaParaCampo(
    params.documento,
    params.tipoCampo,
    params.modalidade,
    params.categoriaObjeto,
    params.organizacaoId
  )

  let textoFinal = substituirVariaveis(textoBase, params.variaveis)

  if (params.usarIA && textoFinal && origem !== 'aprendida') {
    try {
      const res = await gerarTextoIA({
        prompt: `Personalize o texto abaixo para o contexto especifico da contratacao, mantendo o registro juridico formal e as referencias legais. Retorne apenas o texto ajustado, sem comentarios.\n\nContexto: ${JSON.stringify(params.variaveis)}\n\nTexto base:\n${textoFinal}`,
        maxTokens: 800,
        temperature: 0.3,
      })
      textoFinal = res.text
      return { tipo_campo: params.tipoCampo, texto: textoFinal, origem: 'ia', processos_referencia: [] }
    } catch {
      // fallback silencioso para template
    }
  }

  const refs = processosReferencia.length > 0
    ? await buscarProcessosReferencia(processosReferencia)
    : []

  return { tipo_campo: params.tipoCampo, texto: textoFinal, origem, processos_referencia: refs }
}
