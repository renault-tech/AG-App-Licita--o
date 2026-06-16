// Parsing de listas de itens para cotacao (server-only).
// Suporta: planilha (.xlsx/.csv, deterministico), Word (.docx) e PDF (texto bruto).
// Guardrail: extrai apenas itens; marca/valores da origem sao ignorados.

import * as XLSX from 'xlsx'

export interface ItemImportado {
  numero: number
  descricao: string
  unidade: string | null
  quantidade: number | null
}

// ------------------------------------------------------------
// Extracao de texto bruto (docx / pdf)
// ------------------------------------------------------------
export async function extrairTextoDocx(buffer: Buffer): Promise<string> {
  const mammoth = await import('mammoth')
  const result = await mammoth.extractRawText({ buffer })
  return result.value ?? ''
}

export async function extrairTextoPdf(buffer: Buffer): Promise<string> {
  // pdf-parse e CommonJS; require evita o bloco de teste que roda no import ESM
  const pdfParse = require('pdf-parse') as (b: Buffer) => Promise<{ text: string }>
  const result = await pdfParse(buffer)
  return result.text ?? ''
}

// ------------------------------------------------------------
// Planilha (.xlsx/.csv): mapeamento deterministico de colunas
// ------------------------------------------------------------
function normalizar(s: unknown): string {
  return String(s ?? '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
}

function ehColuna(cabecalho: string, padroes: RegExp[]): boolean {
  return padroes.some((p) => p.test(cabecalho))
}

export function parsearPlanilha(buffer: Buffer): ItemImportado[] {
  const wb = XLSX.read(buffer, { type: 'buffer' })
  const sheet = wb.Sheets[wb.SheetNames[0]]
  if (!sheet) return []

  const linhas = XLSX.utils.sheet_to_json<unknown[]>(sheet, { header: 1, blankrows: false })
  if (linhas.length === 0) return []

  // Localiza a linha de cabecalho (a que contem "descri")
  let idxCabecalho = -1
  for (let i = 0; i < Math.min(linhas.length, 15); i++) {
    const cols = (linhas[i] as unknown[]).map(normalizar)
    if (cols.some((c) => /descri/.test(c))) {
      idxCabecalho = i
      break
    }
  }
  if (idxCabecalho === -1) return []

  const cabecalho = (linhas[idxCabecalho] as unknown[]).map(normalizar)
  const colNumero = cabecalho.findIndex((c) => ehColuna(c, [/^item$/, /^n[º°o]/, /numero/]))
  const colDescricao = cabecalho.findIndex((c) => ehColuna(c, [/descri/, /especific/]))
  const colUnidade = cabecalho.findIndex((c) => ehColuna(c, [/^und$/, /unid/, /^un$/]))
  const colQtd = cabecalho.findIndex((c) => ehColuna(c, [/qtd/, /quant/]))

  if (colDescricao === -1) return []

  const itens: ItemImportado[] = []
  let seq = 0
  for (let i = idxCabecalho + 1; i < linhas.length; i++) {
    const row = linhas[i] as unknown[]
    const descricao = String(row[colDescricao] ?? '').trim()
    if (!descricao) continue
    seq += 1
    const numeroRaw = colNumero >= 0 ? parseInt(String(row[colNumero]).replace(/\D/g, ''), 10) : NaN
    const qtdRaw = colQtd >= 0 ? parseFloat(String(row[colQtd]).replace(/\./g, '').replace(',', '.')) : NaN
    itens.push({
      numero: Number.isFinite(numeroRaw) && numeroRaw > 0 ? numeroRaw : seq,
      descricao,
      unidade: colUnidade >= 0 && row[colUnidade] ? String(row[colUnidade]).trim() : null,
      quantidade: Number.isFinite(qtdRaw) && qtdRaw > 0 ? qtdRaw : null,
    })
  }
  return itens
}

// ------------------------------------------------------------
// Parse da resposta da IA (array JSON, possivelmente cercado por markdown)
// ------------------------------------------------------------
export function parsearRespostaIAItens(texto: string): ItemImportado[] {
  let bruto = texto.trim()
  // Remove cercas de codigo
  bruto = bruto.replace(/^```(?:json)?/i, '').replace(/```$/i, '').trim()
  const inicio = bruto.indexOf('[')
  const fim = bruto.lastIndexOf(']')
  if (inicio === -1 || fim === -1 || fim < inicio) return []
  try {
    const arr = JSON.parse(bruto.slice(inicio, fim + 1)) as Array<Record<string, unknown>>
    return arr
      .filter((x) => x && typeof x.descricao === 'string' && (x.descricao as string).trim())
      .map((x, i) => {
        const qtd = Number(x.quantidade)
        return {
          numero: Number.isFinite(Number(x.numero)) && Number(x.numero) > 0 ? Number(x.numero) : i + 1,
          descricao: String(x.descricao).trim(),
          unidade: x.unidade != null && String(x.unidade).trim() ? String(x.unidade).trim() : null,
          quantidade: Number.isFinite(qtd) && qtd > 0 ? qtd : null,
        }
      })
  } catch {
    return []
  }
}
