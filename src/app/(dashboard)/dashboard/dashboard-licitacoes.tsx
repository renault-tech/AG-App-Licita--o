import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { KPIBar } from '@/components/dashboard/kpi-bar'
import { FaseTimeline } from '@/components/dashboard/fase-timeline'
import type { FaseNode } from '@/components/dashboard/fase-timeline'
import { PendenciasCard } from '@/components/dashboard/pendencias-card'
import { ProcessoRowDashboard } from '@/components/dashboard/processo-row-dashboard'
import { FooterEditorial, SectionHeader, ListCard } from './shared'

interface Props { userId: string; orgId: string; cargo: string | null }

const FASE_LABELS: Record<string, string> = {
  requisitante: 'Requisitante',
  setor_compras: 'Compras',
  setor_licitacao: 'Licitações',
  procurador: 'Procuradoria',
  gestor_publico: 'Autorização',
  publicacao: 'Publicação',
}
const FASE_KEYS = ['requisitante', 'setor_compras', 'setor_licitacao', 'procurador', 'gestor_publico', 'publicacao']

export async function DashboardLicitacoes({ userId, orgId, cargo }: Props) {
  const supabase = await createClient()

  const [
    { data: todosProcessos },
    { data: naFila },
    { data: emProcuradoria },
    { data: editais },
  ] = await Promise.all([
    (supabase as any).from('processos_licitatorios').select('id, fase_atual, status').eq('organizacao_id', orgId),
    (supabase as any)
      .from('processos_licitatorios')
      .select('id, objeto, numero_processo, modalidade, status, fase_atual, updated_at')
      .eq('organizacao_id', orgId)
      .eq('fase_atual', 'setor_licitacao')
      .order('updated_at', { ascending: true })
      .limit(20),
    (supabase as any)
      .from('processos_licitatorios')
      .select('id, objeto, numero_processo, modalidade, status, fase_atual, updated_at')
      .eq('organizacao_id', orgId)
      .eq('fase_atual', 'procurador')
      .limit(5),
    (supabase as any)
      .from('edital')
      .select('id, status')
      .eq('organizacao_id', orgId),
  ])

  const todos = (todosProcessos as any[]) ?? []
  const filaList = (naFila as any[]) ?? []
  const procList = (emProcuradoria as any[]) ?? []
  const editaisList = (editais as any[]) ?? []

  const fases: FaseNode[] = FASE_KEYS.map((k) => ({
    key: k,
    label: FASE_LABELS[k],
    count: todos.filter((p: any) => p.fase_atual === k).length,
    devolvidos: todos.filter((p: any) => p.fase_atual === k && p.status === 'devolvido').length,
    parados: 0,
    href: `/processos?fase=${k}`,
    isCurrent: k === 'setor_licitacao',
  }))

  const editaisAguardando = editaisList.filter((e: any) => e.status === 'pendente_assinatura').length
  const editaisEmElaboracao = editaisList.filter((e: any) => e.status === 'rascunho').length
  const editaisPublicados = editaisList.filter((e: any) => e.status === 'publicado').length

  const devolvidosCount = todos.filter((p: any) => p.status === 'devolvido').length
  const publicadosCount = todos.filter((p: any) => p.status === 'publicado').length

  return (
    <div className="space-y-8">
      <SectionHeader
        supTitle="Setor de Licitações"
        title="Processos em tramitação."
        contextLine={cargo ?? undefined}
      />

      <FaseTimeline fases={fases} />

      <KPIBar
        items={[
          { label: 'Na minha fila', value: filaList.length, sub: 'setor licitação' },
          { label: 'Em procuradoria', value: procList.length },
          { label: 'Devolvidos', value: devolvidosCount, accent: devolvidosCount > 0 },
          { label: 'Publicados', value: publicadosCount, sub: 'concluídos' },
        ]}
      />

      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Aguardando assinatura', value: editaisAguardando, href: '/processos?fase=setor_licitacao' },
          { label: 'Em elaboração', value: editaisEmElaboracao, href: '/processos?status=rascunho' },
          { label: 'Publicados', value: editaisPublicados, href: '/processos?status=publicado' },
        ].map((item) => (
          <Link
            key={item.label}
            href={item.href}
            className="p-4 rounded-[var(--r-lg)] border text-center transition-colors hover:bg-[var(--surfaceAlt)]"
            style={{ background: 'var(--surface)', borderColor: 'var(--hairline)' }}
          >
            <div
              className="text-2xl font-semibold"
              style={{ fontFamily: 'var(--font-heading)', color: 'var(--ink)' }}
            >
              {item.value}
            </div>
            <div className="text-xs mt-1" style={{ color: 'var(--muted)' }}>
              {item.label}
            </div>
          </Link>
        ))}
      </div>

      <PendenciasCard userId={userId} orgId={orgId} faseAtual="setor_licitacao" />

      <ListCard title="Processos na fila" subtitle="Ordenado por mais antigo">
        {filaList.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm" style={{ color: 'var(--muted)' }}>
            Nenhum processo na fila.
          </div>
        ) : (
          filaList.map((p: any) => <ProcessoRowDashboard key={p.id} {...p} />)
        )}
      </ListCard>

      {procList.length > 0 && (
        <ListCard title="Em procuradoria" subtitle="Aguardando parecer">
          {procList.map((p: any) => <ProcessoRowDashboard key={p.id} {...p} />)}
        </ListCard>
      )}

      <FooterEditorial />
    </div>
  )
}
