import { createClient } from '@/lib/supabase/server'

export interface RateLimitResult {
  permitido: boolean
  chamadasRestantes: number
  anomalia: boolean
  resetEm: Date
}

const LIMITE_PADRAO = 60
const JANELA_PADRAO_SEG = 3600

export async function verificarRateLimit(
  orgId: string,
  userId: string,
  ip: string
): Promise<RateLimitResult> {
  const chave = `${orgId}:${userId}`
  const agora = new Date()

  try {
    const supabase = await createClient()
    const { data: configRaw } = await (supabase as any)
      .from('rate_limit_configs')
      .select('max_chamadas, janela_segundos, modo, perfil')
      .eq('ativo', true)
      .or(`organizacao_id.eq.${orgId},usuario_id.eq.${userId}`)
      .order('escopo')
      .limit(1)
      .maybeSingle()

    type Config = { max_chamadas: number; janela_segundos: number; modo: string }
    const config = configRaw as Config | null
    let maxChamadas = config?.max_chamadas ?? LIMITE_PADRAO
    const janelaSeg = config?.janela_segundos ?? JANELA_PADRAO_SEG
    const janelaDuracaoMs = janelaSeg * 1000
    const janelaInicio = new Date(agora.getTime() - janelaDuracaoMs)

    const { data: janelaRaw } = await (supabase as any)
      .from('rate_limit_janelas')
      .select('id, chamadas, ips_detectados, anomalia_flag, janela_inicio')
      .eq('chave', chave)
      .gte('janela_inicio', janelaInicio.toISOString())
      .order('janela_inicio', { ascending: false })
      .limit(1)
      .maybeSingle()

    type Janela = {
      id: string
      chamadas: number
      ips_detectados: string[]
      anomalia_flag: boolean
      janela_inicio: string
    }

    let janela = janelaRaw as Janela | null

    if (!janela) {
      const { data: nova } = await (supabase as any)
        .from('rate_limit_janelas')
        .insert({
          chave,
          chamadas: 0,
          janela_inicio: agora.toISOString(),
          ips_detectados: [ip],
          ultimo_ip: ip,
        })
        .select('id, chamadas, ips_detectados, anomalia_flag, janela_inicio')
        .single()
      janela = nova as Janela | null
    }

    if (!janela) {
      return { permitido: true, chamadasRestantes: maxChamadas, anomalia: false, resetEm: new Date(agora.getTime() + janelaDuracaoMs) }
    }

    const ipsUnicos = Array.from(new Set([...janela.ips_detectados, ip]))
    const anomalia = ipsUnicos.length > 2

    if (anomalia && config?.modo === 'adaptativo') {
      maxChamadas = Math.floor(maxChamadas * 0.5)
    }

    const resetEm = new Date(new Date(janela.janela_inicio).getTime() + janelaDuracaoMs)
    const permitido = janela.chamadas < maxChamadas
    const chamadasRestantes = Math.max(0, maxChamadas - janela.chamadas)

    // Fire-and-forget: falha no contador nao bloqueia a requisicao (fail open intencional)
    ;(supabase as any)
      .from('rate_limit_janelas')
      .update({
        chamadas: janela.chamadas + 1,
        ultimo_ip: ip,
        ips_detectados: ipsUnicos,
        anomalia_flag: anomalia,
        atualizado_em: agora.toISOString(),
      })
      .eq('id', janela.id)
      .then(() => {})

    return { permitido, chamadasRestantes, anomalia, resetEm }
  } catch {
    // fail open: nunca bloquear por falha de infraestrutura
    return {
      permitido: true,
      chamadasRestantes: LIMITE_PADRAO,
      anomalia: false,
      resetEm: new Date(agora.getTime() + JANELA_PADRAO_SEG * 1000),
    }
  }
}
