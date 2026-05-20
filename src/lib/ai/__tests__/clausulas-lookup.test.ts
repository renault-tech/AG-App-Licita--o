import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

import { createClient } from '@/lib/supabase/server'
import { buscarClausulasRelevantes, injetarClausulasNoPrompt } from '../clausulas-lookup'

const clausulaFixture = {
  id: 'c1',
  tipo_campo: 'objeto',
  texto_aprovado: 'Aquisicao de materiais de escritorio',
  score_qualidade: 0.9,
  uso_count: 5,
}

function buildMockSupabase(clausulas: unknown[], count: number) {
  // Tracks calls to differentiate the count query from data queries
  let selectCallIndex = 0

  const mockFrom = vi.fn().mockImplementation(() => {
    return {
      select: vi.fn().mockImplementation((_fields: string, opts?: { count?: string; head?: boolean }) => {
        if (opts?.count === 'exact') {
          // Count query: returns { count }
          return {
            eq: vi.fn().mockResolvedValue({ count }),
          }
        }
        // Data query: returns { data: clausulas }
        selectCallIndex++
        return {
          eq: vi.fn().mockReturnThis(),
          in: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              order: vi.fn().mockResolvedValue({ data: clausulas }),
            }),
          }),
        }
      }),
    }
  })

  return { from: mockFrom }
}

describe('buscarClausulasRelevantes', () => {
  beforeEach(() => vi.clearAllMocks())

  it('retorna none quando camposNecessarios e vazio', async () => {
    vi.mocked(createClient).mockResolvedValue({} as any)
    const result = await buscarClausulasRelevantes('org1', 'dfd', 'pregao', 'material', [])
    expect(result.modo).toBe('none')
    expect(result.cobertura).toBe(0)
  })

  it('retorna fail open quando Supabase lanca excecao', async () => {
    vi.mocked(createClient).mockRejectedValue(new Error('DB error'))
    const result = await buscarClausulasRelevantes('org1', 'dfd', 'pregao', 'material', ['objeto'])
    expect(result.modo).toBe('none')
    expect(result.clausulas).toHaveLength(0)
  })

  it('retorna modo contexto quando cobertura >= 0.3 e org nao madura', async () => {
    const mockSupabase = buildMockSupabase([clausulaFixture], 10)
    vi.mocked(createClient).mockResolvedValue(mockSupabase as any)
    const result = await buscarClausulasRelevantes('org1', 'dfd', 'pregao', 'material', ['objeto'])
    // cobertura = 1/1 = 1.0, mas org nao madura => modo contexto
    expect(result.modo).toBe('contexto')
    expect(result.cobertura).toBeGreaterThanOrEqual(0.3)
  })

  it('retorna modo validacao quando cobertura >= 0.8 e org madura (50+ clausulas)', async () => {
    const mockSupabase = buildMockSupabase([clausulaFixture], 60)
    vi.mocked(createClient).mockResolvedValue(mockSupabase as any)
    const result = await buscarClausulasRelevantes('org1', 'dfd', 'pregao', 'material', ['objeto'])
    // cobertura = 1/1 = 1.0 >= 0.8 e org madura => modo validacao
    expect(result.modo).toBe('validacao')
  })
})

describe('injetarClausulasNoPrompt', () => {
  it('retorna prompt original quando modo none', () => {
    const lookup = { clausulas: [], cobertura: 0, tokensEstimadosEconomizados: 0, modo: 'none' as const }
    expect(injetarClausulasNoPrompt('meu prompt', lookup)).toBe('meu prompt')
  })

  it('injeta clausulas no inicio do prompt quando modo contexto', () => {
    const lookup = {
      clausulas: [clausulaFixture],
      cobertura: 0.5,
      tokensEstimadosEconomizados: 50,
      modo: 'contexto' as const,
    }
    const resultado = injetarClausulasNoPrompt('meu prompt', lookup)
    expect(resultado).toContain('Aquisicao de materiais de escritorio')
    expect(resultado).toContain('meu prompt')
  })

  it('usa instrucao de validacao quando modo validacao', () => {
    const lookup = {
      clausulas: [clausulaFixture],
      cobertura: 0.9,
      tokensEstimadosEconomizados: 200,
      modo: 'validacao' as const,
    }
    const resultado = injetarClausulasNoPrompt('meu prompt', lookup)
    expect(resultado).toContain('Valide e ajuste apenas o necessario')
    expect(resultado).toContain('meu prompt')
  })
})
