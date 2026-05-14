'use server'

import { createClient } from '@/lib/supabase/server'
import type { PayloadDocumento, CabecalhoDoc } from './tipos'

const MODALIDADE_LABEL: Record<string, string> = {
  pregao_eletronico:   'Pregão Eletrônico',
  pregao_presencial:   'Pregão Presencial',
  concorrencia:        'Concorrência',
  concurso:            'Concurso',
  leilao:              'Leilão',
  dialogo_competitivo: 'Diálogo Competitivo',
  dispensa:            'Dispensa',
  inexigibilidade:     'Inexigibilidade',
}

async function buscarCabecalho(
  supabase: Awaited<ReturnType<typeof createClient>>,
  organizacaoId: string,
  secretariaId: string | null
): Promise<CabecalhoDoc> {
  const { data: org } = await (supabase as any)
    .from('organizacoes')
    .select('nome, municipio, estado, endereco, telefone, email, brasao_url, cabecalho_institucional')
    .eq('id', organizacaoId)
    .maybeSingle()

  let nomeSecretaria: string | null = null
  if (secretariaId) {
    const { data: sec } = await (supabase as any)
      .from('secretarias')
      .select('nome')
      .eq('id', secretariaId)
      .maybeSingle()
    nomeSecretaria = sec?.nome ?? null
  }

  return {
    municipio:        org?.municipio ?? '',
    estado:           org?.estado ?? '',
    nomeOrganizacao:  org?.cabecalho_institucional ?? org?.nome ?? '',
    nomeSecretaria,
    endereco:         org?.endereco ?? null,
    telefone:         org?.telefone ?? null,
    email:            org?.email ?? null,
    brasaoUrl:        org?.brasao_url ?? null,
    geradoPorIA:      false,
  }
}

export async function montarPayloadDFD(processoId: string): Promise<PayloadDocumento | null> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: dfd } = await (supabase as any)
    .from('dfd')
    .select('*')
    .eq('processo_id', processoId)
    .maybeSingle()
  if (!dfd) return null

  const { data: processo } = await (supabase as any)
    .from('processos_licitatorios')
    .select('objeto, modalidade, numero_processo, organizacao_id')
    .eq('id', processoId)
    .maybeSingle()
  if (!processo) return null

  const cabecalho = await buscarCabecalho(supabase, processo.organizacao_id, dfd.secretaria_id)
  cabecalho.geradoPorIA = dfd.gerado_por_ia ?? false

  const secoes = [
    { titulo: '1. Secretaria Requisitante', conteudo: dfd.secretaria_nome ?? '' },
    { titulo: '2. Responsável pela Elaboração', conteudo: dfd.responsavel_elaboracao ?? '' },
    { titulo: '3. Objeto da Contratação', conteudo: dfd.objeto ?? '' },
    dfd.justificativa_necessidade ? { titulo: '4. Justificativa da Necessidade', conteudo: dfd.justificativa_necessidade } : null,
    dfd.fiscal_contrato ? { titulo: '5. Fiscal do Contrato', conteudo: dfd.fiscal_contrato } : null,
    dfd.dotacao_orcamentaria ? { titulo: '6. Dotação Orçamentária', conteudo: dfd.dotacao_orcamentaria } : null,
  ].filter(Boolean) as { titulo: string; conteudo: string }[]

  return {
    cabecalho,
    tipoDocumento: 'DOCUMENTO DE FORMALIZAÇÃO DA DEMANDA (DFD)',
    numeroProcesso: processo.numero_processo ?? null,
    objeto: processo.objeto,
    modalidade: MODALIDADE_LABEL[processo.modalidade] ?? processo.modalidade,
    dataGeracao: new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }),
    secoes,
    rodapeIA: dfd.gerado_por_ia ?? false,
    statusDocumento: dfd.status ?? null,
  }
}

