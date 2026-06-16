// Registry de fontes de preco (Strategy Pattern).
// Permite selecionar/estender fontes sem alterar a engine ou as actions.

import type { FontePreco, TipoFontePreco } from '../types'
import { ComprasGovFonte } from './compras-gov'
import { PrecoPublicoFonte } from './preco-publico'

const registry: Record<string, FontePreco> = {
  compras_governamentais: new ComprasGovFonte(),
  preco_publico: new PrecoPublicoFonte(),
}

export function obterFonte(tipo: TipoFontePreco): FontePreco | null {
  return registry[tipo] ?? null
}

// Fontes que consultam APIs externas por item (exclui web e pesquisa direta,
// que tem fluxos proprios de captura).
export const FONTES_CONSULTAVEIS: TipoFontePreco[] = ['compras_governamentais', 'preco_publico']

export const FONTE_PADRAO: TipoFontePreco = 'compras_governamentais'
