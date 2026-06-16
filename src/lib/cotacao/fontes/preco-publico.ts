// Adapter da base "Preco Publico" (PNCP - Portal Nacional de Contratacoes Publicas).
//
// IMPORTANTE: a API de Consulta do PNCP (pncp.gov.br/api/consulta) e organizada por
// contratacao/ata/contrato e NAO oferece endpoint de pesquisa de preco por item de
// catalogo (CATMAT/CATSER) com preco unitario. Portanto nao ha caminho direto, hoje,
// para compor mediana por item a partir dela.
//
// Guardrail anti-alucinacao: em vez de fabricar precos, esta fonte retorna erro
// explicito e fica registrada como opcao selecionavel. Quando/se o PNCP expuser
// consulta por item, basta implementar `consultar` aqui sem tocar no resto do modulo.

import type { ConsultaItemParams, FontePreco, ResultadoFonte } from '../types'

export class PrecoPublicoFonte implements FontePreco {
  tipo = 'preco_publico' as const

  async consultar(_params: ConsultaItemParams): Promise<ResultadoFonte> {
    return {
      tipoFonte: this.tipo,
      registros: [],
      erro:
        'A base Preco Publico (PNCP) ainda nao oferece consulta de preco por item de catalogo. ' +
        'Use a base Compras Governamentais ou registre precos de fonte web.',
    }
  }
}
