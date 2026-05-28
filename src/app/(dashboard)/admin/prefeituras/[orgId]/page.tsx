import { createServiceClient, createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { obterPapelUsuario } from '@/lib/actions/usuario'
import Link from 'next/link'
import {
  ChevronRight, Users, FileText,
  AlertCircle, Building2,
} from 'lucide-react'
import { KPIBar } from '@/components/dashboard/kpi-bar'
import { FaseTimeline } from '@/components/dashboard/fase-timeline'
import type { FaseNode } from '@/components/dashboard/fase-timeline'
import { FooterEditorial } from '../../../dashboard/shared'

const PAPEL_LABEL: Record<string, string> = {
  requisitante:       'Requisitante',
  setor_compras:      'Setor de Compras',
  setor_licitacao:    'Setor de Licitacoes',
  procurador:         'Procurador',
  gestor_publico:     'Gestor Publico',
  publicacao:         'Publicacao',
  admin_organizacao:  'Admin da Organizacao',
  admin_plataforma:   'Admin da Plataforma',
}

const STATUS_LABEL: Record<string, { label: string; bg: string; color: string }> = {
  rascunho:    { label: 'Rascunho',    bg: 'var(--surfaceAlt)',  color: 'var(--muted)' },
  em_revisao:  { label: 'Em revisao',  bg: 'var(--warnWash)',    color: 'var(--warn)' },
  devolvido:   { label: 'Devolvido',   bg: 'var(--errorWash)',   color: 'var(--error)' },
  aprovado:    { label: 'Aprovado',    bg: 'var(--successWash)', color: 'var(--success)' },
  publicado:   { label: 'Publicado',   bg: 'var(--successWash)', color: 'var(--success)' },
  assinado:    { label: 'Assinado',    bg: 'var(--primaryWash)', color: 'var(--primary)' },
  cancelado:   { label: 'Cancelado',   bg: 'var(--errorWash)',   color: 'var(--error)' },
}

const MODALIDADE_LABEL: Record<string, string> = {
  pregao_eletronico:    'Pregao Eletronico',
  concorrencia:         'Concorrencia',
  concurso:             'Concurso',
  leilao:               'Leilao',
  dialogo_competitivo:  'Dialogo Competitivo',
  dispensa:             'Dispensa',
  inexigibilidade:      'Inexigibilidade',
}

export default async function AdminPrefeituraPage({
  params,
}: {
  params: Promise<{ orgId: string }>
}) {
  const { orgId } = await params

  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) redirect('/login')

  const papel = await obterPapelUsuario()
  if (papel !== 'admin_plataforma') redirect('/dashboard')

  const supabase = await createServiceClient()
  const corte30d = new Date(Date.now() - 30 * 86400000).toISOString()

  const [
    { data: org },
    { data: processos },
    { data: usuarios },
    { data: acoesIa },
    { data: creditos },
  ] = await Promise.all([
    (supabase as any)
      .from('organizacoes')
      .select('id, nome, municipio, estado, cnpj, ativo, is_demo, created_at')
      .eq('id', orgId)
      .maybeSingle(),
    (supabase as any)
      .from('processos_licitatorios')
      .select('id, objeto, numero_processo, modalidade, status, fase_atual, updated_at')
      .eq('organizacao_id', orgId)
      .order('updated_at', { ascending: false }),
    (supabase as any)
      .from('usuarios')
      .select('id, nome_completo, papel, status_aprovacao, created_at')
      .eq('organizacao_id', orgId)
      .order('nome_completo'),
    (supabase as any)
      .from('acoes_ia')
      .select('id, creditos_consumidos, tipo_acao, created_at')
      .eq('organizacao_id', orgId)
      .gte('created_at', corte30d),
    (supabase as any)
      .from('creditos_usuario')
      .select('saldo')
      .eq('organizacao_id', orgId),
  ])

  if (!org) redirect('/dashboard')

  const orgData       = org as any
  const processosList = (processos as any[]) ?? []
  const usuariosList  = (usuarios as any[]) ?? []
  const acoesList     = (acoesIa as any[]) ?? []
  const creditosList  = (creditos as any[]) ?? []

  const ativos     = usuariosList.filter((u: any) => u.status_aprovacao === 'ativo').length
  const andamento  = processosList.filter((p: any) => !['publicado', 'assinado', 'cancelado'].includes(p.status)).length
  const concluidos = processosList.filter((p: any) => ['publicado', 'assinado'].includes(p.status)).length
  const tokens     = acoesList.reduce((acc: number, a: any) => acc + (a.creditos_consumidos ?? 0), 0)
  const saldoTotal = creditosList.reduce((acc: number, c: any) => acc + (c.saldo ?? 0), 0)

  const FASE_KEYS = ['requisitante', 'setor_compras', 'setor_licitacao', 'procurador', 'gestor_publico', 'publicacao']
  const FASE_LABELS: Record<string, string> = {
    requisitante:    'Requisitante',
    setor_compras:   'Compras',
    setor_licitacao: 'Licitacoes',
    procurador:      'Procuradoria',
    gestor_publico:  'Autorizacao',
    publicacao:      'Publicacao',
  }
  const fases: FaseNode[] = FASE_KEYS.map((k) => ({
    key:        k,
    label:      FASE_LABELS[k],
    count:      processosList.filter((p: any) => p.fase_atual === k).length,
    devolvidos: processosList.filter((p: any) => p.fase_atual === k && p.status === 'devolvido').length,
    parados:    0,
    href:       `/processos?fase=${k}`,
  }))

  const modalidades = Object.entries(
    processosList.reduce((acc: Record<string, number>, p: any) => {
      const m = p.modalidade || 'nao_definida'
      acc[m] = (acc[m] ?? 0) + 1
      return acc
    }, {})
  ).sort(([, a], [, b]) => b - a)

  const statusDist = Object.entries(
    processosList.reduce((acc: Record<string, number>, p: any) => {
      acc[p.status ?? 'rascunho'] = (acc[p.status ?? 'rascunho'] ?? 0) + 1
      return acc
    }, {})
  ).sort(([, a], [, b]) => b - a)

  const cadastroEm = orgData.created_at
    ? new Date(orgData.created_at).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
    : null

  return (
    <div className="space-y-8">
      {/* Breadcrumb */}
      <nav className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--muted)' }}>
        <Link href="/dashboard" className="hover:underline">Plataforma</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span style={{ color: 'var(--ink)', fontWeight: 600 }}>{orgData.nome}</span>
      </nav>

      {/* Cabecalho */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-[var(--r-lg)] flex items-center justify-center shrink-0"
            style={{ background: 'var(--primaryWash)' }}
          >
            <Building2 className="w-6 h-6" style={{ color: 'var(--primary)' }} />
          </div>
          <div>
            <h1 className="text-2xl font-semibold" style={{ fontFamily: 'var(--font-heading)', color: 'var(--ink)' }}>
              {orgData.nome}
            </h1>
            <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>
              {orgData.municipio} · {orgData.estado}
              {orgData.cnpj ? ` · CNPJ ${orgData.cnpj}` : ''}
              {cadastroEm ? ` · Desde ${cadastroEm}` : ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {orgData.is_demo && (
            <span className="text-xs px-2 py-1 rounded-full font-semibold" style={{ background: 'var(--warnWash)', color: 'var(--warn)' }}>
              Demo
            </span>
          )}
          <span
            className="text-xs px-2 py-1 rounded-full font-semibold"
            style={{
              background: orgData.ativo ? 'var(--successWash)' : 'var(--errorWash)',
              color:      orgData.ativo ? 'var(--success)' : 'var(--error)',
            }}
          >
            {orgData.ativo ? 'Ativa' : 'Suspensa'}
          </span>
        </div>
      </div>

      {/* KPIs */}
      <KPIBar items={[
        { label: 'Usuarios ativos', value: ativos,                               sub: 'na organizacao',  sparkline: 'up',   delta: `${ativos} ativos`,      deltaColor: 'success' },
        { label: 'Em andamento',    value: andamento,                             sub: 'processos',       sparkline: andamento > 0 ? 'wave' : 'flat', delta: `${andamento} ativos`, deltaColor: andamento > 0 ? 'blue' : 'muted' },
        { label: 'Concluidos',      value: concluidos,                            sub: 'publicados',      sparkline: 'up',   delta: 'total',                 deltaColor: 'success' },
        { label: 'IA (30d)',        value: tokens.toLocaleString('pt-BR'),        sub: 'tokens',          sparkline: 'wave', delta: '30 dias',               deltaColor: 'blue' },
        { label: 'Saldo creditos',  value: saldoTotal.toLocaleString('pt-BR'),    sub: 'disponivel',      sparkline: saldoTotal > 0 ? 'flat' : 'down', delta: saldoTotal > 0 ? 'ok' : 'baixo', deltaColor: saldoTotal > 50 ? 'success' : 'warn' },
      ]} />

      {processosList.length > 0 && <FaseTimeline fases={fases} />}

      {/* Distribuicoes */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="glass rounded-[var(--r-lg)] p-5 space-y-3">
          <p className="text-[9.5px] font-bold uppercase tracking-wider" style={{ color: 'var(--muted)', letterSpacing: '0.14em', fontFamily: 'var(--font-mono)' }}>
            Modalidades
          </p>
          {modalidades.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--muted)' }}>Sem processos</p>
          ) : (
            <div className="space-y-2">
              {modalidades.map(([mod, count]) => (
                <div key={mod} className="flex items-center justify-between">
                  <span className="text-sm" style={{ color: 'var(--inkSoft)' }}>{MODALIDADE_LABEL[mod] ?? mod}</span>
                  <span className="text-sm font-semibold tabular-nums" style={{ color: 'var(--ink)' }}>{count as number}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="glass rounded-[var(--r-lg)] p-5 space-y-3">
          <p className="text-[9.5px] font-bold uppercase tracking-wider" style={{ color: 'var(--muted)', letterSpacing: '0.14em', fontFamily: 'var(--font-mono)' }}>
            Status dos processos
          </p>
          {statusDist.length === 0 ? (
            <p className="text-sm" style={{ color: 'var(--muted)' }}>Sem processos</p>
          ) : (
            <div className="space-y-2">
              {statusDist.map(([status, count]) => {
                const s = STATUS_LABEL[status] ?? { label: status, bg: 'var(--surfaceAlt)', color: 'var(--muted)' }
                return (
                  <div key={status} className="flex items-center justify-between">
                    <span className="text-xs px-2 py-0.5 rounded-full font-semibold" style={{ background: s.bg, color: s.color }}>
                      {s.label}
                    </span>
                    <span className="text-sm font-semibold tabular-nums" style={{ color: 'var(--ink)' }}>{count as number}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>

      {/* Lista de processos */}
      <div className="glass rounded-[var(--r-lg)] overflow-hidden">
        <div
          className="flex items-center justify-between px-6 py-5"
          style={{ borderBottom: '1px solid var(--glass-edge)', background: 'rgba(0,0,0,0.025)' }}
        >
          <div>
            <h2 className="text-base font-semibold" style={{ color: 'var(--ink)', fontFamily: 'var(--font-heading)' }}>Processos</h2>
            <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>{processosList.length} no total</p>
          </div>
        </div>
        {processosList.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <FileText className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--muted)' }} />
            <p className="text-sm" style={{ color: 'var(--muted)' }}>Nenhum processo criado ainda</p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--glass-edge)' }}>
            {processosList.map((p: any) => {
              const s = STATUS_LABEL[p.status ?? 'rascunho'] ?? STATUS_LABEL.rascunho
              return (
                <Link
                  key={p.id}
                  href={`/processos/${p.id}/dfd`}
                  className="flex items-center gap-4 px-6 py-3 transition-colors hover:bg-[var(--surfaceAlt)]"
                >
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate" style={{ color: 'var(--ink)' }}>
                      {p.numero_processo ? `${p.numero_processo}: ` : ''}{p.objeto || 'Sem objeto definido'}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                      {MODALIDADE_LABEL[p.modalidade] ?? p.modalidade ?? 'Modalidade nao definida'}
                      {p.updated_at ? ` · ${new Date(p.updated_at).toLocaleDateString('pt-BR')}` : ''}
                    </p>
                  </div>
                  <span className="text-xs px-2 py-0.5 rounded-full font-semibold shrink-0" style={{ background: s.bg, color: s.color }}>
                    {s.label}
                  </span>
                </Link>
              )
            })}
          </div>
        )}
      </div>

      {/* Lista de usuarios */}
      <div className="glass rounded-[var(--r-lg)] overflow-hidden">
        <div
          className="flex items-center justify-between px-6 py-5"
          style={{ borderBottom: '1px solid var(--glass-edge)', background: 'rgba(0,0,0,0.025)' }}
        >
          <div>
            <h2 className="text-base font-semibold" style={{ color: 'var(--ink)', fontFamily: 'var(--font-heading)' }}>Usuarios</h2>
            <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>{usuariosList.length} cadastrados · {ativos} ativos</p>
          </div>
        </div>
        {usuariosList.length === 0 ? (
          <div className="px-6 py-10 text-center">
            <Users className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--muted)' }} />
            <p className="text-sm" style={{ color: 'var(--muted)' }}>Nenhum usuario cadastrado</p>
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--glass-edge)' }}>
            {usuariosList.map((u: any) => (
              <div key={u.id} className="flex items-center justify-between px-6 py-3">
                <div>
                  <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>{u.nome_completo}</p>
                  <p className="text-xs" style={{ color: 'var(--muted)' }}>{PAPEL_LABEL[u.papel] ?? u.papel}</p>
                </div>
                <div className="flex items-center gap-2">
                  {u.status_aprovacao !== 'ativo' && (
                    <AlertCircle className="w-3.5 h-3.5" style={{ color: 'var(--warn)' }} />
                  )}
                  <span
                    className="text-xs px-2 py-0.5 rounded-full font-semibold"
                    style={{
                      background: u.status_aprovacao === 'ativo' ? 'var(--successWash)' : 'var(--warnWash)',
                      color:      u.status_aprovacao === 'ativo' ? 'var(--success)' : 'var(--warn)',
                    }}
                  >
                    {u.status_aprovacao === 'ativo' ? 'Ativo' : 'Aguardando'}
                  </span>
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
