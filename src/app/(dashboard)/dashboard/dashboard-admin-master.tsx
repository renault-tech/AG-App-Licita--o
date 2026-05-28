import { createServiceClient } from '@/lib/supabase/server'
import { AlertCircle } from 'lucide-react'
import { KPIBar } from '@/components/dashboard/kpi-bar'
import { CardConfigShell } from '@/components/dashboard/card-config-shell'
import { PrefeiturasList } from '@/components/dashboard/prefeituras-list'
import {
  FooterEditorial, SectionHeader,
  ProcessosListSection, DarkFeaturedCard, AiSuggestionCard,
} from './shared'
import { buscarPreferenciaDashboard } from '@/lib/actions/dashboard'

interface Props { userId: string; nome?: string | null }

const FASE_LABELS: Record<string, string> = {
  requisitante:    'Requisitante',
  setor_compras:   'Compras',
  setor_licitacao: 'Licitacoes',
  procurador:      'Procuradoria',
  gestor_publico:  'Autorizacao',
  publicacao:      'Publicacao',
}
const FASE_KEYS = Object.keys(FASE_LABELS)

const MODALIDADE_LABEL: Record<string, string> = {
  pregao_eletronico:   'Pregao Eletronico',
  concorrencia:        'Concorrencia',
  concurso:            'Concurso',
  leilao:              'Leilao',
  dialogo_competitivo: 'Dialogo Competitivo',
  dispensa:            'Dispensa',
  inexigibilidade:     'Inexigibilidade',
}

