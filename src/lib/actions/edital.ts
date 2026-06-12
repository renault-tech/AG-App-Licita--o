'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'
import { executarIAComCreditos } from '@/lib/ai/wrapper'
import { registrarAuditoria } from '@/lib/audit/log'
import type { ProcessoLicitatorioRow, EditalRow, ModalidadeLicitacao } from '@/types/database'

export async function obterEdital(processoId: string) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data } = await supabase
    .from('edital')
    .select('*, processos_licitatorios(objeto, modalidade)')
    .eq('processo_id', processoId)
    .maybeSingle()

  if (data) return data

  const { data: pRaw } = await supabase
    .from('processos_licitatorios')
    .select('*')
    .eq('id', processoId)
    .maybeSingle()

  const p = pRaw as ProcessoLicitatorioRow | null
  if (!p) return null

  const conteudo = gerarTemplateEdital(p.modalidade, p.objeto)

  const supabaseAny = supabase as any
  const { data: novo } = await supabaseAny
    .from('edital')
    .insert({
      processo_id: processoId,
      organizacao_id: p.organizacao_id,
      criado_por: user.id,
      conteudo,
      status: 'rascunho',
      gerado_por_ia: false,
    })
    .select('*, processos_licitatorios(objeto, modalidade)')
    .single()

  return novo ?? null
}

export async function atualizarEdital(editalId: string, conteudo: EditalRow['conteudo']) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { success: false as const, error: 'Nao autenticado.' }

  const { data: usuarioData } = await supabase
    .from('usuarios')
    .select('id, nome_completo, papel, organizacao_id')
    .eq('id', user.id)
    .maybeSingle()

  const supabaseAny = supabase as any

  const { error } = await supabaseAny
    .from('edital')
    .update({ conteudo, updated_at: new Date().toISOString() })
    .eq('id', editalId)

  if (error) return { success: false as const, error: error.message as string }

  if (usuarioData) {
    const u = usuarioData as any
    void registrarAuditoria({
      organizacaoId: u.organizacao_id,
      usuarioId:     user.id,
      nomeUsuario:   u.nome_completo,
      papelUsuario:  u.papel,
      categoria:     'documento',
      acao:          'edital.editado',
      recursoId:     editalId,
    })
  }

  revalidatePath('/dashboard')
  return { success: true as const }
}

function gerarTemplateEdital(modalidade: ModalidadeLicitacao, objeto: string) {
  const tipo = modalidade.toUpperCase().replace(/_/g, ' ')
  return [
    { id: '1', titulo: 'Preâmbulo', texto: `Edital de ${tipo} para ${objeto}. Em conformidade com a Lei nº 14.133/21.` },
    { id: '2', titulo: 'Objeto', texto: `O presente edital tem por objeto a contratação de: ${objeto}.` },
    { id: '3', titulo: 'Condições de Participação', texto: 'Poderão participar os interessados que atenderem às exigências de habilitação...' },
    { id: '4', titulo: 'Apresentação das Propostas', texto: 'As propostas deverão ser apresentadas eletronicamente até a data estipulada...' },
    { id: '5', titulo: 'Julgamento das Propostas', texto: 'O critério de julgamento será o de menor preço global, conforme disposto no Termo de Referência.' },
    { id: '6', titulo: 'Habilitação', texto: 'Os documentos exigidos para habilitação jurídica, fiscal e trabalhista estão listados em anexo.' },
    { id: '7', titulo: 'Recursos', texto: 'O prazo para interposição de recursos será de 3 (três) dias úteis.' },
    { id: '8', titulo: 'Disposições Gerais', texto: 'Os casos omissos serão resolvidos pela autoridade competente.' },
  ]
}

export async function revisarEditalComIA(textoOriginal: string, modalidade: ModalidadeLicitacao) {
  if (!textoOriginal) return { success: false as const, error: 'Texto vazio.' }

  const prompt = `<instrucoes>
Voce e um pregoeiro experiente, especialista na Lei 14.133/21.
Aprimore e refine a clausula de edital abaixo, ajustando a linguagem ao padrao juridico formal de editais publicos.
Mantenha todos os dados objetivos (valores, prazos, quantidades) do texto original.
Nao use travessao (em dash); use virgulas ou ponto e virgula.
</instrucoes>

<contexto>
  <modalidade>${modalidade}</modalidade>
  <referencia_legal>Art. 25 da Lei 14.133/21 (conteudo do edital)</referencia_legal>
</contexto>

<texto_original>
${textoOriginal}
</texto_original>

<formato_saida>
Retorne EXCLUSIVAMENTE o texto final aprimorado da clausula. Sem aspas iniciais/finais, sem explicacoes.
</formato_saida>`

  return executarIAComCreditos({ prompt, tipoAcao: 'aprimorar_texto', temperature: 0.2 })
}

