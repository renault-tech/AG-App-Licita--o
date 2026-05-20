import { describe, it, expect, vi, beforeEach } from 'vitest'

vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(),
}))

import { createClient } from '@/lib/supabase/server'
import { verificarRateLimit } from '../rate-limiter'

function buildSupabaseMock(janelaExistente: {
  id: string
  chamadas: number
  ips_detectados: string[]
  anomalia_flag: boolean
  janela_inicio: string
} | null = null) {
  const insertResult = { data: { id: 'j1', chamadas: 0, ips_detectados: ['1.1.1.1'], anomalia_flag: false, janela_inicio: new Date().toISOString() }, error: null }
  const updateChain = { eq: vi.fn().mockReturnValue({ then: vi.fn() }) }
  const insertChain = { select: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue(insertResult) }) }
  const janelaSelectChain = {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        gte: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: janelaExistente }),
            }),
          }),
        }),
      }),
    }),
  }
  const configSelectChain = {
    select: vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        or: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: null }),
            }),
          }),
        }),
      }),
    }),
  }

  return {
    from: vi.fn().mockImplementation((table: string) => {
      if (table === 'rate_limit_configs') return configSelectChain
      if (table === 'rate_limit_janelas') {
        return {
          ...janelaSelectChain,
          insert: vi.fn().mockReturnValue(insertChain),
          update: vi.fn().mockReturnValue(updateChain),
        }
      }
      return {}
    }),
  }
}

describe('verificarRateLimit', () => {
  beforeEach(() => vi.clearAllMocks())

  it('permite requisicao quando nao ha janela previa (cria nova)', async () => {
    vi.mocked(createClient).mockResolvedValue(buildSupabaseMock(null) as any)
    const result = await verificarRateLimit('org1', 'user1', '1.1.1.1')
    expect(result.permitido).toBe(true)
  })

  it('bloqueia quando chamadas >= maxChamadas padrao', async () => {
    const janelaCheia = {
      id: 'j1',
      chamadas: 60,
      ips_detectados: ['1.1.1.1'],
      anomalia_flag: false,
      janela_inicio: new Date().toISOString(),
    }
    vi.mocked(createClient).mockResolvedValue(buildSupabaseMock(janelaCheia) as any)
    const result = await verificarRateLimit('org1', 'user1', '1.1.1.1')
    expect(result.permitido).toBe(false)
    expect(result.chamadasRestantes).toBe(0)
  })

  it('detecta anomalia com 3 IPs distintos', async () => {
    const janelaComIPs = {
      id: 'j1',
      chamadas: 10,
      ips_detectados: ['1.1.1.1', '2.2.2.2'],
      anomalia_flag: false,
      janela_inicio: new Date().toISOString(),
    }
    vi.mocked(createClient).mockResolvedValue(buildSupabaseMock(janelaComIPs) as any)
    const result = await verificarRateLimit('org1', 'user1', '3.3.3.3')
    expect(result.anomalia).toBe(true)
  })

  it('retorna fail open quando Supabase lanca excecao', async () => {
    vi.mocked(createClient).mockRejectedValue(new Error('Supabase indisponivel'))
    const result = await verificarRateLimit('org1', 'user1', '1.1.1.1')
    expect(result.permitido).toBe(true)
  })

  it('reduz limite pela metade em modo adaptativo com anomalia', async () => {
    // Mock que retorna config com modo adaptativo e max_chamadas = 10
    const configAdaptativo = {
      max_chamadas: 10,
      janela_segundos: 3600,
      modo: 'adaptativo',
    }
    const janelaComIPs = {
      id: 'j1',
      chamadas: 5,  // 5 de 10 normal, mas 5 de 5 com reducao
      ips_detectados: ['1.1.1.1', '2.2.2.2'],
      anomalia_flag: false,
      janela_inicio: new Date().toISOString(),
    }

    // Mock customizado com config adaptativo
    const updateChain = { eq: vi.fn().mockReturnValue({ then: vi.fn() }) }
    const insertChain = { select: vi.fn().mockReturnValue({ single: vi.fn().mockResolvedValue({ data: null }) }) }
    const janelaSelectChain = {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          gte: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: janelaComIPs }),
              }),
            }),
          }),
        }),
      }),
    }
    const configSelectChain = {
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          or: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: configAdaptativo }),
              }),
            }),
          }),
        }),
      }),
    }
    const mockComConfig = {
      from: vi.fn().mockImplementation((table: string) => {
        if (table === 'rate_limit_configs') return configSelectChain
        if (table === 'rate_limit_janelas') {
          return {
            ...janelaSelectChain,
            insert: vi.fn().mockReturnValue(insertChain),
            update: vi.fn().mockReturnValue(updateChain),
          }
        }
        return {}
      }),
    }

    vi.mocked(createClient).mockResolvedValue(mockComConfig as any)
    const result = await verificarRateLimit('org1', 'user1', '3.3.3.3')

    // Com anomalia (3 IPs) e modo adaptativo, limite cai de 10 para 5
    // chamadas = 5, maxChamadas reduzido = 5, entao nao e permitido
    expect(result.anomalia).toBe(true)
    expect(result.permitido).toBe(false)  // 5 >= 5 (limite reduzido)
    expect(result.chamadasRestantes).toBe(0)
  })
})