export async function montarPayloadETP(processoId: string): Promise<PayloadDocumento | null> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: etp } = await (supabase as any)
    .from('etp')
    .select('*')
    .eq('processo_id', processoId)
    .maybeSingle()
  if (!etp) return null

  const { data: processo } = await (supabase as any)
    .from('processos_licitatorios')
    .select('objeto, modalidade, numero_processo, organizacao_id')
    .eq('id', processoId)
    .maybeSingle()
  if (!processo) return null

  const cabecalho = await buscarCabecalho(supabase, processo.organizacao_id, null)
  cabecalho.geradoPorIA = etp.gerado_por_ia ?? false

  const secoes = [
    { titulo: '1. Descrição da Necessidade', conteudo: etp.descricao_necessidade ?? '' },
    { titulo: '2. Requisitos da Contratação', conteudo: etp.requisitos_contratacao ?? '' },
    { titulo: '3. Levantamento de Mercado', conteudo: etp.levantamento_mercado ?? '' },
    { titulo: '4. Estimativa de Quantidades', conteudo: etp.estimativa_quantidades ?? '' },
    { titulo: '5. Estimativa de Valores', conteudo: etp.estimativa_valores ?? '' },
    { titulo: '6. Justificativa da Solução', conteudo: etp.justificativa_solucao ?? '' },
    etp.parcelamento ? { titulo: '7. Parcelamento', conteudo: etp.parcelamento } : null,
    etp.resultados_pretendidos ? { titulo: '8. Resultados Pretendidos', conteudo: etp.resultados_pretendidos } : null,
    etp.providencias ? { titulo: '9. Providências a Adotar', conteudo: etp.providencias } : null,
    etp.contratacoes_correlatas ? { titulo: '10. Contratações Correlatas', conteudo: etp.contratacoes_correlatas } : null,
    etp.impactos_ambientais ? { titulo: '11. Impactos Ambientais', conteudo: etp.impactos_ambientais } : null,
    etp.viabilidade ? { titulo: '12. Declaração de Viabilidade', conteudo: etp.viabilidade } : null,
  ].filter(Boolean) as { titulo: string; conteudo: string }[]

  return {
    cabecalho,
    tipoDocumento: 'ESTUDO TÉCNICO PRELIMINAR (ETP)',
    numeroProcesso: processo.numero_processo ?? null,
    objeto: processo.objeto,
    modalidade: MODALIDADE_LABEL[processo.modalidade] ?? processo.modalidade,
    dataGeracao: new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }),
    secoes,
    rodapeIA: etp.gerado_por_ia ?? false,
    statusDocumento: etp.status ?? null,
  }
}

export async function montarPayloadTR(processoId: string): Promise<PayloadDocumento | null> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: tr } = await (supabase as any)
    .from('termo_referencia')
    .select('*')
    .eq('processo_id', processoId)
    .maybeSingle()
  if (!tr) return null

  const { data: processo } = await (supabase as any)
    .from('processos_licitatorios')
    .select('objeto, modalidade, numero_processo, organizacao_id')
    .eq('id', processoId)
    .maybeSingle()
  if (!processo) return null

  const cabecalho = await buscarCabecalho(supabase, processo.organizacao_id, null)
  cabecalho.geradoPorIA = tr.gerado_por_ia ?? false

  const secoes = [
    { titulo: '1. Objeto', conteudo: tr.objeto ?? '' },
    { titulo: '2. Fundamentação Legal', conteudo: tr.fundamentacao ?? '' },
    { titulo: '3. Descrição do Objeto', conteudo: tr.descricao ?? '' },
    { titulo: '4. Requisitos Técnicos', conteudo: tr.requisitos_tecnicos ?? '' },
    { titulo: '5. Modelo de Execução', conteudo: tr.modelo_execucao ?? '' },
    { titulo: '6. Modelo de Gestão', conteudo: tr.modelo_gestao ?? '' },
    tr.criterios_medicao ? { titulo: '7. Critérios de Medição', conteudo: tr.criterios_medicao } : null,
    tr.forma_pagamento ? { titulo: '8. Forma de Pagamento', conteudo: tr.forma_pagamento } : null,
    tr.garantias ? { titulo: '9. Garantias', conteudo: tr.garantias } : null,
    tr.sancoes ? { titulo: '10. Sanções Administrativas', conteudo: tr.sancoes } : null,
  ].filter(Boolean) as { titulo: string; conteudo: string }[]

  return {
    cabecalho,
    tipoDocumento: 'TERMO DE REFERÊNCIA (TR)',
    numeroProcesso: processo.numero_processo ?? null,
    objeto: processo.objeto,
    modalidade: MODALIDADE_LABEL[processo.modalidade] ?? processo.modalidade,
    dataGeracao: new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }),
    secoes,
    rodapeIA: tr.gerado_por_ia ?? false,
    statusDocumento: tr.status ?? null,
  }
}

