import Link from 'next/link'
import { CardConfigShell } from './card-config-shell'
import { buscarPreferenciaDashboard } from '@/lib/actions/dashboard'
import { createClient } from '@/lib/supabase/server'

interface PendenciaItem {
  id: string
  objeto: string
  numero_processo: string | null
  diasParado: number
  href: string
}

interface PendenciasCardProps {
  userId: string
  orgId: string
  faseAtual: string
}

async function buscarPendencias(
  orgId: string,
  faseAtual: string,
  dias: number
): Promise<PendenciaItem[]> {
  const supabase = await createClient()
  const corte = new Date(Date.now() - dias * 86400000).toISOString()

  const { data } = await (supabase as any)
    .from('processos_licitatorios')
    .select('id, objeto, numero_processo, updated_at')
    .eq('organizacao_id', orgId)
    .eq('fase_atual', faseAtual)
    .lt('updated_at', corte)
    .order('updated_at', { ascending: true })
    .limit(10)

  return ((data as any[]) ?? []).map((p: any) => ({
    id: p.id,
    objeto: p.objeto,
    numero_processo: p.numero_processo,
    diasParado: Math.floor((Date.now() - new Date(p.updated_at).getTime()) / 86400000),
    href: `/processos/${p.id}/dfd`,
  }))
}

export async function PendenciasCard({ userId, orgId, faseAtual }: PendenciasCardProps) {
  const pref = await buscarPreferenciaDashboard('pendencias_dias', { dias: 5 })
  const dias = typeof (pref as any).dias === 'number' ? (pref as any).dias : 5
  const pendencias = await buscarPendencias(orgId, faseAtual, dias)

  return (
    <CardConfigShell
      configKey="pendencias_dias"
      configValue={{ dias }}
      configContent={(val, setVal) => (
        <div>
          <label className="text-xs" style={{ color: 'var(--ink)' }}>
            Avisar após quantos dias parado
          </label>
          <input
            type="number"
            min={1}
            max={90}
            defaultValue={(val as any).dias ?? 5}
            onChange={(e) => setVal({ dias: Math.max(1, Math.min(90, Number(e.target.value))) })}
            className="mt-2 w-full border rounded px-3 py-1.5 text-sm"
            style={{ borderColor: 'var(--hairline)', background: 'var(--surface)', color: 'var(--ink)' }}
          />
        </div>
      )}
    >
      <div
        className="rounded-[var(--r-lg)] border overflow-hidden"
        style={{ background: 'var(--surface)', borderColor: 'var(--hairline)' }}
      >
        <div
          className="px-6 py-4 border-b"
          style={{ background: 'var(--surfaceAlt)', borderColor: 'var(--hairline)' }}
        >
          <h3 className="text-base font-semibold" style={{ color: 'var(--ink)', fontFamily: 'var(--font-heading)' }}>
            Pendências
          </h3>
          <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
            Parados há mais de {dias} dia{dias !== 1 ? 's' : ''}
          </p>
        </div>
        {pendencias.length === 0 ? (
          <div className="px-6 py-8 text-center">
            <p className="text-sm" style={{ color: 'var(--muted)' }}>Nenhuma pendência no momento.</p>
          </div>
        ) : (
          <div>
            {pendencias.map((p) => (
              <Link
                key={p.id}
                href={p.href}
                className="flex items-center justify-between px-6 py-4 border-b transition-colors hover:bg-[var(--surfaceAlt)] last:border-b-0"
                style={{ borderColor: 'var(--hairline)' }}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate" style={{ color: 'var(--ink)' }}>
                    {p.numero_processo ? `${p.numero_processo}: ` : ''}{p.objeto}
                  </p>
                </div>
                <span
                  className="ml-3 shrink-0 text-xs font-bold px-2 py-0.5 rounded-full"
                  style={{
                    background: p.diasParado > 10 ? 'var(--dangerWash)' : 'var(--warnWash)',
                    color: p.diasParado > 10 ? 'var(--danger)' : 'var(--warn)',
                  }}
                >
                  {p.diasParado}d
                </span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </CardConfigShell>
  )
}
