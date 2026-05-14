import { createClient } from '@/lib/supabase/server'
import { Bot, Zap, TrendingDown, BookOpen, HelpCircle, Database } from 'lucide-react'

function Tooltip({ texto }: { texto: string }) {
  return (
    <div className="group relative inline-flex">
      <HelpCircle className="w-3.5 h-3.5 text-gray-300 hover:text-gray-500 cursor-help" />
      <span className="pointer-events-none absolute left-5 top-0 z-50 hidden group-hover:block w-60 p-2 bg-gray-900 text-white text-xs rounded-lg shadow-xl leading-relaxed">
        {texto}
      </span>
    </div>
  )
}

export default async function AdminIAPage() {
  const supabase = await createClient()

  const [
    { data: acoesIA },
    { data: clausulasAprendidas },
    { data: clausulasAplicadas },
    { data: clausulasPadrao },
  ] = await Promise.all([
    (supabase as any)
      .from('acoes_ia')
      .select('provedor, modelo, tipo_acao, tokens_entrada, tokens_saida, sucesso, created_at, organizacao_id')
      .order('created_at', { ascending: false })
      .limit(200),
    (supabase as any)
      .from('clausulas_aprendidas')
      .select('documento, uso_count, score_qualidade, criado_em'),
    (supabase as any)
      .from('clausulas_aplicadas')
      .select('tipo_documento, tokens_economizados, aplicado_em')
      .order('aplicado_em', { ascending: false })
      .limit(200),
    (supabase as any)
      .from('clausulas_padrao')
      .select('documento, fonte')
      .eq('ativo', true),
  ])

  type AcaoIA = { provedor: string; modelo: string; tipo_acao: string; tokens_entrada: number; tokens_saida: number; sucesso: boolean; created_at: string }
  type ClausulaAprendida = { documento: string; uso_count: number; score_qualidade: number; criado_em: string }
  type ClausulaAplicada = { tipo_documento: string; tokens_economizados: number; aplicado_em: string }
  type ClausulaPadrao = { documento: string; fonte: string }

  const acoes = (acoesIA ?? []) as AcaoIA[]
  const aprendidas = (clausulasAprendidas ?? []) as ClausulaAprendida[]
  const aplicadas = (clausulasAplicadas ?? []) as ClausulaAplicada[]
  const padrao = (clausulasPadrao ?? []) as ClausulaPadrao[]

  // Agregados por provedor
  const porProvedor: Record<string, { chamadas: number; tokensEntrada: number; tokensSaida: number; erros: number }> = {}
  for (const a of acoes) {
    if (!porProvedor[a.provedor]) porProvedor[a.provedor] = { chamadas: 0, tokensEntrada: 0, tokensSaida: 0, erros: 0 }
    porProvedor[a.provedor].chamadas++
    porProvedor[a.provedor].tokensEntrada += a.tokens_entrada ?? 0
    porProvedor[a.provedor].tokensSaida += a.tokens_saida ?? 0
    if (!a.sucesso) porProvedor[a.provedor].erros++
  }

  const totalTokensConsumidos = acoes.reduce((s, a) => s + (a.tokens_entrada ?? 0) + (a.tokens_saida ?? 0), 0)
  const totalTokensEconomizados = aplicadas.reduce((s, a) => s + (a.tokens_economizados ?? 500), 0)
  const totalChamadas = acoes.length
  const totalReusos = aplicadas.length
  const percentualEconomia = totalTokensConsumidos + totalTokensEconomizados > 0
    ? Math.round((totalTokensEconomizados / (totalTokensConsumidos + totalTokensEconomizados)) * 100)
    : 0

  // Clausulas por documento (padrao + aprendidas)
  const clausulasPorDoc: Record<string, { padrao: number; aprendidas: number; uploadAdmin: number }> = {}
  for (const c of padrao) {
    if (!clausulasPorDoc[c.documento]) clausulasPorDoc[c.documento] = { padrao: 0, aprendidas: 0, uploadAdmin: 0 }
    if (c.fonte === 'upload_admin') clausulasPorDoc[c.documento].uploadAdmin++
    else clausulasPorDoc[c.documento].padrao++
  }
  for (const c of aprendidas) {
    if (!clausulasPorDoc[c.documento]) clausulasPorDoc[c.documento] = { padrao: 0, aprendidas: 0, uploadAdmin: 0 }
    clausulasPorDoc[c.documento].aprendidas++
  }

  // Reusos por semana (ultimas 8 semanas) para o grafico ASCII simplificado
  const agora = new Date()
  const semanas: { label: string; reusos: number; chamadas: number }[] = []
  for (let i = 7; i >= 0; i--) {
    const inicio = new Date(agora)
    inicio.setDate(inicio.getDate() - (i + 1) * 7)
    const fim = new Date(agora)
    fim.setDate(fim.getDate() - i * 7)
    const label = inicio.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
    const reusos = aplicadas.filter(a => {
      const d = new Date(a.aplicado_em)
      return d >= inicio && d < fim
    }).length
    const chamadas = acoes.filter(a => {
      const d = new Date(a.created_at)
      return d >= inicio && d < fim
    }).length
    semanas.push({ label, reusos, chamadas })
  }

  const maxBarValue = Math.max(...semanas.map(s => s.chamadas + s.reusos), 1)

  const LABEL_PROVEDOR: Record<string, string> = {
    gemini: 'Google Gemini',
    groq: 'Groq (LLaMA)',
    anthropic: 'Anthropic Claude',
    openrouter: 'OpenRouter',
  }

  const LABEL_DOC: Record<string, string> = {
    dfd: 'DFD',
    etp: 'ETP',
    tr: 'Termo de Referência',
    edital: 'Edital',
    parecer: 'Parecer',
    mapa_riscos: 'Mapa de Riscos',
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-gray-900">Gestão de IA</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Consumo de tokens por provedor, reutilização de cláusulas e curva de aprendizado da plataforma.
        </p>
      </div>

      {/* KPIs de IA */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          {
            label: 'Chamadas de IA',
            valor: totalChamadas.toLocaleString('pt-BR'),
            icon: Bot,
            cor: 'bg-purple-600',
            tooltip: 'Total de chamadas realizadas a provedores de IA. Cada chamada consome tokens e créditos.',
          },
          {
            label: 'Tokens Consumidos',
            valor: totalTokensConsumidos.toLocaleString('pt-BR'),
            icon: Zap,
            cor: 'bg-amber-500',
            tooltip: 'Total de tokens de entrada e saída consumidos em todas as chamadas de IA.',
          },
          {
            label: 'Tokens Economizados',
            valor: totalTokensEconomizados.toLocaleString('pt-BR'),
            icon: TrendingDown,
            cor: 'bg-green-600',
            tooltip: 'Tokens que deixaram de ser consumidos porque a plataforma reutilizou cláusulas da base de conhecimento.',
          },
          {
            label: 'Taxa de Economia',
            valor: `${percentualEconomia}%`,
            icon: BookOpen,
            cor: 'bg-teal-600',
            tooltip: 'Percentual de tokens economizados em relação ao total que teria sido consumido sem a base de conhecimento. Tende a aumentar com o tempo.',
          },
        ].map(({ label, valor, icon: Icon, cor, tooltip }) => (
          <div key={label} className="bg-white border border-gray-200 rounded-xl p-4 flex flex-col gap-3">
            <div className="flex items-start justify-between">
              <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${cor}`}>
                <Icon className="w-4 h-4 text-white" />
              </div>
              <Tooltip texto={tooltip} />
            </div>
            <div>
              <p className="text-xl font-bold text-gray-900">{valor}</p>
              <p className="text-xs text-gray-500 mt-0.5">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Curva de aprendizado - grafico de barras */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-sm font-semibold text-gray-800">Curva de Aprendizado</h3>
          <Tooltip texto="Mostra a evolução semanal entre chamadas reais de IA (roxo) e reusos de cláusulas aprendidas (verde). Com o tempo, o verde deve crescer e o roxo diminuir, indicando que a plataforma está ficando mais econômica." />
        </div>
        <div className="flex items-end gap-2 h-32">
          {semanas.map((s, i) => {
            const altChamadas = (s.chamadas / maxBarValue) * 100
            const altReusos = (s.reusos / maxBarValue) * 100
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex items-end gap-0.5" style={{ height: '96px' }}>
                  <div
                    className="flex-1 bg-purple-400 rounded-t transition-all"
                    style={{ height: `${altChamadas}%`, minHeight: s.chamadas > 0 ? '4px' : '0' }}
                    title={`${s.chamadas} chamadas de IA`}
                  />
                  <div
                    className="flex-1 bg-green-400 rounded-t transition-all"
                    style={{ height: `${altReusos}%`, minHeight: s.reusos > 0 ? '4px' : '0' }}
                    title={`${s.reusos} reusos`}
                  />
                </div>
                <span className="text-[9px] text-gray-400">{s.label}</span>
              </div>
            )
          })}
        </div>
        <div className="flex items-center gap-4 mt-3">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-purple-400" />
            <span className="text-xs text-gray-500">Chamadas de IA</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm bg-green-400" />
            <span className="text-xs text-gray-500">Reusos de cláusulas</span>
          </div>
        </div>
      </div>

      {/* Consumo por provedor */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <h3 className="text-sm font-semibold text-gray-800">Consumo por Provedor</h3>
          <Tooltip texto="Detalha o uso de tokens e chamadas por provedor de IA configurado na plataforma." />
        </div>
        {Object.keys(porProvedor).length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">Nenhuma chamada registrada ainda.</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left py-2 text-xs font-semibold text-gray-500">Provedor</th>
                <th className="text-right py-2 text-xs font-semibold text-gray-500">Chamadas</th>
                <th className="text-right py-2 text-xs font-semibold text-gray-500">Tokens Entrada</th>
                <th className="text-right py-2 text-xs font-semibold text-gray-500">Tokens Saida</th>
                <th className="text-right py-2 text-xs font-semibold text-gray-500">Erros</th>
              </tr>
            </thead>
            <tbody>
              {Object.entries(porProvedor).map(([prov, dados]) => (
                <tr key={prov} className="border-b border-gray-50 last:border-0">
                  <td className="py-2.5 font-medium text-gray-800">{LABEL_PROVEDOR[prov] ?? prov}</td>
                  <td className="py-2.5 text-right text-gray-600">{dados.chamadas.toLocaleString('pt-BR')}</td>
                  <td className="py-2.5 text-right text-gray-600">{dados.tokensEntrada.toLocaleString('pt-BR')}</td>
                  <td className="py-2.5 text-right text-gray-600">{dados.tokensSaida.toLocaleString('pt-BR')}</td>
                  <td className="py-2.5 text-right">
                    {dados.erros > 0 ? (
                      <span className="text-red-600">{dados.erros}</span>
                    ) : (
                      <span className="text-green-600">0</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Base de clausulas por documento */}
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-center gap-2 mb-4">
          <Database className="w-4 h-4 text-gray-400" />
          <h3 className="text-sm font-semibold text-gray-800">Base de Cláusulas por Documento</h3>
          <Tooltip texto="Quantas cláusulas existem na base de conhecimento para cada tipo de documento. Documentos com mais cláusulas geram textos melhores e mais econômicos." />
        </div>
        {Object.keys(clausulasPorDoc).length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-4">Nenhuma cláusula na base ainda. Envie documentos na Base de Conhecimento.</p>
        ) : (
          <div className="space-y-3">
            {Object.entries(clausulasPorDoc).map(([doc, dados]) => {
              const total = dados.padrao + dados.aprendidas + dados.uploadAdmin
              return (
                <div key={doc} className="flex items-center gap-3">
                  <span className="w-32 text-xs text-gray-600 shrink-0">{LABEL_DOC[doc] ?? doc}</span>
                  <div className="flex-1 flex items-center gap-1 h-5">
                    {dados.padrao > 0 && (
                      <div
                        className="bg-blue-200 rounded h-full"
                        style={{ width: `${(dados.padrao / total) * 100}%` }}
                        title={`${dados.padrao} templates padrão`}
                      />
                    )}
                    {dados.uploadAdmin > 0 && (
                      <div
                        className="bg-amber-300 rounded h-full"
                        style={{ width: `${(dados.uploadAdmin / total) * 100}%` }}
                        title={`${dados.uploadAdmin} do upload admin`}
                      />
                    )}
                    {dados.aprendidas > 0 && (
                      <div
                        className="bg-green-300 rounded h-full"
                        style={{ width: `${(dados.aprendidas / total) * 100}%` }}
                        title={`${dados.aprendidas} aprendidas de processos`}
                      />
                    )}
                  </div>
                  <span className="text-xs text-gray-500 w-8 text-right">{total}</span>
                </div>
              )
            })}
            <div className="flex items-center gap-4 pt-2 border-t border-gray-100">
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-blue-200" /><span className="text-xs text-gray-500">Templates padrão</span></div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-amber-300" /><span className="text-xs text-gray-500">Upload admin</span></div>
              <div className="flex items-center gap-1.5"><div className="w-3 h-3 rounded-sm bg-green-300" /><span className="text-xs text-gray-500">Aprendidas</span></div>
            </div>
          </div>
        )}
      </div>

      {/* Reusos recentes */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-800">Reusos Recentes ({totalReusos})</h3>
          <Tooltip texto="Cada linha representa uma vez que a plataforma reutilizou uma cláusula da base de conhecimento em vez de chamar a IA, economizando tokens." />
        </div>
        {aplicadas.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm text-gray-400">
            Nenhum reuso registrado ainda. Os reusos aparecem aqui conforme os usuários geram documentos.
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-2.5 text-xs font-semibold text-gray-500">Documento</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500">Campo</th>
                <th className="text-right px-4 py-2.5 text-xs font-semibold text-gray-500">Tokens Econ.</th>
                <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500">Data</th>
              </tr>
            </thead>
            <tbody>
              {(aplicadas as Array<ClausulaAplicada & { tipo_campo?: string }>).slice(0, 20).map((a, i) => (
                <tr key={i} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                  <td className="px-5 py-2.5 font-medium text-gray-800">{LABEL_DOC[a.tipo_documento] ?? a.tipo_documento}</td>
                  <td className="px-4 py-2.5 text-gray-500 text-xs">{a.tipo_campo ?? '-'}</td>
                  <td className="px-4 py-2.5 text-right text-green-700 font-medium">+{(a.tokens_economizados ?? 500).toLocaleString('pt-BR')}</td>
                  <td className="px-4 py-2.5 text-gray-400 text-xs">
                    {new Date(a.aplicado_em).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}