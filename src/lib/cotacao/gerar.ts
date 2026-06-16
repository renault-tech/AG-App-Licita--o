// Orquestracao da geracao de cotacao: consulta fontes reais, aplica indice de
// atualizacao (inciso II) e roda a engine de calculo. Sem acesso ao Supabase.

import type {
  IndiceAtualizacao,
  ItemEntrada,
  ItemRelatorio,
  RelatorioCotacao,
  RegistroRelatorio,
  TipoFontePreco,
  FonteRelatorio,
} from './types'
import { obterFonte } from './fontes'
import { calcularItem, calcularMedia, arredondar, type RegistroCalculo } from './engine'
import { obterFatorAtualizacao, aplicarFator } from './indices'

interface RegistroFlat {
  tipo: TipoFontePreco
  registro: RegistroRelatorio
}

export interface OpcoesGeracao {
  fontes: TipoFontePreco[]
  indice: IndiceAtualizacao
  estado?: string
  codigoMunicipio?: number
  // Limite temporal legal: contratacoes similares ate 1 ano (inciso II)
  mesesRetroativos?: number
}

function dataLimiteInicio(meses: number): string {
  const d = new Date()
  d.setUTCMonth(d.getUTCMonth() - meses)
  return d.toISOString().slice(0, 10)
}

export async function gerarRelatorio(
  itens: ItemEntrada[],
  opcoes: OpcoesGeracao,
): Promise<RelatorioCotacao> {
  const mesesRetro = opcoes.mesesRetroativos ?? 12
  const dataCompraInicio = dataLimiteInicio(mesesRetro)

  // Cache de fator por (indice, competencia de origem) para nao repetir fetch
  const cacheFator = new Map<string, { fator: number; disponivel: boolean }>()
  let algumIndiceDisponivel = false
  let algumIndiceConsultado = false

  async function fatorPara(dataLicitacao: string | null): Promise<number> {
    if (!dataLicitacao) return 1
    const dataOrigem = new Date(dataLicitacao)
    if (isNaN(dataOrigem.getTime())) return 1
    const chave = `${opcoes.indice}-${dataOrigem.getUTCFullYear()}-${dataOrigem.getUTCMonth()}`
    let f = cacheFator.get(chave)
    if (!f) {
      const res = await obterFatorAtualizacao(opcoes.indice, dataOrigem)
      f = { fator: res.fator, disponivel: res.disponivel }
      cacheFator.set(chave, f)
    }
    algumIndiceConsultado = true
    if (f.disponivel) algumIndiceDisponivel = true
    return f.fator
  }

  const itensRelatorio: ItemRelatorio[] = []

  for (const item of itens) {
    const avisos: string[] = []
    const flats: RegistroFlat[] = []

    for (const tipoFonte of opcoes.fontes) {
      const fonte = obterFonte(tipoFonte)
      if (!fonte) continue

      const resultado = await fonte.consultar({
        codigoCatalogo: item.codigoCatalogo,
        tipoCatalogo: item.tipoCatalogo,
        estado: opcoes.estado,
        codigoMunicipio: opcoes.codigoMunicipio,
        dataCompraInicio,
      })

      if (resultado.erro) {
        avisos.push(`${tipoFonte}: ${resultado.erro}`)
        continue
      }

      let indiceLocal = 0
      for (const bruto of resultado.registros) {
        const fator = await fatorPara(bruto.dataLicitacao)
        const valorAtualizado = aplicarFator(bruto.valorOriginal, fator)
        indiceLocal += 1
        flats.push({
          tipo: tipoFonte,
          registro: {
            indice: indiceLocal,
            orgaoCnpj: bruto.orgaoCnpj,
            orgaoNome: bruto.orgaoNome,
            unidadeCodigo: bruto.unidadeCodigo,
            unidadeNome: bruto.unidadeNome,
            identificacao: bruto.identificacao,
            dataLicitacao: bruto.dataLicitacao,
            valorOriginal: arredondar(bruto.valorOriginal, 4),
            valorAtualizado,
            fonteNome: bruto.fonteNome ?? null,
            url: bruto.url ?? null,
            descricaoProduto: bruto.descricaoProduto ?? null,
            dataHoraAcesso: bruto.dataHoraAcesso ?? null,
            isOutlier: false,
          },
        })
      }
    }

    // Engine sobre todos os registros combinados (todas as fontes)
    const paraCalculo: RegistroCalculo[] = flats.map((f) => ({
      valorAtualizado: f.registro.valorAtualizado,
    }))
    const calc = calcularItem(paraCalculo)

    // Marca outliers nos registros correspondentes
    calc.indicesOutliers.forEach((i) => {
      if (flats[i]) flats[i].registro.isOutlier = true
    })

    if (calc.status === 'pendente_insuficiente') {
      avisos.push(
        `Item ${item.numero}: ${calc.precosUtilizados} preco(s) valido(s) encontrado(s). ` +
          `O Art. 23 recomenda no minimo 3. Complemente com outras fontes ou pesquisa direta.`,
      )
    }

    // Agrupa por fonte e calcula valor unitario (media dos atualizados nao-outlier da fonte)
    const fontes: FonteRelatorio[] = []
    for (const tipoFonte of opcoes.fontes) {
      const registrosFonte = flats.filter((f) => f.tipo === tipoFonte).map((f) => f.registro)
      if (registrosFonte.length === 0) continue
      const validos = registrosFonte.filter((r) => !r.isOutlier).map((r) => r.valorAtualizado)
      const base = validos.length > 0 ? validos : registrosFonte.map((r) => r.valorAtualizado)
      fontes.push({
        tipo: tipoFonte,
        valorUnitario: arredondar(calcularMedia(base)),
        registros: registrosFonte,
      })
    }

    const precoEstCalculado = calc.precoEstimado
    const total = arredondar(precoEstCalculado * item.quantidade)

    itensRelatorio.push({
      numero: item.numero,
      titulo: item.titulo,
      descricao: item.descricao,
      unidade: item.unidade,
      quantidade: item.quantidade,
      precosUtilizados: calc.precosUtilizados,
      propostasEncontradas: calc.propostasEncontradas,
      precoEstimado: calc.precoEstimado,
      percentual: null,
      precoEstCalculado,
      total,
      mediana: calc.mediana,
      media: calc.media,
      status: calc.status,
      fontes,
      avisos,
    })
  }

  const valorTotalGeral = arredondar(
    itensRelatorio.reduce((acc, i) => acc + i.total, 0),
  )

  return {
    indiceAtualizacao: opcoes.indice,
    indiceDisponivel: algumIndiceConsultado ? algumIndiceDisponivel : true,
    itens: itensRelatorio,
    valorTotalGeral,
  }
}