// Gera a minuta completa do edital via IA, sintetizando o TR e os dados do processo.
// Substitui o template generico por clausulas adaptadas ao objeto e a modalidade.
export async function gerarEditalIA(
  processoId: string
): Promise<{ success: true; secoes: Array<{ id: string; titulo: string; texto: string }> } | { success: false; error: string }> {
  const supabase = await createClient()

  const [procRes, trRes, riscosRes] = await Promise.all([
    supabase
      .from('processos_licitatorios')
      .select('objeto, modalidade, valor_estimado, prazo_dias')
      .eq('id', processoId)
      .single(),
    (supabase as any)
      .from('termo_referencia')
      .select('fundamentacao, requisitos_tecnicos, modelo_execucao, criterios_medicao, forma_pagamento, garantias, sancoes')
      .eq('processo_id', processoId)
      .maybeSingle(),
    (supabase as any)
      .from('mapa_riscos')
      .select('riscos')
      .eq('processo_id', processoId)
      .maybeSingle(),
  ])

  const proc = procRes.data as Pick<ProcessoLicitatorioRow, 'objeto' | 'modalidade' | 'valor_estimado' | 'prazo_dias'> | null
  if (!proc) return { success: false, error: 'Processo não encontrado.' }

  const tr = trRes.data as {
    fundamentacao: string | null
    requisitos_tecnicos: string | null
    modelo_execucao: string | null
    criterios_medicao: string | null
    forma_pagamento: string | null
    garantias: string | null
    sancoes: string | null
  } | null

  const qtdRiscos = ((riscosRes.data as any)?.riscos as unknown[] | null)?.length ?? 0

  const prompt = `<instrucoes>
Voce e um pregoeiro experiente, especialista na Lei 14.133/21, redigindo a minuta de um edital municipal.
Gere as clausulas do edital ADAPTADAS ao objeto e a modalidade informados, sintetizando o conteudo do Termo de Referencia fornecido.
Nao invente valores, datas, numeros de processo ou dotacoes que nao foram fornecidos.
Nao use travessao (em dash); use virgulas ou ponto e virgula.
</instrucoes>

<contexto_legal>
Art. 25 da Lei 14.133/21: o edital devera conter o objeto da licitacao e as regras de convocacao, julgamento, habilitacao, recursos, penalidades, fiscalizacao e gestao do contrato, entrega do objeto e condicoes de pagamento.
Adapte as regras procedimentais a modalidade (Arts. 28 a 32): pregao exige inversao de fases e lances; concorrencia admite criterios diversos de julgamento; dispensa e inexigibilidade seguem os Arts. 75 e 74 respectivamente.
</contexto_legal>

<dados_processo>
  <objeto>${proc.objeto}</objeto>
  <modalidade>${proc.modalidade}</modalidade>
  ${proc.valor_estimado ? `<valor_estimado>R$ ${proc.valor_estimado.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</valor_estimado>` : ''}
  ${proc.prazo_dias ? `<prazo_execucao>${proc.prazo_dias} dias</prazo_execucao>` : ''}
</dados_processo>

${tr ? `<termo_referencia>
  ${tr.fundamentacao ? `<fundamentacao>${tr.fundamentacao.slice(0, 1500)}</fundamentacao>` : ''}
  ${tr.requisitos_tecnicos ? `<requisitos_tecnicos>${tr.requisitos_tecnicos.slice(0, 1500)}</requisitos_tecnicos>` : ''}
  ${tr.modelo_execucao ? `<modelo_execucao>${tr.modelo_execucao.slice(0, 1000)}</modelo_execucao>` : ''}
  ${tr.criterios_medicao ? `<criterios_medicao>${tr.criterios_medicao.slice(0, 1000)}</criterios_medicao>` : ''}
  ${tr.forma_pagamento ? `<forma_pagamento>${tr.forma_pagamento.slice(0, 1000)}</forma_pagamento>` : ''}
  ${tr.garantias ? `<garantias>${tr.garantias.slice(0, 1000)}</garantias>` : ''}
  ${tr.sancoes ? `<sancoes>${tr.sancoes.slice(0, 1000)}</sancoes>` : ''}
</termo_referencia>` : '<termo_referencia>Nao disponivel; use linguagem generica adequada sem inventar especificacoes.</termo_referencia>'}
${qtdRiscos > 0 ? `<observacao>O processo possui mapa de riscos com ${qtdRiscos} riscos mapeados (Art. 22); mencione a matriz de riscos na clausula de gestao contratual.</observacao>` : ''}

<formato_saida>
Retorne EXCLUSIVAMENTE um array JSON valido (sem formatacao markdown, sem \`\`\`json) com 8 a 12 objetos, um por clausula, no formato exato:
{"id": "1", "titulo": "Preambulo", "texto": "texto completo da clausula"}
As clausulas devem cobrir no minimo: preambulo, objeto, condicoes de participacao, apresentacao das propostas, julgamento, habilitacao, recursos, sancoes, pagamento e disposicoes gerais.
Cada texto deve ser substancial e especifico ao objeto, nao generico.
</formato_saida>`

  const resultado = await executarIAComCreditos({
    prompt,
    tipoAcao: 'gerar_documento',
    processoId,
    temperature: 0.3,
  })

  if (!resultado.success) return resultado

  try {
    const clean = resultado.texto.replace(/```json/g, '').replace(/```/g, '').trim()
    const secoes = JSON.parse(clean) as Array<{ id: string; titulo: string; texto: string }>
    if (!Array.isArray(secoes) || secoes.length === 0) {
      return { success: false, error: 'Resposta da IA em formato inválido.' }
    }
    // Normaliza ids sequenciais para evitar colisoes
    const normalizadas = secoes.map((s, i) => ({
      id: String(i + 1),
      titulo: String(s.titulo ?? `Cláusula ${i + 1}`),
      texto: String(s.texto ?? ''),
    }))
    return { success: true, secoes: normalizadas }
  } catch {
    return { success: false, error: 'Resposta da IA em formato inválido. Tente novamente.' }
  }
}
