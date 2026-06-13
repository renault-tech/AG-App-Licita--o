'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { executarIAComCreditos } from '@/lib/ai/wrapper'
import type { StatusParecer, PrecedenteComScore } from '@/types/database'

// Calcula a faixa de valor a partir de um numero
function calcularFaixaValor(valor: number | null): string {
  if (!valor) return 'indefinido'
  if (valor <= 50000)  return 'ate_50k'
  if (valor <= 100000) return '50k_100k'
  if (valor <= 500000) return '100k_500k'
  return 'acima_500k'
}

// Extrai keywords do objeto (palavras com 4+ chars, sem stopwords)
function extrairKeywords(objeto: string): string[] {
  const stopwords = new Set(['para', 'pela', 'pelo', 'como', 'com', 'que', 'dos', 'das', 'dos', 'uma', 'este', 'essa'])
  return objeto
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .split(/\s+/)
    .filter(w => w.length >= 4 && !stopwords.has(w))
    .slice(0, 20)
}

// Calcula score de similaridade entre dois conjuntos de keywords (Jaccard simplificado)
function scoreKeywords(a: string[], b: string[]): number {
  if (!a.length || !b.length) return 0
  const setA = new Set(a)
  const setB = new Set(b)
  const intersecao = [...setA].filter(k => setB.has(k)).length
  const uniao = new Set([...setA, ...setB]).size
  return Math.round((intersecao / uniao) * 100)
}

// Calcula score de faixa de valor (100 = mesma faixa, 50 = faixa adjacente, 0 = distante)
function scoreFaixaValor(a: string, b: string): number {
  const faixas = ['ate_50k', '50k_100k', '100k_500k', 'acima_500k', 'indefinido']
  const ia = faixas.indexOf(a)
  const ib = faixas.indexOf(b)
  if (ia === -1 || ib === -1 || ia === 4 || ib === 4) return 0
  const diff = Math.abs(ia - ib)
  if (diff === 0) return 100
  if (diff === 1) return 50
  return 0
}

export interface ParecerListItem {
  id: string
  processo_id: string
  status: StatusParecer
  veredito: string | null
  data_envio_procuradoria: string | null
  created_at: string
  processo: {
    objeto: string
    numero_processo: string | null
    modalidade: string
    valor_estimado: number | null
    secretaria_id: string | null
    secretaria_nome: string | null
  }
}

export async function listarPareceresOrg(): Promise<ParecerListItem[]> {
  const supabase = await createClient()

  const { data: usuarioRaw } = await supabase
    .from('usuarios')
    .select('organizacao_id')
    .eq('id', (await supabase.auth.getUser()).data.user?.id ?? '')
    .single()

  if (!usuarioRaw) return []
  const { organizacao_id } = usuarioRaw as { organizacao_id: string }

  const { data } = await (supabase as any)
    .from('pareceres')
    .select(`
      id,
      processo_id,
      status,
      veredito,
      data_envio_procuradoria,
      created_at,
      processos_licitatorios (
        objeto,
        numero_processo,
        modalidade,
        valor_estimado,
        secretaria_id,
        secretarias ( nome )
      )
    `)
    .eq('organizacao_id', organizacao_id)
    .order('created_at', { ascending: true })

  return (data ?? []).map((row: any) => ({
    id: row.id,
    processo_id: row.processo_id,
    status: row.status,
    veredito: row.veredito,
    data_envio_procuradoria: row.data_envio_procuradoria,
    created_at: row.created_at,
    processo: {
      objeto:          row.processos_licitatorios?.objeto ?? '',
      numero_processo: row.processos_licitatorios?.numero_processo ?? null,
      modalidade:      row.processos_licitatorios?.modalidade ?? '',
      valor_estimado:  row.processos_licitatorios?.valor_estimado ?? null,
      secretaria_id:   row.processos_licitatorios?.secretaria_id ?? null,
      secretaria_nome: row.processos_licitatorios?.secretarias?.nome ?? null,
    },
  }))
}

export async function salvarVeredito(
  parecerId: string,
  veredito: 'aprovar' | 'aprovar_com_ressalvas' | 'contrario'
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { data: current } = await (supabase as any)
    .from('pareceres')
    .select('status')
    .eq('id', parecerId)
    .single()

  const novoStatus: StatusParecer = (current?.status === 'pendente') ? 'em_analise' : current?.status

  const { error } = await (supabase as any)
    .from('pareceres')
    .update({ veredito, status: novoStatus, updated_at: new Date().toISOString() })
    .eq('id', parecerId)

  if (error) return { success: false, error: error.message }
  revalidatePath('/procuradoria')
  return { success: true }
}

