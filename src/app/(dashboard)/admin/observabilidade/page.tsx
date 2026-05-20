import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { createClient } from '@/lib/supabase/server'
import FiltrosObservabilidade from './components/filtros'
import GraficoTokens from './components/grafico-tokens'
import GraficoEconomia from './components/grafico-economia'
import PainelAnomalias from './components/painel-anomalias'

type Periodo = 'dia' | 'semana' | 'mes' | '90d'

function calcularInicio(periodo: Periodo): Date {
  const agora = new Date()
  const mapa: Record<Periodo, number> = {
    dia: 24 * 60 * 60 * 1000,
    semana: 7 * 24 * 60 * 60 * 1000,
    mes: 30 * 24 * 60 * 60 * 1000,
    '90d': 90 * 24 * 60 * 60 * 1000,
  }
  return new Date(agora.getTime() - mapa[periodo])
}

function agruparPorPeriodo(
  registros: Array<{ created_at: string; tokens_entrada_real: number | null; tokens_saida_real: number | null }>,
  periodo: Periodo
) {
  const formato: Record<Periodo, Intl.DateTimeFormatOptions> = {
    dia: { hour: '2-digit', minute: '2-digit' },
    semana: { weekday: 'short', day: '2-digit' },
    mes: { day: '2-digit', month: 'short' },
    '90d': { day: '2-digit', month: 'short' },
  }
  const granularidade: Record<Periodo, number> = {
    dia: 60 * 60 * 1000,
    semana: 24 * 60 * 60 * 1000,
    mes: 24 * 60 * 60 * 1000,
    '90d': 7 * 24 * 60 * 60 * 1000,
  }

  const buckets = new Map<string, { entrada: number; saida: number; total: number }>()

  for (const r of registros) {
    const ts = new Date(r.created_at)
    const bucket = new Date(Math.floor(ts.getTime() / granularidade[periodo]) * granularidade[periodo])
    const label = bucket.toLocaleDateString('pt-BR', formato[periodo])
    const atual = buckets.get(label) ?? { entrada: 0, saida: 0, total: 0 }
    const entrada = r.tokens_entrada_real ?? 0
    const saida = r.tokens_saida_real ?? 0
    buckets.set(label, { entrada: atual.entrada + entrada, saida: atual.saida + saida, total: atual.total + entrada + saida })
  }

  return Array.from(buckets.entries()).map(([label, v]) => ({ label, ...v }))
}

export default async function ObservabilidadePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string>>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: usuarioData } = await supabase
    .from('usuarios')
    .select('papel')
    .eq('id', user.id)
    .maybeSingle()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if (!['admin_plataforma'].includes((usuarioData as any)?.papel ?? '')) redirect('/dashboard')

  const sp = await searchParams
  const periodo = (sp.periodo ?? 'semana') as Periodo
  const inicio = calcularInicio(periodo)

  const [acoesRaw, economiaRaw, anomaliasRaw] = await Promise.all([
    supabase
      .from('acoes_ia')
      .select('created_at, tokens_entrada_real, tokens_saida_real')
      .gte('created_at', inicio.toISOString())
      .order('created_at'),

    supabase
      .from('clausulas_aplicadas')
      .select('created_at, tokens_economizados')
      .gte('created_at', inicio.toISOString()),

    supabase
      .from('rate_limit_janelas')
      .select('chave, ips_detectados, chamadas, atualizado_em')
      .eq('anomalia_flag', true)
      .gte('atualizado_em', inicio.toISOString())
      .order('atualizado_em', { ascending: false })
      .limit(20),
  ])

  const acoes = (acoesRaw.data ?? []) as Array<{ created_at: string; tokens_entrada_real: number | null; tokens_saida_real: number | null }>
  const dadosTokens = agruparPorPeriodo(acoes, periodo)

  const economia = (economiaRaw.data ?? []) as Array<{ created_at: string; tokens_economizados: number }>
  const mapEconomia = new Map<string, number>()
  for (const e of economia) {
    const label = new Date(e.created_at).toLocaleDateString('pt-BR')
    mapEconomia.set(label, (mapEconomia.get(label) ?? 0) + e.tokens_economizados)
  }
  const dadosEconomia = dadosTokens.map(p => ({
    label: p.label,
    consumidos: p.total,
    economizados: mapEconomia.get(p.label) ?? 0,
  }))

  const anomalias = (anomaliasRaw.data ?? []) as Array<{ chave: string; ips_detectados: string[]; chamadas: number; atualizado_em: string }>

  const totalTokens = acoes.reduce((s, r) => s + (r.tokens_entrada_real ?? 0) + (r.tokens_saida_real ?? 0), 0)
  const totalEconomizados = economia.reduce((s, e) => s + e.tokens_economizados, 0)
  const taxaEconomia = totalTokens > 0 ? Math.round((totalEconomizados / (totalTokens + totalEconomizados)) * 100) : 0

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-base font-semibold text-gray-900">Observabilidade de IA</h1>
          <p className="text-sm text-gray-500 mt-0.5">Consumo de tokens, economia por clausulas e anomalias de acesso.</p>
        </div>
        <Suspense>
          <FiltrosObservabilidade />
        </Suspense>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[
          { label: 'Tokens consumidos', valor: totalTokens.toLocaleString('pt-BR'), cor: 'text-gray-900' },
          { label: 'Tokens economizados', valor: totalEconomizados.toLocaleString('pt-BR'), cor: 'text-green-700' },
          { label: 'Taxa de economia', valor: `${taxaEconomia}%`, cor: 'text-blue-700' },
          { label: 'Anomalias detectadas', valor: String(anomalias.length), cor: anomalias.length > 0 ? 'text-amber-600' : 'text-gray-900' },
        ].map(kpi => (
          <div key={kpi.label} className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-500">{kpi.label}</p>
            <p className={`text-2xl font-bold mt-1 ${kpi.cor}`}>{kpi.valor}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <GraficoTokens dados={dadosTokens} titulo="Tokens por Periodo" />
        <GraficoEconomia dados={dadosEconomia} />
      </div>

      <PainelAnomalias anomalias={anomalias} />
    </div>
  )
}
