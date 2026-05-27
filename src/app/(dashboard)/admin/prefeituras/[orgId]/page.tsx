import { createServiceClient, createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { obterPapelUsuario } from '@/lib/actions/usuario'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { KPIBar } from '@/components/dashboard/kpi-bar'
import { FaseTimeline } from '@/components/dashboard/fase-timeline'
import type { FaseNode } from '@/components/dashboard/fase-timeline'
import { FooterEditorial, ListCard } from '../../../dashboard/shared'

export default async function AdminPrefeituraPage({
  params,
}: {
  params: { orgId: string }
}) {
  const authClient = await createClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) redirect('/login')

  const papel = await obterPapelUsuario()
  if (papel !== 'admin_plataforma') redirect('/dashboard')

  const supabase = await createServiceClient()
  const { orgId } = params

  const [{ data: org }, { data: processos }, { data: usuarios }, { data: acoesIa }] = await Promise.all([
    (supabase as any).from('organizacoes').select('id, nome, municipio, estado, cnpj').eq('id', orgId).maybeSingle(),
    (supabase as any)
      .from('processos_licitatorios')
      .select('id, objeto, numero_processo, modalidade, status, fase_atual, updated_at')
      .eq('organizacao_id', orgId)
      .order('updated_at', { ascending: false })
      .limit(20),
    (supabase as any).from('usuarios').select('id, nome_completo, papel, status').eq('organizacao_id', orgId),
    (supabase as any)
      .from('acoes_ia')
      .select('id, tokens_consumidos')
      .eq('organizacao_id', orgId)
      .gte('created_at', new Date(Date.now() - 30 * 86400000).toISOString()),
  ])

  if (!org) redirect('/dashboard')

  const orgData       = org as any
  const processosList = (processos as any[]) ?? []
  const usuariosList  = (usuarios as any[]) ?? []
  const acoesList     = (acoesIa as any[]) ?? []

  const FASE_LABELS: Record<string, string> = {
    requisitante: 'Requisitante', setor_compras: 'Compras', setor_licitacao: 'Licitações',
    procurador: 'Procuradoria', gestor_publico: 'Autorização', publicacao: 'Publicação',
  }
  const FASE_KEYS = ['requisitante','setor_compras','setor_licitacao','procurador','gestor_publico','publicacao']

  const fases: FaseNode[] = FASE_KEYS.map((k) => ({
    key: k, label: FASE_LABELS[k],
    count:      processosList.filter((p: any) => p.fase_atual === k).length,
    devolvidos: processosList.filter((p: any) => p.fase_atual === k && p.status === 'devolvido').length,
    parados: 0,
    href: `/processos?fase=${k}`,
  }))

  const ativos    = usuariosList.filter((u: any) => u.status === 'ativo').length
  const andamento = processosList.filter((p: any) => !['publicado','assinado'].includes(p.status)).length
  const tokens    = acoesList.reduce((acc: number, a: any) => acc + (a.tokens_consumidos ?? 0), 0)

  return (
    <div className="space-y-8">
      <nav className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--muted)' }}>
        <Link href="/dashboard" className="hover:underline">Plataforma</Link>
        <ChevronRight className="w-3.5 h-3.5" />
        <span style={{ color: 'var(--inkSoft)' }}>Prefeituras</span>
        <ChevronRight className="w-3.5 h-3.5" />
        <span style={{ color: 'var(--ink)', fontWeight: 600 }}>{orgData.nome}</span>
      </nav>

      <div>
        <h1 className="text-2xl font-semibold" style={{ fontFamily: 'var(--font-heading)', color: 'var(--ink)' }}>
          {orgData.nome}
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
          {orgData.municipio} · {orgData.estado} · CNPJ {orgData.cnpj}
        </p>
      </div>

      <FaseTimeline fases={fases} />

      <KPIBar items={[
        { label: 'Usuários ativos', value: ativos },
        { label: 'Em andamento',    value: andamento },
        { label: 'IA (30d)',        value: tokens.toLocaleString('pt-BR'), sub: 'tokens' },
      ]} />

      <ListCard title="Usuários">
        {usuariosList.map((u: any) => (
          <div key={u.id} className="flex items-center justify-between px-6 py-3 border-b last:border-b-0" style={{ borderColor: 'var(--hairline)' }}>
            <div>
              <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>{u.nome_completo}</p>
              <p className="text-xs" style={{ color: 'var(--muted)' }}>{u.papel}</p>
            </div>
            <span
              className="text-xs px-2 py-0.5 rounded-full font-semibold"
              style={{
                background: u.status === 'ativo' ? 'var(--successWash)' : 'var(--warnWash)',
                color: u.status === 'ativo' ? 'var(--success)' : 'var(--warn)',
              }}
            >
              {u.status}
            </span>
          </div>
        ))}
      </ListCard>

      <ListCard title="Processos recentes">
        {processosList.slice(0, 10).map((p: any) => (
          <Link
            key={p.id}
            href={`/processos/${p.id}/dfd`}
            className="flex items-center justify-between px-6 py-3 border-b last:border-b-0 transition-colors hover:bg-[var(--surfaceAlt)]"
            style={{ borderColor: 'var(--hairline)' }}
          >
            <p className="text-sm font-medium truncate" style={{ color: 'var(--ink)' }}>
              {p.numero_processo ? `${p.numero_processo} — ` : ''}{p.objeto}
            </p>
          </Link>
        ))}
      </ListCard>

      <FooterEditorial />
    </div>
  )
}
