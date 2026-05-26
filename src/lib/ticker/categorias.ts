export type TickerCategoriaId =
  | 'movimentacao' | 'etapa' | 'parecer' | 'assinatura'
  | 'publicacao'   | 'sessao' | 'ia'

export type TickerCategoria = {
  id: TickerCategoriaId
  label: string
  desc: string
  icon: string
}

export const TICKER_CATEGORIAS: TickerCategoria[] = [
  { id: 'movimentacao', label: 'Movimentações de processos', desc: 'Mudanças de status, encaminhamentos entre setores',   icon: '⇄' },
  { id: 'etapa',        label: 'Etapas concluídas',          desc: 'DFD, Cotação, ETP, TR, Edital aprovados',             icon: '✓' },
  { id: 'parecer',      label: 'Procuradoria',               desc: 'Pareceres emitidos, devoluções, ressalvas',           icon: '§' },
  { id: 'assinatura',   label: 'Assinaturas eletrônicas',    desc: 'Documentos assinados via Gov.br ou ICP-Brasil',       icon: '✎' },
  { id: 'publicacao',   label: 'Publicações oficiais',       desc: 'PNCP, Diário Oficial Eletrônico, site institucional', icon: '↗' },
  { id: 'sessao',       label: 'Sessões públicas',           desc: 'Pregões eletrônicos em disputa, propostas recebidas', icon: '⊙' },
  { id: 'ia',           label: 'Inteligência artificial',    desc: 'Aprimoramentos automáticos, sugestões da IA',         icon: '★' },
]

export const TICKER_CATEGORIAS_DEFAULT: Record<TickerCategoriaId, boolean> =
  Object.fromEntries(TICKER_CATEGORIAS.map(c => [c.id, true])) as Record<TickerCategoriaId, boolean>

export type TickerEvento = {
  categoria: TickerCategoriaId
  num: string
  txt: string
  tone: 'accent' | 'success' | 'warn' | 'danger' | 'neutral'
  ts: string
  href?: string
}
