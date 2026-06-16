'use server'

import { buscarItens } from '@/lib/catmat/catmat-client'
import { executarIAComCreditos } from '@/lib/ai/wrapper'
import { buildPromptExtrairItens } from '@/lib/ai/prompts/extrair-itens'
import {
  extrairTextoDocx,
  extrairTextoPdf,
  parsearPlanilha,
  parsearRespostaIAItens,
  type ItemImportado,
} from '@/lib/cotacao/importar'
import type { TipoCatalogoItem } from '@/lib/cotacao/types'

export interface ItemImportadoComMatch extends ItemImportado {
  codigoCatalogo: string | null
  tipoCatalogo: TipoCatalogoItem | null
  unidadeCatalogo: string | null
  descricaoCatalogo: string | null
  semMatch: boolean
}

interface ResultadoImport {
  success: boolean
  data?: { itens: ItemImportadoComMatch[] }
  error?: string
}

// Deriva um termo de busca curto a partir da descricao longa do item.
// A API de catalogo casa por palavras-chave; descricoes inteiras retornam pouco.
function termoBusca(descricao: string): string {
  const limpo = descricao
    .split(/[,;.\-(]/)[0] // ate o primeiro separador de especificacao
    .replace(/\s+/g, ' ')
    .trim()
  const palavras = limpo.split(' ').filter((p) => p.length > 2)
  return palavras.slice(0, 5).join(' ') || descricao.slice(0, 40)
}

async function autoMatch(item: ItemImportado): Promise<ItemImportadoComMatch> {
  const base: ItemImportadoComMatch = {
    ...item,
    codigoCatalogo: null,
    tipoCatalogo: null,
    unidadeCatalogo: null,
    descricaoCatalogo: null,
    semMatch: true,
  }
  try {
    const termo = termoBusca(item.descricao)
    if (termo.length < 3) return base
    const candidatos = await buscarItens(termo)
    if (candidatos.length === 0) return base
    const melhor = candidatos[0]
    return {
      ...base,
      codigoCatalogo: melhor.codigo,
      tipoCatalogo: melhor.tipo,
      unidadeCatalogo: melhor.unidade,
      descricaoCatalogo: melhor.descricao,
      semMatch: false,
    }
  } catch {
    return base
  }
}

// Executa autoMatch em lotes para nao sobrecarregar a API de catalogo
async function autoMatchLote(itens: ItemImportado[], tamanhoLote = 5): Promise<ItemImportadoComMatch[]> {
  const resultado: ItemImportadoComMatch[] = []
  for (let i = 0; i < itens.length; i += tamanhoLote) {
    const lote = itens.slice(i, i + tamanhoLote)
    resultado.push(...(await Promise.all(lote.map(autoMatch))))
  }
  return resultado
}

/**
 * Importa uma lista de itens a partir de texto colado ou arquivo (xlsx/csv/docx/pdf).
 * Apenas os itens sao usados; marca e valores da origem sao ignorados.
 * Cada item recebe uma sugestao de CATMAT/CATSER (revisavel pelo usuario).
 */
export async function importarItensLista(formData: FormData): Promise<ResultadoImport> {
  try {
    return await processarImportacao(formData)
  } catch (e) {
    return { success: false, error: e instanceof Error ? e.message : 'Falha ao importar a lista.' }
  }
}

async function processarImportacao(formData: FormData): Promise<ResultadoImport> {
  const texto = (formData.get('texto') as string | null)?.trim()
  const arquivo = formData.get('arquivo') as File | null

  let itens: ItemImportado[] = []

  if (arquivo && arquivo.size > 0) {
    const nome = arquivo.name.toLowerCase()
    const buffer = Buffer.from(await arquivo.arrayBuffer())

    if (nome.endsWith('.xlsx') || nome.endsWith('.xls') || nome.endsWith('.csv')) {
      itens = parsearPlanilha(buffer)
      if (itens.length === 0) {
        return { success: false, error: 'Nao foi possivel identificar itens na planilha. Verifique se ha uma coluna de Descricao.' }
      }
    } else {
      let textoBruto = ''
      if (nome.endsWith('.docx')) textoBruto = await extrairTextoDocx(buffer)
      else if (nome.endsWith('.pdf')) textoBruto = await extrairTextoPdf(buffer)
      else if (nome.endsWith('.txt')) textoBruto = buffer.toString('utf8')
      else return { success: false, error: 'Formato nao suportado. Use .xlsx, .csv, .docx, .pdf ou .txt.' }

      if (!textoBruto.trim()) return { success: false, error: 'O arquivo nao contem texto extraivel.' }
      itens = await extrairViaIA(textoBruto)
    }
  } else if (texto) {
    itens = await extrairViaIA(texto)
  } else {
    return { success: false, error: 'Cole o texto da lista ou envie um arquivo.' }
  }

  if (itens.length === 0) {
    return { success: false, error: 'Nenhum item foi identificado na lista.' }
  }

  const comMatch = await autoMatchLote(itens)
  return { success: true, data: { itens: comMatch } }
}

async function extrairViaIA(textoBruto: string): Promise<ItemImportado[]> {
  const res = await executarIAComCreditos({
    prompt: buildPromptExtrairItens(textoBruto),
    tipoAcao: 'sugerir_conteudo',
    temperature: 0,
  })
  if (!res.success) throw new Error(res.error)
  return parsearRespostaIAItens(res.texto)
}
