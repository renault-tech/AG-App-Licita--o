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
    // Regra legal: estimado nunca acima da mediana
    expect(r.precoEstimado).toBe(64.59)
    expect(r.precoEstimado).toBeLessThanOrEqual(r.mediana)
  })
})

describe('calcularItem - regras de conformidade', () => {
  it('sinaliza item com menos de 3 precos como pendente', () => {
    const r = calcularItem([{ valorAtualizado: 100 }, { valorAtualizado: 110 }])
    expect(r.status).toBe('pendente_insuficiente')
    expect(r.precosUtilizados).toBe(2)
  })

  it('lista vazia retorna pendente e zeros', () => {
    const r = calcularItem([])
    expect(r.status).toBe('pendente_insuficiente')
    expect(r.precoEstimado).toBe(0)
    expect(r.propostasEncontradas).toBe(0)
  })

  it('exclui outlier do calculo quando restam ao menos 3 precos', () => {
    const r = calcularItem([
      { valorAtualizado: 100 },
      { valorAtualizado: 102 },
      { valorAtualizado: 98 },
      { valorAtualizado: 500 }, // outlier
    ])
    expect(r.indicesOutliers).toContain(3)
    expect(r.precosUtilizados).toBe(3)
    expect(r.media).toBe(100)
  })

  it('mantem outlier sinalizado mas no calculo se exclui-lo derrubar abaixo de 3', () => {
    const r = calcularItem([
      { valorAtualizado: 100 },
      { valorAtualizado: 102 },
      { valorAtualizado: 500 }, // outlier
    ])
    expect(r.indicesOutliers).toContain(2)
    // Nao pode descartar: restariam apenas 2 precos
    expect(r.precosUtilizados).toBe(3)
  })

  it('propostas encontradas reflete total localizado, nao o utilizado', () => {
    const r = calcularItem([
      { valorAtualizado: 100 },
      { valorAtualizado: 102 },
      { valorAtualizado: 98 },
      { valorAtualizado: 500 },
      { valorAtualizado: 99 },
    ])
    expect(r.propostasEncontradas).toBe(5)
    expect(r.precosUtilizados).toBe(4) // 500 excluido
  })
})
