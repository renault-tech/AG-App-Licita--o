import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Bell, ShoppingCart } from 'lucide-react'
import { KPIBar } from '@/components/dashboard/kpi-bar'
import { FaseTimeline } from '@/components/dashboard/fase-timeline'
import { PendenciasCard } from '@/components/dashboard/pendencias-card'
import { ProcessoRowDashboard } from '@/components/dashboard/processo-row-dashboard'
import { FooterEditorial, SectionHeader, ListCard } from './shared'

interface Props {
  userId: string
  orgId: string
  cargo: string | null
}

const FASE_LABELS: Record<string, string> = {
  requisitante: 'Requisitante', setor_compras: 'Compras', setor_licitacao: 'Licitações',
  procurador: 'Procuradoria', gestor_publico: 'Autorização', publicacao: 'Publicação',
}
const FASE_KEYS = ['requisitante','setor_compras','setor_licitacao','procurador','gestor_publico','publicacao']

export async function DashboardRequisitante({ userId, orgId, cargo }: Props) {
  const supabase = await createClient()

  const [{ data: processos }, { data: notifData }] = await Promise.all([
    (supabase as any)
      .from('processos_licitatorios')
      .select('id, objeto, numero_processo, modalidade, status, fase_atual, updated_at, created_at')
      .eq('criado_por', userId)
      .order('created_at', { ascending: false })
      .limit(50),
    (supabase as any)
      .from('notificacoes')
      .select('id')
      .eq('usuario_id', userId)
      .eq('lida', false),
  ])

  const lista = (processos as any[]) ?? []
  const notifCount = ((notifData as any[]) ?? []).length

  const contagens = {
    total:      lista.length,
    andamento:  lista.filter((p: any) => !['publicado','assinado'].includes(p.status)).length,
    concluidos: lista.filter((p: any) => ['publicado','assinado'].includes(p.status)).length,
  }

  const fases = FASE_KEYS.map((k) => ({
    key: k,
    label: FASE_LABELS[k],
    count: lista.filter((p: any) => p.fase_atual === k).length,
    devolvidos: lista.filter((p: any) => p.fase_atual === k && p.status === 'devolvido').length,
    parados: 0,
    href: `/processos?criado_por=me&fase=${k}`,
    isCurrent: k === 'requisitante',
  }))

  const recentes = lista.slice(0, 5)

  return (
    <div className="space-y-8">
      <SectionHeader
        supTitle="Painel do Requisitante"
        title={cargo ? `Bem-vindo, ${cargo}.` : 'Seus processos.'}
        contextLine="Acompanhe aqui o andamento de todas as suas demandas."
      />

      <FaseTimeline fases={fases} />

      <KPIBar items={[
        { label: 'Total criados', value: contagens.total, sub: 'processos' },
        { label: 'Em andamento',  value: contagens.andamento, sub: 'na fila' },
        { label: 'Concluídos',    value: contagens.concluidos, sub: 'publicados / assinados' },
      ]} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Link
          href="/notificacoes"
          className="flex items-center gap-4 p-5 rounded-[var(--r-lg)] border transition-colors hover:bg-[var(--surfaceAlt)]"
          style={{ background: 'var(--surface)', borderColor: 'var(--hairline)' }}
        >
          <div className="w-10 h-10 rounded-[var(--r-md)] flex items-center justify-center" style={{ background: 'var(--primaryWash)' }}>
            <Bell className="w-5 h-5" style={{ color: 'var(--primary)' }} />
          </div>
          <div>
            <p className="font-semibold text-[15px]" style={{ color: 'var(--ink)', fontFamily: 'var(--font-heading)' }}>
              Notificações
            </p>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>
              {notifCount > 0 ? `${notifCount} não lida${notifCount !== 1 ? 's' : ''}` : 'Nenhuma pendente'}
            </p>
          </div>
        </Link>

        <Link
          href="/compra-conjunta"
          className="flex items-center gap-4 p-5 rounded-[var(--r-lg)] border transition-colors hover:bg-[var(--surfaceAlt)]"
          style={{ background: 'var(--surface)', borderColor: 'var(--hairline)' }}
        >
          <div className="w-10 h-10 rounded-[var(--r-md)] flex items-center justify-center" style={{ background: 'var(--primaryWash)' }}>
            <ShoppingCart className="w-5 h-5" style={{ color: 'var(--primary)' }} />
          </div>
          <div>
            <p className="font-semibold text-[15px]" style={{ color: 'var(--ink)', fontFamily: 'var(--font-heading)' }}>
              Compra Conjunta
            </p>
            <p className="text-sm" style={{ color: 'var(--muted)' }}>Demandas recebidas</p>
          </div>
        </Link>
      </div>

      <PendenciasCard userId={userId} orgId={orgId} faseAtual="requisitante" />

      <ListCard title="Processos recentes" subtitle="Seus últimos 5 processos">
        {recentes.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm" style={{ color: 'var(--muted)' }}>
            Nenhum processo criado ainda.
          </div>
        ) : recentes.map((p: any) => (
          <ProcessoRowDashboard key={p.id} {...p} />
        ))}
      </ListCard>

      <FooterEditorial />
    </div>
  )
}
