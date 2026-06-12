import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { ArrowRight, AlertTriangle } from 'lucide-react'
import { KPIBar } from '@/components/dashboard/kpi-bar'
import { CardConfigShell } from '@/components/dashboard/card-config-shell'
import {
  FooterEditorial, SectionHeader,
  ProcessosListSection, DarkFeaturedCard, AiSuggestionCard,
} from './shared'
import { buscarPreferenciaDashboard } from '@/lib/actions/dashboard'

interface Props { userId: string; orgId: string; orgNome: string; cargo: string | null; nome?: string | null }

const FASE_KEYS = ['requisitante', 'setor_compras', 'setor_licitacao', 'procurador', 'gestor_publico', 'publicacao']
const FASE_LABELS: Record<string, string> = {
  requisitante:    'Requisitante',
  setor_compras:   'Compras',
  setor_licitacao: 'Licitacoes',
  procurador:      'Procuradoria',
  gestor_publico:  'Autorizacao',
  publicacao:      'Publicacao',
}

export async function DashboardAdminOrg({ userId, orgId, orgNome, cargo, nome }: Props) {
  const supabase = await createClient()

  const pref = await buscarPreferenciaDashboard('ia_periodo_dias', { dias: 30 })
  const diasIa = typeof (pref as any).dias === 'number' ? (pref as any).dias : 30
  const corte = new Date(Date.now() - diasIa * 86400000).toISOString()

  const [
    { data: usuarios },
    { data: processos },
    { data: acoesIa },
    { data: creditos },
    { data: orgInfo },
  ] = await Promise.all([
    (supabase as any).from('usuarios').select('id, nome_completo, papel, status_aprovacao').eq('organizacao_id', orgId),
    (supabase as any).from('processos_licitatorios').select('id, status, fase_atual').eq('organizacao_id', orgId),
    (supabase as any).from('acoes_ia').select('id, usuario_id, creditos_consumidos').eq('organizacao_id', orgId).gte('created_at', corte),
    (supabase as any).from('creditos_usuario').select('saldo').eq('usuario_id', userId).maybeSingle(),
    (supabase as any).from('organizacoes').select('ativo').eq('id', orgId).maybeSingle(),
  ])

  const usuariosList  = (usuarios as any[]) ?? []
  const processosList = (processos as any[]) ?? []
  const acoesList     = (acoesIa as any[]) ?? []
  const saldo         = (creditos as any)?.saldo ?? 0
  const orgAtiva      = (orgInfo as any)?.ativo ?? false

  const ativos    = usuariosList.filter((u: any) => u.status_aprovacao === 'ativo').length
  const pendentes = usuariosList.filter((u: any) => u.status_aprovacao !== 'ativo').length
  const andamento = processosList.filter((p: any) => !['publicado','assinado'].includes(p.status)).length
  const tokensMes = acoesList.reduce((acc: number, a: any) => acc + (a.creditos_consumidos ?? 0), 0)

  const faseDist = FASE_KEYS.map((k) => ({
    key:   k,
    label: FASE_LABELS[k],
    count: processosList.filter((p: any) => p.fase_atual === k && !['publicado','assinado','cancelado'].includes(p.status)).length,
  })).filter((f) => f.count > 0)

  // Fase com maior gargalo para o card de destaque
  const faseUrgente = faseDist.sort((a, b) => b.count - a.count)[0] ?? null

  // Top usuarios por consumo de IA
  const usuariosComConsumo = usuariosList.map((u: any) => ({
    ...u,
    tokens: acoesList.filter((a: any) => a.usuario_id === u.id).reduce((acc: number, a: any) => acc + (a.creditos_consumidos ?? 0), 0),
  })).sort((a, b) => b.tokens - a.tokens)

  return (
    <div className="space-y-8">
      <SectionHeader
        supTitle="Admin Organizacao"
        title={orgNome}
        nome={nome}
        contextLine={
          pendentes > 0
            ? `${pendentes} usuario${pendentes > 1 ? 's' : ''} pendente${pendentes > 1 ? 's' : ''} de aprovacao.`
            : `${ativos} usuario${ativos !== 1 ? 's' : ''} ativo${ativos !== 1 ? 's' : ''}, ${andamento} processo${andamento !== 1 ? 's' : ''} em andamento.`
        }
      />

      {!orgAtiva && (
        <div
          className="flex items-start gap-3 rounded-[var(--r-lg)] px-5 py-4"
          style={{ background: 'var(--warnWash)', border: '1px solid var(--warn)', color: 'var(--warn)' }}
        >
          <AlertTriangle className="w-5 h-5 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-semibold">Prefeitura aguardando ativacao</p>
            <p className="text-sm mt-0.5" style={{ color: 'var(--inkSoft)' }}>
              O cadastro foi recebido e esta em analise pelo administrador da plataforma. Voce sera notificado por e-mail quando a conta for ativada.
            </p>
          </div>
        </div>
      )}

      <KPIBar items={[
        { label: 'Usuarios ativos',  value: ativos,   sub: 'na organizacao',     sparkline: 'up',   delta: `${ativos} ativos`,   deltaColor: 'success' },
        { label: 'Em andamento',     value: andamento, sub: 'processos',          sparkline: andamento > 0 ? 'wave' : 'flat', delta: `${andamento} ativos`, deltaColor: andamento > 0 ? 'blue' : 'muted' },
        { label: `IA (${diasIa}d)`,  value: tokensMes.toLocaleString('pt-BR'), sub: 'tokens consumidos', sparkline: 'wave', delta: `${diasIa}d`, deltaColor: 'blue' },
        { label: 'Creditos disp.',   value: saldo, sub: 'saldo atual',            sparkline: saldo > 0 ? 'flat' : 'down', delta: saldo > 0 ? 'disponivel' : 'baixo', deltaColor: saldo > 50 ? 'success' : 'warn' },
      ]} />

      {/* Layout duas colunas */}
      <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-6 items-start">

        {/* Coluna principal */}
        <div className="space-y-6">
          <CardConfigShell
            configKey="ia_periodo_dias"
            configValue={{ dias: diasIa }}
            config={{
              type: 'select',
              label: 'Periodo de analise de IA',
              field: 'dias',
              options: [7, 15, 30, 60, 90].map((d) => ({ value: d, label: `${d} dias` })),
            }}
          >
            <ProcessosListSection
              title={`Uso de IA, últimos ${diasIa} dias`}
              rightLabel="Por usuario"
            >
              {usuariosComConsumo.slice(0, 10).map((u: any) => (
                <div
                  key={u.id}
                  className="glass rounded-[var(--r-lg)] flex items-center justify-between px-5 py-3"
                >
                  <div>
                    <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>{u.nome_completo}</p>
                    <p className="text-xs" style={{ color: 'var(--muted)' }}>{u.papel}</p>
                  </div>
                  <span className="text-sm font-semibold tabular-nums" style={{ color: 'var(--ink)', fontFamily: 'var(--font-mono)' }}>
                    {u.tokens.toLocaleString('pt-BR')} tok
                  </span>
                </div>
              ))}
            </ProcessosListSection>
          </CardConfigShell>

          <ProcessosListSection
            title="Usuarios"
            rightLabel={
              <Link href="/configuracoes/usuarios" className="flex items-center gap-1 text-[11px] font-bold uppercase" style={{ color: 'var(--primary)', letterSpacing: '0.1em' }}>
                Gerenciar <ArrowRight className="w-3 h-3" />
              </Link>
            }
          >
            {usuariosList.slice(0, 10).map((u: any) => (
              <div
                key={u.id}
                className="glass rounded-[var(--r-lg)] flex items-center justify-between px-5 py-3"
              >
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>{u.nome_completo}</p>
                  <p className="text-xs" style={{ color: 'var(--muted)' }}>{u.papel}</p>
                </div>
                <span
                  className="text-xs px-2 py-0.5 rounded-full font-semibold"
                  style={{
                    background: u.status_aprovacao === 'ativo' ? 'var(--successWash)' : 'var(--warnWash)',
                    color: u.status_aprovacao === 'ativo' ? 'var(--success)' : 'var(--warn)',
                  }}
                >
                  {u.status_aprovacao}
                </span>
              </div>
            ))}
          </ProcessosListSection>
        </div>

        {/* Coluna lateral direita */}
        <div className="space-y-4">
          {faseUrgente && (
            <DarkFeaturedCard
              titulo={`${faseUrgente.count} processo${faseUrgente.count > 1 ? 's' : ''} parado${faseUrgente.count > 1 ? 's' : ''} em ${faseUrgente.label}.`}
              descricao={`O gargalo atual esta na fase ${faseUrgente.label}. Verifique se ha bloqueios ou usuarios sem capacidade.`}
              href={`/processos?fase=${faseUrgente.key}`}
              badge="Gargalo · Fase com mais processos"
            />
          )}
          <AiSuggestionCard
            texto={
              pendentes > 0
                ? `Ha ${pendentes} usuario${pendentes > 1 ? 's' : ''} aguardando aprovacao. Acesse Configuracoes para liberar o acesso.`
                : saldo < 20
                  ? 'Saldo de creditos IA baixo. Considere recarregar para nao interromper o fluxo de geracoes.'
                  : `Organizacao saudavel com ${ativos} usuario${ativos !== 1 ? 's' : ''} ativos e ${andamento} processo${andamento !== 1 ? 's' : ''} em andamento.`
            }
            hrefDetalhes={pendentes > 0 ? '/configuracoes/usuarios' : saldo < 20 ? '/creditos' : '/processos'}
          />
        </div>
      </div>

      {/* Processos por fase */}
      {faseDist.length > 0 && (
        <div className="glass rounded-[var(--r-lg)] p-5 space-y-3">
          <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--muted)', letterSpacing: '0.14em', fontFamily: 'var(--font-mono)' }}>
            Processos em andamento por fase
          </p>
          <div className="space-y-2">
            {faseDist.map((f) => (
              <div key={f.key} className="flex items-center justify-between">
                <span className="text-sm" style={{ color: 'var(--inkSoft)' }}>{f.label}</span>
                <span className="text-sm font-semibold tabular-nums" style={{ color: 'var(--ink)' }}>{f.count}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      <FooterEditorial />
    </div>
  )
}