export async function DashboardAdminMaster({ userId: _userId, nome }: Props) {
  const supabase = await createServiceClient()

  const pref   = await buscarPreferenciaDashboard('ia_periodo_dias', { dias: 30 })
  const diasIa = typeof (pref as any).dias === 'number' ? (pref as any).dias : 30
  const corte  = new Date(Date.now() - diasIa * 86400000).toISOString()

  const [
    { data: orgs },
    { data: usuarios },
    { data: processos },
    { data: acoesIa },
    { data: creditos },
  ] = await Promise.all([
    (supabase as any)
      .from('organizacoes')
      .select('id, nome, municipio, estado, ativo, is_demo, created_at')
      .order('nome'),
    (supabase as any)
      .from('usuarios')
      .select('id, organizacao_id, status_aprovacao, papel'),
    (supabase as any)
      .from('processos_licitatorios')
      .select('id, organizacao_id, status, fase_atual, modalidade, updated_at'),
    (supabase as any)
      .from('acoes_ia')
      .select('id, organizacao_id, creditos_consumidos')
      .gte('created_at', corte),
    (supabase as any)
      .from('creditos_usuario')
      .select('organizacao_id, saldo'),
  ])

  const orgsList      = (orgs      as any[]) ?? []
  const usuariosList  = (usuarios  as any[]) ?? []
  const processosList = (processos as any[]) ?? []
  const acoesList     = (acoesIa  as any[]) ?? []
  const creditosList  = (creditos as any[]) ?? []

  // KPIs globais
  const totalAtivos     = usuariosList.filter((u: any) => u.status_aprovacao === 'ativo').length
  const totalPendentes  = usuariosList.filter((u: any) => u.status_aprovacao !== 'ativo').length
  const totalAndamento  = processosList.filter((p: any) => !['publicado', 'assinado', 'cancelado'].includes(p.status)).length
  const totalConcluidos = processosList.filter((p: any) => ['publicado', 'assinado'].includes(p.status)).length
  const totalTokens     = acoesList.reduce((acc: number, a: any) => acc + (a.creditos_consumidos ?? 0), 0)
  const totalCreditos   = creditosList.reduce((acc: number, c: any) => acc + (c.saldo ?? 0), 0)

  // Distribuicao de fases (processos em andamento agrupados por fase_atual)
  const fasesDist = FASE_KEYS.map((k) => ({
    key:   k,
    label: FASE_LABELS[k],
    count: processosList.filter((p: any) => p.fase_atual === k && !['publicado','assinado','cancelado'].includes(p.status)).length,
  })).filter((f) => f.count > 0).sort((a, b) => b.count - a.count)

  // Distribuicao de modalidades (top 5)
  const modalidadesDist = Object.entries(
    processosList.reduce((acc: Record<string, number>, p: any) => {
      const m = p.modalidade || 'nao_definida'
      acc[m] = (acc[m] ?? 0) + 1
      return acc
    }, {})
  )
    .sort(([, a], [, b]) => b - a)
    .slice(0, 6)

  // Orgs com dados enriquecidos
  const orgsComDados = orgsList.map((org: any) => {
    const orgProcessos = processosList.filter((p: any) => p.organizacao_id === org.id)
    const orgAtivos    = usuariosList.filter((u: any) => u.organizacao_id === org.id && u.status_aprovacao === 'ativo').length
    const orgPendentes = usuariosList.filter((u: any) => u.organizacao_id === org.id && u.status_aprovacao !== 'ativo').length
    const orgTokens    = acoesList.filter((a: any) => a.organizacao_id === org.id)
      .reduce((acc: number, a: any) => acc + (a.creditos_consumidos ?? 0), 0)
    const orgCreditos  = creditosList.filter((c: any) => c.organizacao_id === org.id)
      .reduce((acc: number, c: any) => acc + (c.saldo ?? 0), 0)
    const ultimaAtiv   = orgProcessos.reduce((latest: string | null, p: any) =>
      !latest || p.updated_at > latest ? p.updated_at : latest, null)

    return {
      ...org,
      processos:      orgProcessos.length,
      andamento:      orgProcessos.filter((p: any) => !['publicado','assinado','cancelado'].includes(p.status)).length,
      usuariosAtivos: orgAtivos,
      usuariosPend:   orgPendentes,
      tokens:         orgTokens,
      creditos:       orgCreditos,
      ultimaAtiv,
    }
  })

  // Ordenar por atividade recente
  const orgsOrdenadas = [...orgsComDados].sort((a, b) => {
    if (!a.ultimaAtiv && !b.ultimaAtiv) return 0
    if (!a.ultimaAtiv) return 1
    if (!b.ultimaAtiv) return -1
    return b.ultimaAtiv.localeCompare(a.ultimaAtiv)
  })

  const orgsAtivas   = orgsList.filter((o: any) => o.ativo && !o.is_demo).length
  const orgsInativas = orgsList.filter((o: any) => !o.ativo).length
  const orgsDemo     = orgsList.filter((o: any) => o.is_demo).length

  // Org com mais atividade recente para o card de destaque
  const orgUrgente = orgsOrdenadas.find((o: any) => o.andamento > 0) ?? orgsOrdenadas[0] ?? null

  return (
    <div className="space-y-8">
      <SectionHeader
        supTitle="Administracao da Plataforma"
        title="Visao global."
        nome={nome}
        contextLine={`${orgsList.length} organizacoes · ${totalAtivos} usuarios ativos · ${processosList.length} processos`}
      />

      {/* KPIs principais */}
      <KPIBar items={[
        { label: 'Prefeituras',     value: orgsList.length,  sub: 'cadastradas',    sparkline: 'up',   delta: `${orgsAtivas} ativas`,   deltaColor: 'success' },
        { label: 'Usuarios ativos', value: totalAtivos,      sub: 'na plataforma',  sparkline: 'up',   delta: `${totalPendentes} pend.`, deltaColor: totalPendentes > 0 ? 'warn' : 'muted' },
        { label: 'Em andamento',    value: totalAndamento,   sub: 'processos',      sparkline: totalAndamento > 0 ? 'wave' : 'flat', delta: `${totalAndamento} ativos`, deltaColor: totalAndamento > 0 ? 'blue' : 'muted' },
        { label: 'Concluidos',      value: totalConcluidos,  sub: 'publicados',     sparkline: 'up',   delta: 'total',           deltaColor: 'success' },
        { label: `IA (${diasIa}d)`, value: totalTokens.toLocaleString('pt-BR'), sub: 'tokens', sparkline: 'wave', delta: `${diasIa}d`, deltaColor: 'blue' },
        { label: 'Creditos totais', value: totalCreditos.toLocaleString('pt-BR'), sub: 'saldo', sparkline: 'flat', delta: 'plataforma', deltaColor: 'muted' },
      ]} />

      {/* Layout duas colunas */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-6 items-start">

        {/* Coluna principal */}
        <div className="space-y-6">

          {/* Distribuicoes em glass cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="glass rounded-[var(--r-lg)] p-5 space-y-3">
              <p className="text-[9.5px] font-bold uppercase tracking-wider" style={{ color: 'var(--muted)', letterSpacing: '0.14em', fontFamily: 'var(--font-mono)' }}>
                Organizacoes
              </p>
              <div className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="text-sm" style={{ color: 'var(--inkSoft)' }}>Ativas</span>
                  <span className="text-sm font-semibold tabular-nums" style={{ color: 'var(--success)' }}>{orgsAtivas}</span>
                </div>
                {orgsDemo > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm" style={{ color: 'var(--inkSoft)' }}>Demo</span>
                    <span className="text-sm font-semibold tabular-nums" style={{ color: 'var(--warn)' }}>{orgsDemo}</span>
                  </div>
                )}
                {orgsInativas > 0 && (
                  <div className="flex justify-between items-center">
                    <span className="text-sm" style={{ color: 'var(--inkSoft)' }}>Suspensas</span>
                    <span className="text-sm font-semibold tabular-nums" style={{ color: 'var(--error)' }}>{orgsInativas}</span>
                  </div>
                )}
                {totalPendentes > 0 && (
                  <div className="flex justify-between items-center border-t pt-2" style={{ borderColor: 'var(--hairline)' }}>
                    <span className="text-sm flex items-center gap-1" style={{ color: 'var(--warn)' }}>
                      <AlertCircle className="w-3 h-3" />
                      Usuarios pendentes
                    </span>
                    <span className="text-sm font-semibold tabular-nums" style={{ color: 'var(--warn)' }}>{totalPendentes}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="glass rounded-[var(--r-lg)] p-5 space-y-3">
              <p className="text-[9.5px] font-bold uppercase tracking-wider" style={{ color: 'var(--muted)', letterSpacing: '0.14em', fontFamily: 'var(--font-mono)' }}>
                Em andamento por fase
              </p>
              {fasesDist.length === 0 ? (
                <p className="text-sm" style={{ color: 'var(--muted)' }}>Nenhum processo em andamento</p>
              ) : (
                <div className="space-y-2">
                  {fasesDist.map((f) => (
                    <div key={f.key} className="flex justify-between items-center">
                      <span className="text-sm" style={{ color: 'var(--inkSoft)' }}>{f.label}</span>
                      <span className="text-sm font-semibold tabular-nums" style={{ color: 'var(--ink)' }}>{f.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="glass rounded-[var(--r-lg)] p-5 space-y-3">
              <p className="text-[9.5px] font-bold uppercase tracking-wider" style={{ color: 'var(--muted)', letterSpacing: '0.14em', fontFamily: 'var(--font-mono)' }}>
                Por modalidade
              </p>
              {modalidadesDist.length === 0 ? (
                <p className="text-sm" style={{ color: 'var(--muted)' }}>Sem processos</p>
              ) : (
                <div className="space-y-2">
                  {modalidadesDist.map(([mod, count]) => (
                    <div key={mod} className="flex justify-between items-center">
                      <span className="text-sm truncate" style={{ color: 'var(--inkSoft)' }}>
                        {MODALIDADE_LABEL[mod] ?? mod}
                      </span>
                      <span className="text-sm font-semibold tabular-nums shrink-0 ml-2" style={{ color: 'var(--ink)' }}>{count as number}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Lista de prefeituras com filtros */}
          <CardConfigShell
            configKey="ia_periodo_dias"
            configValue={{ dias: diasIa }}
            config={{
              type: 'select',
              label: 'Periodo de analise',
              field: 'dias',
              options: [7, 15, 30, 60, 90].map((d) => ({ value: d, label: `${d} dias` })),
            }}
          >
            <PrefeiturasList orgs={orgsOrdenadas} diasIa={diasIa} />
          </CardConfigShell>
        </div>

        {/* Coluna lateral direita */}
        <div className="space-y-4">
          {orgUrgente && (
            <DarkFeaturedCard
              titulo={`${orgUrgente.nome} tem ${orgUrgente.andamento} processo${orgUrgente.andamento !== 1 ? 's' : ''} em andamento.`}
              descricao={`${orgUrgente.municipio} · ${orgUrgente.estado} · ${orgUrgente.usuariosAtivos} usuario${orgUrgente.usuariosAtivos !== 1 ? 's' : ''} ativo${orgUrgente.usuariosAtivos !== 1 ? 's' : ''}`}
              href={`/admin/prefeituras/${orgUrgente.id}`}
              badge="Mais ativa · Atividade recente"
            />
          )}
          <AiSuggestionCard
            texto={
              totalPendentes > 0
                ? `Ha ${totalPendentes} usuario${totalPendentes > 1 ? 's' : ''} aguardando aprovacao em alguma organizacao. Verifique as configuracoes de cada prefeitura.`
                : orgsDemo > 0
                  ? `Ha ${orgsDemo} organizacao${orgsDemo > 1 ? 'oes' : ''} em modo demo. Considere converter para ativa apos onboarding completo.`
                  : `Plataforma saudavel com ${orgsAtivas} prefeitura${orgsAtivas !== 1 ? 's' : ''} ativa${orgsAtivas !== 1 ? 's' : ''} e ${totalAndamento} processo${totalAndamento !== 1 ? 's' : ''} em tramitacao.`
            }
            hrefDetalhes={orgUrgente ? `/admin/prefeituras/${orgUrgente.id}` : '/configuracoes'}
          />
        </div>
      </div>

      <FooterEditorial />
    </div>
  )
}
