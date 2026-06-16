import { describe, it, expect } from 'vitest'
import {
  calcularMediana,
  calcularMedia,
  ehOutlier,
  calcularItem,
} from '../engine'

describe('calcularMediana', () => {
  it('retorna 0 para lista vazia', () => {
    expect(calcularMediana([])).toBe(0)
  })

  it('mediana de quantidade impar', () => {
    expect(calcularMediana([162.17, 164.82, 167.11])).toBe(164.82)
  })

  it('mediana de quantidade par', () => {
    expect(calcularMediana([10, 20, 30, 40])).toBe(25)
  })
})

describe('calcularMedia', () => {
  it('media aritmetica', () => {
    expect(calcularMedia([162.17, 167.11, 164.82])).toBeCloseTo(164.7, 2)
  })
})

describe('ehOutlier', () => {
  it('marca valor acima de 30% da mediana', () => {
    expect(ehOutlier(140, 100)).toBe(true)
  })
  it('marca valor abaixo de 30% da mediana', () => {
    expect(ehOutlier(60, 100)).toBe(true)
  })
  it('nao marca valor dentro da faixa', () => {
    expect(ehOutlier(120, 100)).toBe(false)
  })
})

describe('calcularItem - exemplos reais do layout de referencia', () => {
  // Item 9: media 164.70, mediana 164.82 -> estimado = media (<= mediana)
  it('item 9: estimado igual a media quando media <= mediana', () => {
    const r = calcularItem([
      { valorAtualizado: 162.17 },
      { valorAtualizado: 167.11 },
      { valorAtualizado: 164.82 },
    ])
    expect(r.mediana).toBe(164.82)
    expect(r.media).toBe(164.7)
    expect(r.precoEstimado).toBe(164.7)
    expect(r.status).toBe('ok')
    expect(r.precosUtilizados).toBe(3)
  })

  // Item 12: media 64.83, mediana 64.59 -> mediana e teto, estimado = 64.59
  it('item 12: mediana funciona como teto quando media a ultrapassa', () => {
    const r = calcularItem([
      { valorAtualizado: 65.33 },
      { valorAtualizado: 64.58 },
      { valorAtualizado: 64.59 },
    ])
    expect(r.mediana).toBe(64.59)
    expect(r.media).toBe(64.83)
    expect(r.precoEstimado).toBe(64.59)
    expect(r.precoEstimado).toBeLessThanOrEqual(r.mediana)
  })
})

describe('calcularItem - quantidade configuravel e selecao das mais recentes', () => {
  it('seleciona as N mais recentes quando ha mais que o minimo (3 de 5)', () => {
    const r = calcularItem(
      [
        { valorAtualizado: 100, data: '2026-06-01' },
        { valorAtualizado: 110, data: '2026-05-01' },
        { valorAtualizado: 120, data: '2026-04-01' },
        { valorAtualizado: 90, data: '2023-01-01' },
        { valorAtualizado: 95, data: '2022-01-01' },
      ],
      3,
    )
    expect(r.propostasEncontradas).toBe(5)
    expect(r.precosUtilizados).toBe(3)
    // As 3 mais recentes: indices 0,1,2 (100,110,120)
    expect(r.indicesUtilizados.sort()).toEqual([0, 1, 2])
    expect(r.media).toBe(110)
    expect(r.status).toBe('ok')
  })

  it('respeita N configuravel maior (5)', () => {
    const reg = Array.from({ length: 8 }, (_, i) => ({
      valorAtualizado: 100 + i,
      data: `2026-0${(i % 9) + 1}-01`,
    }))
    const r = calcularItem(reg, 5)
    expect(r.propostasEncontradas).toBe(8)
    expect(r.precosUtilizados).toBe(5)
    expect(r.indicesUtilizados).toHaveLength(5)
  })

  it('exemplo "3/15": usa 3 e reporta 15 encontradas', () => {
    const reg = Array.from({ length: 15 }, (_, i) => ({
      valorAtualizado: 100,
      data: `2026-${String((i % 12) + 1).padStart(2, '0')}-10`,
    }))
    const r = calcularItem(reg, 3)
    expect(r.propostasEncontradas).toBe(15)
    expect(r.precosUtilizados).toBe(3)
  })
})

describe('calcularItem - regras de conformidade', () => {
  it('sinaliza item com menos do minimo como pendente', () => {
    const r = calcularItem([{ valorAtualizado: 100 }, { valorAtualizado: 110 }], 3)
    expect(r.status).toBe('pendente_insuficiente')
    expect(r.precosUtilizados).toBe(2)
  })

  it('lista vazia retorna pendente e zeros', () => {
    const r = calcularItem([], 3)
    expect(r.status).toBe('pendente_insuficiente')
    expect(r.precoEstimado).toBe(0)
    expect(r.propostasEncontradas).toBe(0)
  })

  it('exclui outlier da selecao mesmo quando ha registros suficientes', () => {
    const r = calcularItem(
      [
        { valorAtualizado: 100, data: '2026-04-01' },
        { valorAtualizado: 102, data: '2026-05-01' },
        { valorAtualizado: 98, data: '2026-03-01' },
        { valorAtualizado: 500, data: '2026-06-01' }, // outlier, o mais recente
      ],
      3,
    )
    // O outlier (indice 3) e sinalizado e NAO entra, apesar de ser o mais recente
    expect(r.indicesOutliers).toContain(3)
    expect(r.indicesUtilizados).not.toContain(3)
    expect(r.precosUtilizados).toBe(3)
    expect(r.media).toBe(100)
  })

  it('se excluir outliers derrubar abaixo do minimo, fica pendente (nao inclui discrepante)', () => {
    const r = calcularItem(
      [
        { valorAtualizado: 100, data: '2026-04-01' },
        { valorAtualizado: 102, data: '2026-05-01' },
        { valorAtualizado: 500, data: '2026-06-01' }, // outlier
      ],
      3,
    )
    expect(r.indicesOutliers).toContain(2)
    expect(r.precosUtilizados).toBe(2)
    expect(r.status).toBe('pendente_insuficiente')
  })

  it('propostas encontradas reflete total valido, nao o utilizado', () => {
    const r = calcularItem(
      [
        { valorAtualizado: 100, data: '2026-05-01' },
        { valorAtualizado: 102, data: '2026-04-01' },
        { valorAtualizado: 98, data: '2026-03-01' },
        { valorAtualizado: 99, data: '2026-02-01' },
      ],
      3,
    )
    expect(r.propostasEncontradas).toBe(4)
    expect(r.precosUtilizados).toBe(3)
  })
})
