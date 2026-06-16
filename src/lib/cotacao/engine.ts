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
const MINIMO_PRECOS = 3

export interface RegistroCalculo {
  // valor ja atualizado pelo indice (inciso II)
  valorAtualizado: number
}

export interface ResultadoCalculoItem {
  mediana: number
  media: number
  precoEstimado: number // = min(media, mediana): media como referencia, mediana como teto legal
  precosUtilizados: number // quantidade efetivamente considerada (>= 3 para status ok)
  propostasEncontradas: number // total localizado na base
  indicesOutliers: number[] // posicoes (base 0) dos registros marcados como outlier
  status: 'ok' | 'pendente_insuficiente'
}

/**
 * Calcula estatisticas de um item a partir dos registros ja atualizados.
 *
 * Estrategia:
 *  1. Mediana inicial sobre todos os valores validos.
 *  2. Marca outliers (>30% da mediana).
 *  3. Recalcula mediana/media sobre o conjunto sem outliers, desde que reste o
 *     minimo legal de 3 precos. Se a exclusao derrubar abaixo de 3, mantem todos
 *     (com os outliers ainda sinalizados) para nao descartar dados validos.
 *  4. Preco estimado = min(media, mediana): a mediana funciona como teto (inciso I).
 *  5. status = 'ok' apenas com 3 ou mais precos considerados.
 */
export function calcularItem(registros: RegistroCalculo[]): ResultadoCalculoItem {
  const valores = registros
    .map((r) => r.valorAtualizado)
    .filter((v) => typeof v === 'number' && v > 0)

  const propostasEncontradas = valores.length

  if (propostasEncontradas === 0) {
    return {
      mediana: 0,
      media: 0,
      precoEstimado: 0,
      precosUtilizados: 0,
      propostasEncontradas: 0,
      indicesOutliers: [],
      status: 'pendente_insuficiente',
    }
  }

  const medianaInicial = calcularMediana(valores)

  const indicesOutliers: number[] = []
  registros.forEach((r, i) => {
    const v = r.valorAtualizado
    if (typeof v === 'number' && v > 0 && ehOutlier(v, medianaInicial)) {
      indicesOutliers.push(i)
    }
  })

  const semOutliers = valores.filter((v) => !ehOutlier(v, medianaInicial))

  // So exclui outliers se ainda restar o minimo legal de precos
  const considerados = semOutliers.length >= MINIMO_PRECOS ? semOutliers : valores

  const mediana = calcularMediana(considerados)
  const media = calcularMedia(considerados)
  const precoEstimado = Math.min(media, mediana)
  const precosUtilizados = considerados.length

  return {
    mediana: arredondar(mediana),
    media: arredondar(media),
    precoEstimado: arredondar(precoEstimado),
    precosUtilizados,
    propostasEncontradas,
    indicesOutliers,
    status: precosUtilizados >= MINIMO_PRECOS ? 'ok' : 'pendente_insuficiente',
  }
}

// Arredonda para 2 casas, evitando ruido de ponto flutuante
export function arredondar(valor: number, casas = 2): number {
  const f = 10 ** casas
  return Math.round((valor + Number.EPSILON) * f) / f
}

export { LIMITE_OUTLIER_SUP, LIMITE_OUTLIER_INF, MINIMO_PRECOS }
