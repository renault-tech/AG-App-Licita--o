import { createClient } from '@/lib/supabase/server'
import { Bot, Zap, TrendingDown, BookOpen, Database } from 'lucide-react'
import { KPIBar } from '@/components/dashboard/kpi-bar'
import { EditorialKicker, HeadlineSerif } from '@/components/licita/editorial'
import { FooterEditorial } from '../../dashboard/shared'

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
  type ClausulaAplicada = { tipo_documento: string; tokens_economizados: number; aplicado_em: string; tipo_campo?: string }
  type ClausulaPadrao = { documento: string; fonte: string }

  const acoes      = (acoesIA ?? []) as AcaoIA[]
  const aprendidas = (clausulasAprendidas ?? []) as ClausulaAprendida[]
  const aplicadas  = (clausulasAplicadas ?? []) as ClausulaAplicada[]
  const padrao     = (clausulasPadrao ?? []) as ClausulaPadrao[]

  // Agregados por provedor
  const porProvedor: Record<string, { chamadas: number; tokensEntrada: number; tokensSaida: number; erros: number }> = {}
  for (const a of acoes) {
    if (!porProvedor[a.provedor]) porProvedor[a.provedor] = { chamadas: 0, tokensEntrada: 0, tokensSaida: 0, erros: 0 }
    porProvedor[a.provedor].chamadas++
    porProvedor[a.provedor].tokensEntrada += a.tokens_entrada ?? 0
    porProvedor[a.provedor].tokensSaida  += a.tokens_saida ?? 0
    if (!a.sucesso) porProvedor[a.provedor].erros++
  }

  const totalTokensConsumidos  = acoes.reduce((s, a) => s + (a.tokens_entrada ?? 0) + (a.tokens_saida ?? 0), 0)
  const totalTokensEconomizados = aplicadas.reduce((s, a) => s + (a.tokens_economizados ?? 500), 0)
  const totalChamadas = acoes.length
  const totalReusos   = aplicadas.length
  const percentualEconomia = totalTokensConsumidos + totalTokensEconomizados > 0
    ? Math.round((totalTokensEconomizados / (totalTokensConsumidos + totalTokensEconomizados)) * 100)
    : 0

  // Clausulas por documento
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

  // Atividade semanal (ultimas 8 semanas)
  const agora = new Date()
  const semanas: { label: string; reusos: number; chamadas: number }[] = []
  for (let i = 7; i >= 0; i--) {
    const inicio = new Date(agora)
    inicio.setDate(inicio.getDate() - (i + 1) * 7)
    const fim = new Date(agora)
    fim.setDate(fim.getDate() - i * 7)
    const label = inicio.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
    const reusos = aplicadas.filter(a => { const d = new Date(a.aplicado_em); return d >= inicio && d < fim }).length
    const chamadas = acoes.filter(a => { const d = new Date(a.created_at); return d >= inicio && d < fim }).length
    semanas.push({ label, reusos, chamadas })
  }
  const maxBarValue = Math.max(...semanas.map(s => s.chamadas + s.reusos), 1)

  const LABEL_PROVEDOR: Record<string, string> = {
    gemini:      'Google Gemini',
    groq:        'Groq (LLaMA)',
    anthropic:   'Anthropic Claude',
    openrouter:  'OpenRouter',
  }

  const LABEL_DOC: Record<string, string> = {
    dfd:         'DFD',
    etp:         'ETP',
    tr:          'Termo de Referencia',
    edital:      'Edital',
    parecer:     'Parecer',
    mapa_riscos: 'Mapa de Riscos',
  }

  return (
    <div className="space-y-8">
      {/* Masthead editorial */}
      <div>
        <div className="flex items-center justify-between pb-3.5 mb-5" style={{ borderBottom: '2px solid var(--rule)' }}>
          <EditorialKicker
            kicker="Administracao da Plataforma"
            date={new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' }).replace(/^./, c => c.toUpperCase())}
          />
          <div className="font-mono text-[10px] font-semibold uppercase hidden sm:block" style={{ color: 'var(--muted)', letterSpacing: '0.14em' }}>
            Lei 14.133/21
          </div>
        </div>
        <HeadlineSerif size="md" as="h1">Gestao de IA.</HeadlineSerif>
        <p className="mt-2 text-[15px]" style={{ color: 'var(--inkSoft)', fontFamily: 'var(--font-heading)', fontStyle: 'italic' }}>
          Consumo de tokens, reutilizacao de clausulas e curva de aprendizado.
        </p>
      </div>

      {/* KPIs */}
      <KPIBar items={[
        { label: 'Chamadas de IA',      value: totalChamadas.toLocaleString('pt-BR'),        sub: 'total acumulado',   sparkline: 'wave', delta: 'acumulado',    deltaColor: 'blue' },
        { label: 'Tokens consumidos',   value: totalTokensConsumidos.toLocaleString('pt-BR'), sub: 'entrada + saida',   sparkline: 'wave', delta: 'total',        deltaColor: 'muted' },
        { label: 'Tokens economizados', value: totalTokensEconomizados.toLocaleString('pt-BR'), sub: 'via clausulas', sparkline: 'up',   delta: `${totalReusos} reusos`, deltaColor: 'success', accent: true },
        { label: 'Taxa de economia',    value: `${percentualEconomia}%`,                       sub: 'do total',         sparkline: 'up',   delta: 'curva',        deltaColor: percentualEconomia > 20 ? 'success' : 'muted' },
      ]} />

      {/* Curva de aprendizado */}
      <div className="glass rounded-[var(--r-lg)] p-5">
        <p className="text-[9.5px] font-bold uppercase mb-4" style={{ color: 'var(--accent)', letterSpacing: '0.16em', fontFamily: 'var(--font-mono)' }}>
          Curva de Aprendizado
        </p>
        <p className="text-xs mb-4" style={{ color: 'var(--muted)' }}>
          Chamadas reais de IA vs reusos de clausulas por semana. Com o tempo, o verde deve crescer e o roxo diminuir.
        </p>
        <div className="flex items-end gap-2 h-32">
          {semanas.map((s, i) => {
            const altChamadas = (s.chamadas / maxBarValue) * 100
            const altReusos   = (s.reusos   / maxBarValue) * 100
            return (
              <div key={i} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full flex items-end gap-0.5" style={{ height: '96px' }}>
                  <div
                    className="flex-1 rounded-t transition-all"
                    style={{ height: `${altChamadas}%`, minHeight: s.chamadas > 0 ? '4px' : '0', background: 'var(--primary)', opacity: 0.7 }}
                    title={`${s.chamadas} chamadas de IA`}
                  />
                  <div
                    className="flex-1 rounded-t transition-all"
                    style={{ height: `${altReusos}%`, minHeight: s.reusos > 0 ? '4px' : '0', background: 'var(--success)', opacity: 0.8 }}
                    title={`${s.reusos} reusos`}
                  />
                </div>
                <span className="text-[9px]" style={{ color: 'var(--muted)' }}>{s.label}</span>
              </div>
            )
          })}
        </div>
        <div className="flex items-center gap-4 mt-3">
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={{ background: 'var(--primary)', opacity: 0.7 }} />
            <span className="text-xs" style={{ color: 'var(--muted)' }}>Chamadas de IA</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-3 h-3 rounded-sm" style={{ background: 'var(--success)', opacity: 0.8 }} />
            <span className="text-xs" style={{ color: 'var(--muted)' }}>Reusos de clausulas</span>
          </div>
        </div>
      </div>

      {/* Consumo por provedor */}
      <div className="glass rounded-[var(--r-lg)] overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: '1px solid var(--glass-edge)', background: 'rgba(0,0,0,0.025)' }}>
          <Bot className="w-4 h-4" style={{ color: 'var(--muted)' }} />
          <h3 className="text-sm font-semibold" style={{ color: 'var(--ink)', fontFamily: 'var(--font-heading)' }}>
            Consumo por provedor
          </h3>
        </div>
        {Object.keys(porProvedor).length === 0 ? (
          <div className="px-5 py-8 text-center text-sm" style={{ color: 'var(--muted)' }}>
            Nenhuma chamada registrada ainda.
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--glass-edge)' }}>
            {Object.entries(porProvedor).map(([prov, dados]) => (
              <div key={prov} className="flex items-center gap-4 px-5 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>{LABEL_PROVEDOR[prov] ?? prov}</p>
                  <p className="text-xs" style={{ color: 'var(--muted)' }}>
                    {dados.tokensEntrada.toLocaleString('pt-BR')} entrada · {dados.tokensSaida.toLocaleString('pt-BR')} saida
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold tabular-nums" style={{ color: 'var(--ink)', fontFamily: 'var(--font-mono)' }}>
                    {dados.chamadas.toLocaleString('pt-BR')} chamadas
                  </p>
                  {dados.erros > 0 && (
                    <p className="text-xs" style={{ color: 'var(--danger)' }}>{dados.erros} erro{dados.erros !== 1 ? 's' : ''}</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Base de clausulas por documento */}
      <div className="glass rounded-[var(--r-lg)] p-5">
        <div className="flex items-center gap-3 mb-4">
          <Database className="w-4 h-4" style={{ color: 'var(--muted)' }} />
          <p className="text-[9.5px] font-bold uppercase" style={{ color: 'var(--accent)', letterSpacing: '0.16em', fontFamily: 'var(--font-mono)' }}>
            Base de Clausulas por Documento
          </p>
        </div>
        {Object.keys(clausulasPorDoc).length === 0 ? (
          <p className="text-sm" style={{ color: 'var(--muted)' }}>Nenhuma clausula na base ainda.</p>
        ) : (
          <div className="space-y-3">
            {Object.entries(clausulasPorDoc).map(([doc, dados]) => {
              const total = dados.padrao + dados.aprendidas + dados.uploadAdmin
              return (
                <div key={doc} className="flex items-center gap-3">
                  <span className="w-32 text-xs shrink-0" style={{ color: 'var(--inkSoft)' }}>{LABEL_DOC[doc] ?? doc}</span>
                  <div className="flex-1 flex items-center gap-1 h-4">
                    {dados.padrao > 0 && (
                      <div
                        className="rounded h-full"
                        style={{ width: `${(dados.padrao / total) * 100}%`, background: 'var(--primary)', opacity: 0.4 }}
                        title={`${dados.padrao} templates padrao`}
                      />
                    )}
                    {dados.uploadAdmin > 0 && (
                      <div
                        className="rounded h-full"
                        style={{ width: `${(dados.uploadAdmin / total) * 100}%`, background: 'var(--warn)', opacity: 0.6 }}
                        title={`${dados.uploadAdmin} upload admin`}
                      />
                    )}
                    {dados.aprendidas > 0 && (
                      <div
                        className="rounded h-full"
                        style={{ width: `${(dados.aprendidas / total) * 100}%`, background: 'var(--success)', opacity: 0.7 }}
                        title={`${dados.aprendidas} aprendidas`}
                      />
                    )}
                  </div>
                  <span className="text-xs w-8 text-right tabular-nums" style={{ color: 'var(--muted)' }}>{total}</span>
                </div>
              )
            })}
            <div className="flex items-center gap-4 pt-2" style={{ borderTop: '1px solid var(--glass-edge)' }}>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm" style={{ background: 'var(--primary)', opacity: 0.4 }} />
                <span className="text-xs" style={{ color: 'var(--muted)' }}>Templates padrao</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm" style={{ background: 'var(--warn)', opacity: 0.6 }} />
                <span className="text-xs" style={{ color: 'var(--muted)' }}>Upload admin</span>
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-3 h-3 rounded-sm" style={{ background: 'var(--success)', opacity: 0.7 }} />
                <span className="text-xs" style={{ color: 'var(--muted)' }}>Aprendidas</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Reusos recentes */}
      <div className="glass rounded-[var(--r-lg)] overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: '1px solid var(--glass-edge)', background: 'rgba(0,0,0,0.025)' }}>
          <Zap className="w-4 h-4" style={{ color: 'var(--muted)' }} />
          <h3 className="text-sm font-semibold" style={{ color: 'var(--ink)', fontFamily: 'var(--font-heading)' }}>
            Reusos recentes ({totalReusos})
          </h3>
        </div>
        {aplicadas.length === 0 ? (
          <div className="px-5 py-8 text-center text-sm" style={{ color: 'var(--muted)' }}>
            Nenhum reuso registrado ainda.
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--glass-edge)' }}>
            {aplicadas.slice(0, 20).map((a, i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>{LABEL_DOC[a.tipo_documento] ?? a.tipo_documento}</p>
                  <p className="text-xs" style={{ color: 'var(--muted)' }}>{a.tipo_campo ?? '-'}</p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold tabular-nums" style={{ color: 'var(--success)', fontFamily: 'var(--font-mono)' }}>
                    +{(a.tokens_economizados ?? 500).toLocaleString('pt-BR')}
                  </p>
                  <p className="text-xs" style={{ color: 'var(--muted)' }}>
                    {new Date(a.aplicado_em).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <FooterEditorial />
    </div>
  )
}
