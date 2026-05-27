import { createClient } from '@/lib/supabase/server'
import { KPIBar } from '@/components/dashboard/kpi-bar'
import { FaseTimeline } from '@/components/dashboard/fase-timeline'
import type { FaseNode } from '@/components/dashboard/fase-timeline'
import { PendenciasCard } from '@/components/dashboard/pendencias-card'
import { ProcessoRowDashboard } from '@/components/dashboard/processo-row-dashboard'
import { FooterEditorial, SectionHeader, ListCard } from './shared'
import { AlertCircle } from 'lucide-react'

interface Props {
  userId: string
  orgId: string
  cargo: string | null
}

const FASE_LABELS: Record<string, string> = {
  requisitante: 'Requisitante',
  setor_compras: 'Compras',
  setor_licitacao: 'Licitações',
  procurador: 'Procuradoria',
  gestor_publico: 'Autorização',
  publicacao: 'Publicação',
}

const FASE_KEYS = [
  'requisitante',
  'setor_compras',
  'setor_licitacao',
  'procurador',
  'gestor_publico',
  'publicacao',
]

export async function DashboardCompras({ userId, orgId, cargo }: Props) {
  const supabase = await createClient()

  const [{ data: todosProcessos }, { data: filaCompleta }, { data: cotacoesFeitasData }] =
    await Promise.all([
      (supabase as any)
        .from('processos_licitatorios')
        .select('id, fase_atual, status')
        .eq('organizacao_id', orgId),
      (supabase as any)
        .from('processos_licitatorios')
        .select('id, objeto, numero_processo, modalidade, status, fase_atual, updated_at')
        .eq('organizacao_id', orgId)
        .eq('fase_atual', 'setor_compras')
        .order('updated_at', { ascending: true })
        .limit(20),
      (supabase as any)
        .from('cotacoes')
        .select('id')
        .eq('organizacao_id', orgId)
        .gte('created_at', new Date(Date.now() - 7 * 86400000).toISOString()),
    ])

  const todos = (todosProcessos as any[]) ?? []
  const fila = (filaCompleta as any[]) ?? []
  const cotacoesSemana = ((cotacoesFeitasData as any[]) ?? []).length

  const fases: FaseNode[] = FASE_KEYS.map((k) => ({
    key: k,
    label: FASE_LABELS[k],
    count: todos.filter((p: any) => p.fase_atual === k).length,
    devolvidos: todos.filter((p: any) => p.fase_atual === k && p.status === 'devolvido').length,
    parados: 0,
    href: `/processos?fase=${k}`,
    isCurrent: k === 'setor_compras',
  }))

  const naFila = todos.filter((p: any) => p.fase_atual === 'setor_compras').length

  return (
    <div className="space-y-8">
      <SectionHeader
        supTitle="Setor de Compras"
        title="Fila de cotações."
        contextLine={cargo ?? undefined}
      />

      <FaseTimeline fases={fases} />

      <KPIBar
        items={[
          { label: 'Na fila', value: naFila, sub: 'aguardando cotação' },
          { label: 'Cotações (semana)', value: cotacoesSemana, sub: 'últimos 7 dias' },
        ]}
      />

      {naFila > 0 && (
        <div
          className="flex items-start gap-3 p-4 rounded-[var(--r-lg)] border"
          style={{ background: 'var(--warnWash)', borderColor: 'var(--warn)' }}
        >
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" style={{ color: 'var(--warn)' }} />
          <p className="text-sm" style={{ color: 'var(--ink)' }}>
            A pesquisa de preços deve observar os parâmetros do Art. 23 da Lei 14.133/21,
            incluindo cotações de fornecedores, painel de preços e contratos anteriores.
          </p>
        </div>
      )}

      <PendenciasCard userId={userId} orgId={orgId} faseAtual="setor_compras" />

      <ListCard title="Fila de cotação" subtitle="Ordenada por mais antigo">
        {fila.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm" style={{ color: 'var(--muted)' }}>
            Nenhum processo aguardando cotação.
          </div>
        ) : (
          fila.map((p: any) => (
            <ProcessoRowDashboard key={p.id} {...p} href={`/processos/${p.id}/cotacao`} />
          ))
        )}
      </ListCard>

      <FooterEditorial />
    </div>
  )
}
