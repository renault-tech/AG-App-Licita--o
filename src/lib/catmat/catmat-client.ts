// src/lib/catmat/catmat-client.ts
// Catalogo de Materiais (CATMAT) e Servicos (CATSER) do Governo Federal
// API publica sem autenticacao: https://dadosabertos.compras.gov.br
// Conforme Lei 14.133/21 - uniformizacao de itens em licitacoes

const CATMAT_BASE = 'https://dadosabertos.compras.gov.br'

// TTL de 24h - catalogo e estavel, atualizado periodicamente pelo governo
const CACHE_TTL = 86400

export interface ItemMaterial {
  tipo: 'material'
  codigo: string
  descricao: string
  unidade: string
  pdmCodigo?: string
  pdmDescricao?: string
  status: 'Ativo' | 'Inativo'
}

export interface ItemServico {
  tipo: 'servico'
  codigo: string
  descricao: string
  unidade: string
  status: 'Ativo' | 'Inativo'
}

export type ItemCatmat = ItemMaterial | ItemServico

interface RespostaMaterial {
  codigoItem: string
  descricaoItem: string
  siglaUnidadeFornecimento: string
  statusItem: string
  codigoPdm?: string
  nomePdm?: string
}

interface RespostaServico {
  codigoServico: string
  nomeServico: string
  siglaUnidadeMedida: string
  statusServico: string
}

async function fetchComCache<T>(url: string): Promise<T | null> {
  try {
    const res = await fetch(url, {
      next: { revalidate: CACHE_TTL },
    })
    if (!res.ok) return null
    return res.json() as Promise<T>
  } catch {
    return null
  }
}

export async function buscarMateriais(termo: string): Promise<ItemMaterial[]> {
  if (termo.trim().length < 3) return []

  const params = new URLSearchParams({
    descricaoItem: termo.trim(),
    tamanhoPagina: '20',
    pagina: '1',
  })

  const data = await fetchComCache<{ result: RespostaMaterial[] }>(
    `${CATMAT_BASE}/modulo-material/4_consultarItemMaterial?${params}`
  )

  if (!data?.result) return []

  return data.result
    .filter(m => m.statusItem === 'Ativo')
    .map(m => ({
      tipo: 'material' as const,
      codigo: m.codigoItem,
      descricao: m.descricaoItem,
      unidade: m.siglaUnidadeFornecimento,
      pdmCodigo: m.codigoPdm,
      pdmDescricao: m.nomePdm,
      status: 'Ativo' as const,
    }))
}

export async function buscarServicos(termo: string): Promise<ItemServico[]> {
  if (termo.trim().length < 3) return []

  const params = new URLSearchParams({
    nomeServico: termo.trim(),
    tamanhoPagina: '20',
    pagina: '1',
  })

  const data = await fetchComCache<{ result: RespostaServico[] }>(
    `${CATMAT_BASE}/modulo-servico/6_consultarItemServico?${params}`
  )

  if (!data?.result) return []

  return data.result
    .filter(s => s.statusServico === 'Ativo')
    .map(s => ({
      tipo: 'servico' as const,
      codigo: s.codigoServico,
      descricao: s.nomeServico,
      unidade: s.siglaUnidadeMedida,
      status: 'Ativo' as const,
    }))
}

export async function buscarItens(termo: string): Promise<ItemCatmat[]> {
  const [materiais, servicos] = await Promise.all([
    buscarMateriais(termo),
    buscarServicos(termo),
  ])
  return [...materiais, ...servicos].slice(0, 30)
}
