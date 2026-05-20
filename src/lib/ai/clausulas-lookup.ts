import { createClient } from '@/lib/supabase/server'

export interface ClausulaEncontrada {
  id: string
  tipo_campo: string
  texto_aprovado: string
  score_qualidade: number
  uso_count: number
}

export interface LookupResult {
  clausulas: ClausulaEncontrada[]
  cobertura: number
  tokensEstimadosEconomizados: number
  modo: 'contexto' | 'validacao' | 'none'
}

export async function buscarClausulasRelevantes(
  orgId: string,
  documento: 'dfd' | 'etp' | 'tr',
  modalidade: string,
  categoriaObjeto: string,
  camposNecessarios: string[]
): Promise<LookupResult> {
  if (camposNecessarios.length === 0) {
    return { clausulas: [], cobertura: 0, tokensEstimadosEconomizados: 0, modo: 'none' }
  }

  try {
    const supabase = await createClient()

    const { data: exatosRaw } = await (supabase as any)
      .from('clausulas_aprendidas')
      .select('id, tipo_campo, texto_aprovado, score_qualidade, uso_count')
      .eq('organizacao_id', orgId)
      .eq('documento', documento)
      .eq('modalidade', modalidade)
      .in('tipo_campo', camposNecessarios)
      .order('score_qualidade', { ascending: false })
      .order('uso_count', { ascending: false })

    const exatos = (exatosRaw ?? []) as ClausulaEncontrada[]
    const camposComMatch = new Set(exatos.map((c: ClausulaEncontrada) => c.tipo_campo))
    const camposSemMatch = camposNecessarios.filter(c => !camposComMatch.has(c))

    const extras: ClausulaEncontrada[] = []
    if (camposSemMatch.length > 0 && categoriaObjeto.trim()) {
      const queryFTS = categoriaObjeto.trim().split(/\s+/).join(' & ')
      const { data: ftsRaw } = await (supabase as any)
        .from('clausulas_aprendidas')
        .select('id, tipo_campo, texto_aprovado, score_qualidade, uso_count')
        .eq('organizacao_id', orgId)
        .eq('documento', documento)
        .in('tipo_campo', camposSemMatch)
        .textSearch('busca_tsvector', queryFTS, { config: 'portuguese' })
        .order('score_qualidade', { ascending: false })
        .limit(camposSemMatch.length)
      extras.push(...((ftsRaw ?? []) as ClausulaEncontrada[]))
    }

    // Deduplicar por tipo_campo (score mais alto vence)
    const porCampo = new Map<string, ClausulaEncontrada>()
    for (const c of [...exatos, ...extras]) {
      const atual = porCampo.get(c.tipo_campo)
      if (!atual || c.score_qualidade > atual.score_qualidade) {
        porCampo.set(c.tipo_campo, c)
      }
    }
    const clausulasFinais = Array.from(porCampo.values())

    const cobertura = clausulasFinais.length / camposNecessarios.length

    const { count } = await (supabase as any)
      .from('clausulas_aprendidas')
      .select('id', { count: 'exact', head: true })
      .eq('organizacao_id', orgId)

    const orgMadura = (count ?? 0) >= 50
    const modo: 'validacao' | 'contexto' | 'none' =
      cobertura >= 0.8 && orgMadura ? 'validacao' :
      cobertura >= 0.3 ? 'contexto' : 'none'

    const tokensEstimadosEconomizados =
      modo === 'validacao' ? clausulasFinais.length * 200 :
      modo === 'contexto' ? clausulasFinais.length * 50 : 0

    return { clausulas: clausulasFinais, cobertura, tokensEstimadosEconomizados, modo }
  } catch {
    return { clausulas: [], cobertura: 0, tokensEstimadosEconomizados: 0, modo: 'none' }
  }
}

export function injetarClausulasNoPrompt(prompt: string, lookup: LookupResult): string {
  if (lookup.modo === 'none' || lookup.clausulas.length === 0) return prompt

  const contexto = lookup.clausulas
    .map(c => `[${c.tipo_campo}]: ${c.texto_aprovado}`)
    .join('\n\n')

  const instrucao = lookup.modo === 'validacao'
    ? 'Use os textos abaixo como base. Valide e ajuste apenas o necessario para conformidade legal:'
    : 'Use os textos abaixo como referencia de estilo e conteudo para esta organizacao:'

  return `${instrucao}\n\n${contexto}\n\n---\n\n${prompt}`
}
