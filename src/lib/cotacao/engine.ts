// Engine de calculo da pesquisa de precos. Funcoes puras, sem I/O.
// Regra legal central (Art. 23): a mediana e o teto do preco estimado (inciso I).

export function calcularMediana(valores: number[]): number {
  if (valores.length === 0) return 0
  const ordenados = [...valores].sort((a, b) => a - b)
  const meio = Math.floor(ordenados.length / 2)
  return ordenados.length % 2 === 0
    ? (ordenados[meio - 1] + ordenados[meio]) / 2
    : ordenados[meio]
}

export function calcularMedia(valores: number[]): number {
  if (valores.length === 0) return 0
  return valores.reduce((acc, v) => acc + v, 0) / valores.length
}

// Outlier: variacao superior a 30% em relacao a mediana (boas praticas TCU).
export function ehOutlier(valor: number, mediana: number): boolean {
  if (mediana <= 0) return false
  return valor > mediana * 1.3 || valor < mediana * 0.7
}

const LIMITE_OUTLIER_SUP = 1.3
const LIMITE_OUTLIER_INF = 0.7
const MINIMO_PRECOS_PADRAO = 3

export interface RegistroCalculo {
  // valor ja atualizado pelo indice (inciso II)
  valorAtualizado: number
  // data da licitacao (ISO) para selecionar as mais recentes
  data?: string | null
}

export interface ResultadoCalculoItem {
  mediana: number
  media: number
  precoEstimado: number // = min(media, mediana): media como referencia, mediana como teto legal
  precosUtilizados: number // quantidade efetivamente usada no calculo (alvo: o minimo configurado)
  propostasEncontradas: number // total de precos validos localizados
  indicesOutliers: number[] // posicoes (base 0) dos registros marcados como outlier
  indicesUtilizados: number[] // posicoes (base 0) dos registros efetivamente usados no calculo
  status: 'ok' | 'pendente_insuficiente'
}

/**
 * Calcula estatisticas de um item a partir dos registros ja atualizados.
 *
 * Estrategia (modelo Banco de Precos):
 *  1. Mediana inicial sobre todos os valores validos.
 *  2. Marca outliers (>30% da mediana).
 *  3. Do conjunto sem outliers, seleciona as `minimo` cotacoes MAIS RECENTES
 *     (recencia e exigencia legal). Apenas essas entram no calculo.
 *  4. Mediana/media/estimado sao calculados sobre as selecionadas.
 *  5. Preco estimado = min(media, mediana): a mediana funciona como teto (inciso I).
 *  6. status = 'ok' apenas quando ha pelo menos `minimo` cotacoes selecionadas.
 */
export function calcularItem(
  registros: RegistroCalculo[],
  minimo: number = MINIMO_PRECOS_PADRAO,
): ResultadoCalculoItem {
  const n = Math.max(1, Math.floor(minimo))

  const validos = registros
    .map((r, i) => ({ i, v: r.valorAtualizado, d: r.data ?? null }))
    .filter((x) => typeof x.v === 'number' && x.v > 0)

  const propostasEncontradas = validos.length

  if (propostasEncontradas === 0) {
    return {
      mediana: 0,
      media: 0,
      precoEstimado: 0,
      precosUtilizados: 0,
      propostasEncontradas: 0,
      indicesOutliers: [],
      indicesUtilizados: [],
      status: 'pendente_insuficiente',
    }
  }

  const medianaInicial = calcularMediana(validos.map((x) => x.v))

  const indicesOutliers = validos.filter((x) => ehOutlier(x.v, medianaInicial)).map((x) => x.i)
  const naoOutlier = validos.filter((x) => !ehOutlier(x.v, medianaInicial))

  // Pool de selecao: nao-outliers; se todos forem outliers, usa todos os validos
  const pool = naoOutlier.length > 0 ? naoOutlier : validos

  // Mais recentes primeiro (registros sem data vao para o fim)
  pool.sort((a, b) => (b.d ?? '').localeCompare(a.d ?? ''))

  const selecionados = pool.slice(0, n)
  const indicesUtilizados = selecionados.map((x) => x.i)
  const valores = selecionados.map((x) => x.v)

  const mediana = calcularMediana(valores)
  const media = calcularMedia(valores)
  const precoEstimado = Math.min(media, mediana)
  const precosUtilizados = selecionados.length

  return {
    mediana: arredondar(mediana),
    media: arredondar(media),
    precoEstimado: arredondar(precoEstimado),
    precosUtilizados,
    propostasEncontradas,
    indicesOutliers,
    indicesUtilizados,
    status: precosUtilizados >= n ? 'ok' : 'pendente_insuficiente',
  }
}

// Arredonda para 2 casas, evitando ruido de ponto flutuante
export function arredondar(valor: number, casas = 2): number {
  const f = 10 ** casas
  return Math.round((valor + Number.EPSILON) * f) / f
}

export { LIMITE_OUTLIER_SUP, LIMITE_OUTLIER_INF, MINIMO_PRECOS_PADRAO }
