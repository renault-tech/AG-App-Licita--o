// Tipos do dominio de Cotacao de Precos (Lei 14.133/2021, Art. 23)
// Espelha o layout de layout_pesquisa_precos_pncp.json

export type TipoFontePreco =
  | 'compras_governamentais'
  | 'preco_publico'
  | 'preco_web'
  | 'pesquisa_direta'

export type IndiceAtualizacao = 'ipca' | 'igpm' | 'inpc'

export type TipoCatalogoItem = 'material' | 'servico'

export type StatusItemCotacao = 'ok' | 'pendente_insuficiente'

// Rotulos exibidos no relatorio, conforme enum do layout
export const ROTULO_FONTE: Record<TipoFontePreco, string> = {
  compras_governamentais: 'Preco Compras Governamentais',
  preco_publico: 'Preco Publico',
  preco_web: 'Preco Web',
  pesquisa_direta: 'Pesquisa Direta',
}

// Parametros de consulta a uma fonte de precos
export interface ConsultaItemParams {
  codigoCatalogo: string
  tipoCatalogo: TipoCatalogoItem
  estado?: string
  codigoMunicipio?: number
  dataCompraInicio?: string // YYYY-MM-DD
  dataCompraFim?: string // YYYY-MM-DD
  limite?: number
}

// Registro bruto de preco retornado por uma fonte, antes de atualizacao por indice.
// Campos PNCP e Web coexistem; cada fonte preenche apenas os pertinentes.
// Guardrail: nenhum campo pode ser inventado. Ausencia de dado = null.
export interface RegistroPrecoBruto {
  origemId: string
  orgaoCnpj: string | null
  orgaoNome: string | null
  unidadeCodigo: string | null
  unidadeNome: string | null
  identificacao: string
  dataLicitacao: string | null // ISO date
  valorOriginal: number
  // Fonte Web (inciso III)
  fonteNome?: string | null
  url?: string | null
  descricaoProduto?: string | null
  dataHoraAcesso?: string | null // ISO datetime
}

export interface ResultadoFonte {
  tipoFonte: TipoFontePreco
  registros: RegistroPrecoBruto[]
  erro?: string
}

// Contrato comum de qualquer fonte de precos (Strategy Pattern)
export interface FontePreco {
  tipo: TipoFontePreco
  consultar(params: ConsultaItemParams): Promise<ResultadoFonte>
}

// ------------------------------------------------------------
// Estruturas do relatorio (espelham layout_pesquisa_precos_pncp.json)
// ------------------------------------------------------------

export interface ItemEntrada {
  numero: number
  titulo: string
  descricao: string
  codigoCatalogo: string
  tipoCatalogo: TipoCatalogoItem
  unidade: string
  quantidade: number
}

export interface RegistroRelatorio {
  indice: number
  orgaoCnpj: string | null
  orgaoNome: string | null
  unidadeCodigo: string | null
  unidadeNome: string | null
  identificacao: string
  dataLicitacao: string | null
  valorOriginal: number
  valorAtualizado: number
  // Fonte web (inciso III)
  fonteNome?: string | null
  url?: string | null
  descricaoProduto?: string | null
  dataHoraAcesso?: string | null
  isOutlier: boolean
  // true = usada no calculo (uma das N mais recentes); false = encontrada mas nao usada
  utilizado: boolean
}

export interface FonteRelatorio {
  tipo: TipoFontePreco
  valorUnitario: number
  registros: RegistroRelatorio[]
}

export interface ItemRelatorio {
  id?: string // presente quando carregado do banco (para edicao/anexos web)
  numero: number
  titulo: string
  descricao: string
  unidade: string
  quantidade: number
  precosUtilizados: number
  propostasEncontradas: number
  precoEstimado: number
  percentual: number | null
  precoEstCalculado: number
  total: number
  mediana: number
  media: number
  status: StatusItemCotacao
  fontes: FonteRelatorio[]
  avisos: string[]
}

export interface RelatorioCotacao {
  indiceAtualizacao: IndiceAtualizacao
  indiceDisponivel: boolean
  itens: ItemRelatorio[]
  valorTotalGeral: number
}