export async function montarPayloadRiscos(processoId: string): Promise<PayloadDocumento | null> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: mapa } = await (supabase as any)
    .from('mapa_riscos')
    .select('*')
    .eq('processo_id', processoId)
    .maybeSingle()
  if (!mapa) return null

  const { data: processo } = await (supabase as any)
    .from('processos_licitatorios')
    .select('objeto, modalidade, numero_processo, organizacao_id')
    .eq('id', processoId)
    .maybeSingle()
  if (!processo) return null

  const cabecalho = await buscarCabecalho(supabase, processo.organizacao_id, null)
  cabecalho.geradoPorIA = mapa.gerado_por_ia ?? false

  const riscos: Array<{ id: string; identificacao: string; probabilidade: string; impacto: string; mitigacao: string }> =
    Array.isArray(mapa.riscos) ? mapa.riscos : []

  const conteudoRiscos = riscos.length === 0
    ? '(Nenhum risco identificado)'
    : riscos.map((r, i) =>
        `${i + 1}. ${r.identificacao}\n   Probabilidade: ${r.probabilidade}  |  Impacto: ${r.impacto}\n   Mitigação: ${r.mitigacao}`
      ).join('\n\n')

  const secoes = [
    {
      titulo: '1. Matriz de Riscos Identificados',
      conteudo: conteudoRiscos,
    },
  ]

  return {
    cabecalho,
    tipoDocumento: 'MAPA DE RISCOS',
    numeroProcesso: processo.numero_processo ?? null,
    objeto: processo.objeto,
    modalidade: MODALIDADE_LABEL[processo.modalidade] ?? processo.modalidade,
    dataGeracao: new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }),
    secoes,
    rodapeIA: mapa.gerado_por_ia ?? false,
    statusDocumento: mapa.status ?? null,
  }
}

export async function montarPayloadEdital(processoId: string): Promise<PayloadDocumento | null> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: edital } = await (supabase as any)
    .from('edital')
    .select('*')
    .eq('processo_id', processoId)
    .maybeSingle()
  if (!edital) return null

  const { data: processo } = await (supabase as any)
    .from('processos_licitatorios')
    .select('objeto, modalidade, numero_processo, organizacao_id')
    .eq('id', processoId)
    .maybeSingle()
  if (!processo) return null

  const cabecalho = await buscarCabecalho(supabase, processo.organizacao_id, null)
  cabecalho.geradoPorIA = edital.gerado_por_ia ?? false

  const conteudo: Record<string, string> = typeof edital.conteudo === 'object' && edital.conteudo !== null
    ? (edital.conteudo as Record<string, string>)
    : {}

  const secoes = Object.entries(conteudo)
    .filter(([, v]) => typeof v === 'string' && v.trim())
    .map(([titulo, valor]) => ({ titulo, conteudo: valor }))

  if (secoes.length === 0) {
    secoes.push({ titulo: '1. Conteúdo do Edital', conteudo: '(Não preenchido)' })
  }

  return {
    cabecalho,
    tipoDocumento: 'EDITAL DE LICITAÇÃO',
    numeroProcesso: processo.numero_processo ?? null,
    objeto: processo.objeto,
    modalidade: MODALIDADE_LABEL[processo.modalidade] ?? processo.modalidade,
    dataGeracao: new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }),
    secoes,
    rodapeIA: edital.gerado_por_ia ?? false,
    statusDocumento: edital.status ?? null,
  }
}

export async function montarPayloadParecer(processoId: string): Promise<PayloadDocumento | null> {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: parecer } = await (supabase as any)
    .from('pareceres')
    .select('*')
    .eq('processo_id', processoId)
    .maybeSingle()
  if (!parecer) return null

  const { data: processo } = await (supabase as any)
    .from('processos_licitatorios')
    .select('objeto, modalidade, numero_processo, organizacao_id')
    .eq('id', processoId)
    .maybeSingle()
  if (!processo) return null

  const cabecalho = await buscarCabecalho(supabase, processo.organizacao_id, null)
  cabecalho.geradoPorIA = parecer.gerado_por_ia ?? false

  const STATUS_LABEL: Record<string, string> = {
    pendente:               'Pendente de análise',
    aprovado:               'Aprovado',
    aprovado_com_ressalvas: 'Aprovado com ressalvas',
    devolvido:              'Devolvido para correção',
  }

  const secoes = [
    { titulo: '1. Status do Parecer', conteudo: STATUS_LABEL[parecer.status] ?? parecer.status },
    { titulo: '2. Conteúdo do Parecer', conteudo: parecer.conteudo ?? '(Conteúdo não preenchido)' },
  ]

  return {
    cabecalho,
    tipoDocumento: 'PARECER JURÍDICO',
    numeroProcesso: processo.numero_processo ?? null,
    objeto: processo.objeto,
    modalidade: MODALIDADE_LABEL[processo.modalidade] ?? processo.modalidade,
    dataGeracao: new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' }),
    secoes,
    rodapeIA: parecer.gerado_por_ia ?? false,
    statusDocumento: parecer.status ?? null,
  }
}
