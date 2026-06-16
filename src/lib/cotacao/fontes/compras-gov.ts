// Adapter da base "Preco Compras Governamentais".
// Fonte real confirmada: API de Pesquisa de Preco do Compras.gov.br
//   GET /modulo-pesquisa-preco/1_consultarMaterial
//   GET /modulo-pesquisa-preco/3_consultarServico
// Chave de consulta: codigoItemCatalogo (CATMAT para material, CATSER para servico).
// Guardrail: usa exclusivamente os campos retornados pela API. Ausencia = null.

import type {
  ConsultaItemParams,
  FontePreco,
  RegistroPrecoBruto,
  ResultadoFonte,
} from '../types'

const BASE_URL = 'https://dadosabertos.compras.gov.br/modulo-pesquisa-preco'
const TIMEOUT_MS = 25000
// A API ignora dataCompraInicio/Fim, entao buscamos o maximo permitido (500) e
// filtramos a janela temporal no cliente (limite legal de 1 ano, Art. 23, II).
const TAMANHO_PAGINA = 500 // a API exige entre 10 e 500

// Estrutura real retornada pela API (campos relevantes)
interface RegistroComprasGov {
  idCompra?: number | string
  idCompraItem?: string
  idItemCompra?: number
  dataCompra?: string
  dataResultado?: string
  niFornecedor?: string
  nomeFornecedor?: string
  codigoItemCatalogo?: number
  quantidade?: number
  precoUnitario?: number
  descricaoItem?: string
  descricaoDetalhadaItem?: string
  nomeUnidadeFornecimento?: string
  codigoUasg?: string
  nomeUasg?: string
  codigoOrgao?: number
  nomeOrgao?: string
  estado?: string
  codigoMunicipio?: number
  municipio?: string
}

interface RespostaComprasGov {
  resultado?: RegistroComprasGov[]
}

// Cache simples em memoria por chave de consulta (resiliencia e economia)
const CACHE_TTL_MS = 30 * 60 * 1000 // 30min
const cache = new Map<string, { dados: ResultadoFonte; em: number }>()

function chaveCache(params: ConsultaItemParams): string {
  return JSON.stringify({
    c: params.codigoCatalogo,
    t: params.tipoCatalogo,
    e: params.estado ?? '',
    m: params.codigoMunicipio ?? '',
    di: params.dataCompraInicio ?? '',
    df: params.dataCompraFim ?? '',
  })
}

function mapearRegistro(r: RegistroComprasGov): RegistroPrecoBruto | null {
  const valor = Number(r.precoUnitario)
  if (!valor || valor <= 0) return null

  const data = r.dataResultado ?? r.dataCompra ?? null
  const identificacao =
    r.idCompraItem ??
    (r.idCompra != null ? `${r.idCompra}${r.idItemCompra != null ? `-${r.idItemCompra}` : ''}` : '')

  return {
    origemId: String(r.idCompraItem ?? r.idItemCompra ?? r.idCompra ?? ''),
    // A API federal identifica o orgao por UASG, nao expoe CNPJ do orgao: mantem null (nunca inventa)
    orgaoCnpj: null,
    orgaoNome: r.nomeOrgao ?? r.nomeUasg ?? null,
    unidadeCodigo: r.codigoUasg ?? null,
    unidadeNome: r.nomeUasg ?? null,
    identificacao: String(identificacao),
    dataLicitacao: data,
    valorOriginal: valor,
  }
}

export class ComprasGovFonte implements FontePreco {
  tipo = 'compras_governamentais' as const

  async consultar(params: ConsultaItemParams): Promise<ResultadoFonte> {
    const chave = chaveCache(params)
    const emCache = cache.get(chave)
    if (emCache && Date.now() - emCache.em < CACHE_TTL_MS) {
      return emCache.dados
    }

    const endpoint =
      params.tipoCatalogo === 'servico' ? '3_consultarServico' : '1_consultarMaterial'

    const qs = new URLSearchParams({
      pagina: '1',
      tamanhoPagina: String(params.limite ? Math.min(Math.max(params.limite, 10), 500) : TAMANHO_PAGINA),
      codigoItemCatalogo: params.codigoCatalogo,
    })
    if (params.estado) qs.set('estado', params.estado)
    if (params.codigoMunicipio) qs.set('codigoMunicipio', String(params.codigoMunicipio))
    if (params.dataCompraInicio) qs.set('dataCompraInicio', params.dataCompraInicio)
    if (params.dataCompraFim) qs.set('dataCompraFim', params.dataCompraFim)

    const url = `${BASE_URL}/${endpoint}?${qs.toString()}`

    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)

    try {
      const resp = await fetch(url, {
        headers: { Accept: 'application/json' },
        signal: controller.signal,
      })

      if (!resp.ok) {
        return { tipoFonte: this.tipo, registros: [], erro: `API retornou status ${resp.status}` }
      }

      const json = (await resp.json()) as RespostaComprasGov
      const brutos = json.resultado ?? []
      let registros = brutos
        .map(mapearRegistro)
        .filter((r): r is RegistroPrecoBruto => r !== null)

      // Filtro temporal client-side: a API nao respeita dataCompraInicio.
      // Mantem apenas registros dentro da janela legal (Art. 23, II, ate 1 ano).
      if (params.dataCompraInicio) {
        const corte = params.dataCompraInicio
        registros = registros.filter((r) => r.dataLicitacao != null && r.dataLicitacao >= corte)
      }
      // Mais recentes primeiro
      registros.sort((a, b) => (b.dataLicitacao ?? '').localeCompare(a.dataLicitacao ?? ''))

      const resultado: ResultadoFonte = { tipoFonte: this.tipo, registros }
      cache.set(chave, { dados: resultado, em: Date.now() })
      return resultado
    } catch (e) {
      const motivo = e instanceof Error && e.name === 'AbortError' ? 'tempo limite excedido' : 'falha de conexao'
      return { tipoFonte: this.tipo, registros: [], erro: `Nao foi possivel consultar o Compras.gov.br (${motivo}).` }
    } finally {
      clearTimeout(timer)
    }
  }
}
