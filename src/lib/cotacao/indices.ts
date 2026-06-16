// Servico de indice de atualizacao de precos (Art. 23, inciso II).
// Fonte real e oficial: API SGS do Banco Central (sem autenticacao).
//   IPCA  -> serie 433
//   IGP-M -> serie 189
//   INPC  -> serie 188
// Guardrail: se a API falhar, NAO inventa fator. Retorna fator 1 (sem correcao)
// e sinaliza indisponibilidade, mantendo o valor original.

import type { IndiceAtualizacao } from './types'

const SERIE_SGS: Record<IndiceAtualizacao, number> = {
  ipca: 433,
  igpm: 189,
  inpc: 188,
}

interface PontoSerie {
  // ano-mes no formato AAAAMM para comparacao
  competencia: number
  variacao: number // % no mes
}

interface SerieCache {
  pontos: PontoSerie[]
  buscadoEm: number
}

const CACHE_TTL_MS = 6 * 60 * 60 * 1000 // 6h
const cacheSeries = new Map<IndiceAtualizacao, SerieCache>()

function competenciaDe(data: Date): number {
  return data.getUTCFullYear() * 100 + (data.getUTCMonth() + 1)
}

function formatarDataBR(data: Date): string {
  const d = String(data.getUTCDate()).padStart(2, '0')
  const m = String(data.getUTCMonth() + 1).padStart(2, '0')
  return `${d}/${m}/${data.getUTCFullYear()}`
}

async function obterSerie(indice: IndiceAtualizacao): Promise<PontoSerie[]> {
  const cached = cacheSeries.get(indice)
  if (cached && Date.now() - cached.buscadoEm < CACHE_TTL_MS) {
    return cached.pontos
  }

  const dataFinal = new Date()
  const dataInicial = new Date(Date.UTC(dataFinal.getUTCFullYear() - 6, 0, 1)) // 6 anos cobre o limite legal de 1 ano com folga
  const codigo = SERIE_SGS[indice]
  const url =
    `https://api.bcb.gov.br/dados/serie/bcdata.sgs.${codigo}/dados?formato=json` +
    `&dataInicial=${formatarDataBR(dataInicial)}&dataFinal=${formatarDataBR(dataFinal)}`

  const resp = await fetch(url, { headers: { Accept: 'application/json' } })
  if (!resp.ok) {
    throw new Error(`SGS BCB retornou ${resp.status}`)
  }
  const dados = (await resp.json()) as Array<{ data: string; valor: string }>

  const pontos: PontoSerie[] = dados.map((d) => {
    const [, mes, ano] = d.data.split('/')
    return {
      competencia: Number(ano) * 100 + Number(mes),
      variacao: Number(d.valor),
    }
  })

  cacheSeries.set(indice, { pontos, buscadoEm: Date.now() })
  return pontos
}

export interface FatorAtualizacao {
  fator: number
  disponivel: boolean
}

/**
 * Fator acumulado do indice entre o mes seguinte ao da origem e o mes corrente.
 * valor_atualizado = valor_original * fator.
 */
export async function obterFatorAtualizacao(
  indice: IndiceAtualizacao,
  dataOrigem: Date,
): Promise<FatorAtualizacao> {
  try {
    const serie = await obterSerie(indice)
    const compOrigem = competenciaDe(dataOrigem)
    const compHoje = competenciaDe(new Date())

    const relevantes = serie.filter(
      (p) => p.competencia > compOrigem && p.competencia <= compHoje,
    )

    const fator = relevantes.reduce((acc, p) => acc * (1 + p.variacao / 100), 1)
    return { fator, disponivel: true }
  } catch {
    // Sem correcao quando a fonte oficial esta indisponivel (nao inventa fator)
    return { fator: 1, disponivel: false }
  }
}

export function aplicarFator(valorOriginal: number, fator: number): number {
  return Math.round((valorOriginal * fator + Number.EPSILON) * 100) / 100
}