export async function salvarConteudo(
  parecerId: string,
  conteudo: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = await createClient()
  const { error } = await (supabase as any)
    .from('pareceres')
    .update({ conteudo, updated_at: new Date().toISOString() })
    .eq('id', parecerId)

  if (error) return { success: false, error: error.message }
  return { success: true }
}

export async function emitirParecer(
  parecerId: string,
  conteudo: string,
  veredito: 'aprovar' | 'aprovar_com_ressalvas' | 'contrario',
  extras: { ressalvas?: string; motivo_contrario?: string }
): Promise<{ success: boolean; error?: string }> {
  if (!conteudo.trim()) return { success: false, error: 'O texto do parecer nao pode estar vazio.' }
  if (!veredito) return { success: false, error: 'Selecione o veredito antes de emitir.' }
  if (veredito === 'aprovar_com_ressalvas' && !extras.ressalvas?.trim()) {
    return { success: false, error: 'Informe as ressalvas antes de emitir.' }
  }
  if (veredito === 'contrario' && !extras.motivo_contrario?.trim()) {
    return { success: false, error: 'Informe o motivo do parecer contrario antes de emitir.' }
  }

  const supabase = await createClient()

  const statusFinal: StatusParecer = veredito === 'contrario' ? 'contrario' : veredito === 'aprovar_com_ressalvas' ? 'aprovado_com_ressalvas' : 'aprovado'

  const { data: parecerAtual } = await (supabase as any)
    .from('pareceres')
    .select('processo_id, organizacao_id')
    .eq('id', parecerId)
    .single()

  if (!parecerAtual) return { success: false, error: 'Parecer nao encontrado.' }

  const { error } = await (supabase as any)
    .from('pareceres')
    .update({
      conteudo,
      veredito,
      status: statusFinal,
      ressalvas: extras.ressalvas ?? null,
      motivo_contrario: extras.motivo_contrario ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq('id', parecerId)

  if (error) return { success: false, error: error.message }

  const processoId = parecerAtual.processo_id
  const orgId = parecerAtual.organizacao_id

  if (veredito !== 'contrario') {
    await (supabase as any)
      .from('processos_licitatorios')
      .update({ etapa_atual: 11, fase_atual: 'gestor_publico' })
      .eq('id', processoId)
  }

  const { data: { user } } = await supabase.auth.getUser()

  if (veredito === 'contrario') {
    const { data: destinatarios } = await (supabase as any)
      .from('usuarios')
      .select('id')
      .eq('organizacao_id', orgId)
      .eq('papel', 'setor_licitacao')

    for (const dest of destinatarios ?? []) {
      await (supabase as any).from('notificacoes').insert({
        usuario_id: dest.id,
        organizacao_id: orgId,
        titulo: 'Parecer contrario emitido',
        mensagem: 'A procuradoria emitiu parecer contrario. Acesse para decidir entre corrigir ou arquivar.',
        link: `/processos/${processoId}/parecer`,
        processo_id: processoId,
      })
    }
  } else {
    const { data: destinatarios } = await (supabase as any)
      .from('usuarios')
      .select('id')
      .eq('organizacao_id', orgId)
      .eq('papel', 'gestor_publico')

    for (const dest of destinatarios ?? []) {
      await (supabase as any).from('notificacoes').insert({
        usuario_id: dest.id,
        organizacao_id: orgId,
        titulo: 'Parecer juridico aprovado',
        mensagem: 'Parecer juridico emitido com sucesso. O processo aguarda sua autorizacao.',
        link: `/processos/${processoId}/autorizacao`,
        processo_id: processoId,
      })
    }
  }

  // user declarado mas nao usado aqui; mantido para eventual log futuro
  void user

  await indexarPrecedente(parecerId)

  revalidatePath(`/processos/${processoId}/parecer`)
  revalidatePath('/procuradoria')
  return { success: true }
}

export async function gerarMinutaIA(
  processoId: string,
  parecerId: string,
  veredito: 'aprovar' | 'aprovar_com_ressalvas' | 'contrario'
): Promise<{ success: boolean; conteudo?: string; error?: string }> {
  const supabase = await createClient()

  const [procRaw, trRaw, dfdRaw, etpRaw, riscosRaw] = await Promise.all([
    supabase.from('processos_licitatorios').select('objeto, modalidade, valor_estimado').eq('id', processoId).single(),
    (supabase as any).from('termo_referencia').select('fundamentacao, modelo_execucao, requisitos_tecnicos, garantias, sancoes').eq('processo_id', processoId).maybeSingle(),
    (supabase as any).from('dfd').select('justificativa_necessidade').eq('processo_id', processoId).maybeSingle(),
    (supabase as any).from('etp').select('descricao_necessidade, justificativa_solucao, parcelamento').eq('processo_id', processoId).maybeSingle(),
    (supabase as any).from('mapa_riscos').select('riscos').eq('processo_id', processoId).maybeSingle(),
  ])

  const proc = procRaw.data as any
  const tr = trRaw.data as any
  const dfd = dfdRaw.data as any
  const etp = etpRaw.data as any
  const riscos = (riscosRaw.data as any)?.riscos as Array<{ identificacao: string; probabilidade: string; impacto: string; mitigacao: string }> | null

  const resumoRiscos = riscos?.length
    ? riscos.map(r => `${r.identificacao} (probabilidade ${r.probabilidade}, impacto ${r.impacto}; mitigacao: ${r.mitigacao})`).join('\n')
    : 'Mapa de riscos nao disponivel'

  const vereditos: Record<typeof veredito, string> = {
    aprovar:                'FAVORAVEL ao prosseguimento do processo',
    aprovar_com_ressalvas:  'FAVORAVEL COM RESSALVAS, condicionando o prosseguimento ao atendimento das observacoes registradas',
    contrario:              'CONTRARIO ao prosseguimento, recomendando a devolucao para correcao das irregularidades apontadas',
  }

  const prompt = `<instrucoes>
Voce e um Procurador Juridico Municipal especialista em licitacoes publicas.
Redija uma MINUTA DE PARECER JURIDICO em conformidade com o Art. 53 da Lei 14.133/21.
O veredito do procurador e: ${vereditos[veredito]}.
Redija com linguagem juridica formal, sem travessao (em dash).
Use estrutura: EMENTA / RELATORIO / FUNDAMENTACAO JURIDICA / CONCLUSAO.
Retorne APENAS o texto do parecer, sem saudacoes ou explicacoes adicionais.
</instrucoes>

<contexto_legal>
O parecer juridico previo e exigido pelo Art. 53 da Lei 14.133/21 e deve analisar a regularidade de toda a fase preparatoria:
- DFD e justificativa da necessidade (Art. 6, X)
- ETP e seus elementos obrigatorios (Art. 18, par. 1 e 2)
- Mapa de riscos (Art. 22)
- TR e seus parametros (Art. 6, XXIII)
- Adequacao da modalidade escolhida (Arts. 28 a 32)
No RELATORIO, descreva o que consta dos autos. Na FUNDAMENTACAO, analise cada documento da fase preparatoria a luz dos dispositivos citados, apontando conformidades e, quando o veredito nao for plenamente favoravel, as desconformidades concretas.
</contexto_legal>

<dados_processo>
Objeto: ${proc?.objeto ?? 'Nao informado'}
Modalidade: ${proc?.modalidade ?? 'Nao informada'}
Valor estimado: ${proc?.valor_estimado ? `R$ ${proc.valor_estimado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'Nao informado'}
Justificativa (DFD): ${dfd?.justificativa_necessidade ?? 'Nao disponivel'}
Necessidade (ETP): ${etp?.descricao_necessidade ?? 'Nao disponivel'}
Solucao escolhida (ETP): ${etp?.justificativa_solucao ?? 'Nao disponivel'}
Parcelamento (ETP): ${etp?.parcelamento ?? 'Nao disponivel'}
Fundamentacao (TR): ${tr?.fundamentacao ?? 'Nao disponivel'}
Requisitos tecnicos (TR): ${tr?.requisitos_tecnicos ?? 'Nao disponivel'}
Garantias (TR): ${tr?.garantias ?? 'Nao disponivel'}
Sancoes (TR): ${tr?.sancoes ?? 'Nao disponivel'}
Riscos mapeados (Art. 22):
${resumoRiscos}
</dados_processo>`

  const resultado = await executarIAComCreditos({
    prompt,
    tipoAcao: 'gerar_documento',
    processoId,
    temperature: 0.3,
  })

  if (!resultado.success) return { success: false, error: resultado.error }

  await (supabase as any)
    .from('pareceres')
    .update({ gerado_por_ia: true, updated_at: new Date().toISOString() })
    .eq('id', parecerId)

  return { success: true, conteudo: resultado.texto }
}

export async function analisarComIA(
  processoId: string,
  parecerId: string,
  textoParecer: string,
  veredito: string
): Promise<{ success: boolean; analise?: string; error?: string }> {
  if (textoParecer.length < 100) {
    return { success: false, error: 'Redija ao menos 100 caracteres antes de solicitar analise.' }
  }

  const supabase = await createClient()
  const procRaw = await supabase
    .from('processos_licitatorios')
    .select('objeto, modalidade')
    .eq('id', processoId)
    .single()

  const proc = procRaw.data as any

  const prompt = `<instrucoes>
Voce e um consultor juridico especialista em Lei 14.133/21.
Analise o PARECER JURIDICO abaixo e produza uma ANALISE CRITICA independente.
Voce deve:
1. Corroborar ou questionar os argumentos juridicos apresentados
2. Apontar riscos legais especificos ao objeto e modalidade
3. Citar artigos da Lei 14.133/21 aplicaveis
4. Indicar se o veredito ("${veredito}") esta juridicamente fundamentado
NAO reescreva o parecer. Produza apenas a analise critica, de forma objetiva.
Inclua ao final: "Analise gerada por IA. A decisao final e de responsabilidade exclusiva do procurador signatario."
</instrucoes>

<contexto>
Objeto do processo: ${proc?.objeto ?? 'Nao informado'}
Modalidade: ${proc?.modalidade ?? 'Nao informada'}
Veredito proposto: ${veredito}
</contexto>

<texto_parecer>
${textoParecer}
</texto_parecer>`

  const resultado = await executarIAComCreditos({
    prompt,
    tipoAcao: 'aprimorar_texto',
    processoId,
    temperature: 0.2,
  })

  if (!resultado.success) return { success: false, error: resultado.error }

  await (supabase as any)
    .from('pareceres')
    .update({ analise_ia: resultado.texto, updated_at: new Date().toISOString() })
    .eq('id', parecerId)

  return { success: true, analise: resultado.texto }
}

export async function buscarPrecedentes(
  processoId: string
): Promise<PrecedenteComScore[]> {
  const supabase = await createClient()

  const { data: usuarioRaw } = await supabase
    .from('usuarios')
    .select('organizacao_id')
    .eq('id', (await supabase.auth.getUser()).data.user?.id ?? '')
    .single()

  if (!usuarioRaw) return []
  const orgId = (usuarioRaw as any).organizacao_id

  const procRaw = await supabase
    .from('processos_licitatorios')
    .select('objeto, modalidade, valor_estimado')
    .eq('id', processoId)
    .single()

  const proc = procRaw.data as any
  if (!proc) return []

  const keywordsAlvo = extrairKeywords(proc.objeto ?? '')
  const modalidadeAlvo = proc.modalidade ?? ''
  const faixaAlvo = calcularFaixaValor(proc.valor_estimado)

  const { data: rawRows } = await (supabase as any)
    .from('pareceres_precedentes')
    .select(`
      id,
      parecer_id,
      organizacao_id,
      objeto_keywords,
      modalidade,
      faixa_valor,
      veredito,
      procurador_id,
      emitido_em,
      participa_pool,
      pareceres ( conteudo, processos_licitatorios ( objeto ) ),
      usuarios ( nome_completo )
    `)
    .or(`organizacao_id.eq.${orgId},participa_pool.eq.true`)
    .limit(50)

  const resultados: PrecedenteComScore[] = []

  for (const row of rawRows ?? []) {
    const kwRow = (row.objeto_keywords as string[]) ?? []
    const scoreKw  = scoreKeywords(keywordsAlvo, kwRow)
    const scoreMod = row.modalidade === modalidadeAlvo ? 100 : 0
    const scoreVal = scoreFaixaValor(faixaAlvo, row.faixa_valor ?? 'indefinido')

    const score = Math.round(scoreMod * 0.4 + scoreKw * 0.4 + scoreVal * 0.2)

    if (score < 30) continue

    const mesmaOrg = row.organizacao_id === orgId

    resultados.push({
      id: row.id,
      parecer_id: row.parecer_id,
      objeto_processo: (row.pareceres as any)?.processos_licitatorios?.objeto ?? '',
      modalidade: row.modalidade,
      faixa_valor: row.faixa_valor,
      veredito: row.veredito,
      procurador_nome: mesmaOrg ? ((row.usuarios as any)?.nome_completo ?? null) : null,
      emitido_em: row.emitido_em,
      score,
      score_modalidade: scoreMod,
      score_keywords: scoreKw,
      score_valor: scoreVal,
      mesma_org: mesmaOrg,
      conteudo_parecer: mesmaOrg ? ((row.pareceres as any)?.conteudo ?? null) : null,
    })
  }

  resultados.sort((a, b) => b.score - a.score)
  return resultados.slice(0, 5)
}

export async function indexarPrecedente(parecerId: string): Promise<void> {
  const supabase = await createClient()

  const { data: parecerRaw } = await (supabase as any)
    .from('pareceres')
    .select('processo_id, organizacao_id, procurador_id, veredito, created_at')
    .eq('id', parecerId)
    .single()

  if (!parecerRaw?.veredito) return

  const procRaw = await supabase
    .from('processos_licitatorios')
    .select('objeto, modalidade, valor_estimado')
    .eq('id', parecerRaw.processo_id)
    .single()

  const proc = procRaw.data as any
  if (!proc) return

  const { data: orgRaw } = await (supabase as any)
    .from('organizacoes')
    .select('participa_pool_precedentes')
    .eq('id', parecerRaw.organizacao_id)
    .single()

  await (supabase as any)
    .from('pareceres_precedentes')
    .upsert({
      parecer_id:     parecerId,
      organizacao_id: parecerRaw.organizacao_id,
      objeto_keywords: extrairKeywords(proc.objeto ?? ''),
      modalidade:     proc.modalidade,
      faixa_valor:    calcularFaixaValor(proc.valor_estimado),
      veredito:       parecerRaw.veredito,
      procurador_id:  parecerRaw.procurador_id,
      emitido_em:     parecerRaw.created_at,
      participa_pool: (orgRaw as any)?.participa_pool_precedentes ?? false,
    }, { onConflict: 'parecer_id' })
}

export interface ResumoProcesso {
  objeto: string
  modalidade: string
  valor_estimado: number | null
  numero_processo: string | null
  secretaria_nome: string | null
  justificativa: string | null
  requisitos_tecnicos: string | null
  resultados_pretendidos: string | null
  riscos_criticos: Array<{ descricao: string; probabilidade: string; impacto: string }>
  historico_etapas: Array<{ etapa: string; data: string; responsavel: string | null }>
}

export async function obterResumoProcesso(processoId: string): Promise<ResumoProcesso | null> {
  const supabase = await createClient()

  const [procRaw, trRaw, etpRaw, dfdRaw, riscosRaw] = await Promise.all([
    supabase.from('processos_licitatorios').select('objeto, modalidade, valor_estimado, numero_processo, secretaria_id, secretarias(nome)').eq('id', processoId).single(),
    (supabase as any).from('termo_referencia').select('requisitos_tecnicos').eq('processo_id', processoId).maybeSingle(),
    (supabase as any).from('etp').select('resultados_pretendidos').eq('processo_id', processoId).maybeSingle(),
    (supabase as any).from('dfd').select('justificativa_necessidade').eq('processo_id', processoId).maybeSingle(),
    (supabase as any).from('mapa_riscos').select('descricao, probabilidade, impacto').eq('processo_id', processoId).in('impacto', ['alto', 'critico']).limit(5),
  ])

  const proc = procRaw.data as any
  if (!proc) return null

  return {
    objeto:                 proc.objeto ?? '',
    modalidade:             proc.modalidade ?? '',
    valor_estimado:         proc.valor_estimado ?? null,
    numero_processo:        proc.numero_processo ?? null,
    secretaria_nome:        (proc.secretarias as any)?.nome ?? null,
    justificativa:          (dfdRaw.data as any)?.justificativa_necessidade ?? null,
    requisitos_tecnicos:    (trRaw.data as any)?.requisitos_tecnicos ?? null,
    resultados_pretendidos: (etpRaw.data as any)?.resultados_pretendidos ?? null,
    riscos_criticos:        riscosRaw.data ?? [],
    historico_etapas:       [],
  }
}
