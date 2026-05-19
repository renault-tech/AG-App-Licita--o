import { listarOrgsComCreditos } from '@/lib/actions/admin-master'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Coins, TrendingUp, Star, FlaskConical } from 'lucide-react'
import ConcederForm from './conceder-form'

export default async function AdminCreditosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: usuario } = await (supabase as any)
    .from('usuarios')
    .select('papel')
    .eq('id', user.id)
    .maybeSingle()

  if (!usuario || (usuario as any).papel !== 'admin_plataforma') redirect('/dashboard')

  const orgs = await listarOrgsComCreditos()
  if (!orgs) redirect('/admin/painel')

  const totalCreditos = orgs.reduce((s, o) => s + o.saldo_total, 0)
  const orgsComSaldo = orgs.filter(o => o.saldo_total > 0).length
  const orgsParaForm = orgs.filter(o => !o.is_demo)

  return (
    <div className="space-y-6">
      <div>
        <p className="text-[11px] font-semibold uppercase tracking-widest mb-1" style={{ color: '#B7935E' }}>
          Creditos IA
        </p>
        <h2
          className="text-xl font-bold"
          style={{ color: 'var(--ink)', fontFamily: 'var(--font-heading)' }}
        >
          Gestao de Creditos
        </h2>
        <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>
          Visao geral do saldo de creditos e concessao manual por organizacao.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {[
          { label: 'Total em circulacao', valor: totalCreditos.toLocaleString('pt-BR'), icon: Coins },
          { label: 'Orgs com saldo', valor: orgsComSaldo, icon: TrendingUp },
          { label: 'Total de orgs', valor: orgs.length, icon: TrendingUp },
        ].map(k => (
          <div
            key={k.label}
            className="border rounded-[var(--r-lg)] p-4 flex flex-col gap-3"
            style={{ background: 'var(--surface)', borderColor: 'var(--hairline)' }}
          >
            <k.icon className="w-4 h-4" style={{ color: 'var(--muted)' }} />
            <div>
              <div
                className="text-2xl font-bold"
                style={{ color: 'var(--ink)', fontFamily: 'var(--font-heading)' }}
              >
                {k.valor}
              </div>
              <div className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{k.label}</div>
            </div>
          </div>
        ))}
      </div>

      <ConcederForm orgs={orgsParaForm} />

      <section className="space-y-3">
        <h3 className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
          Saldo por organizacao
        </h3>
        <div
          className="border rounded-[var(--r-lg)] divide-y overflow-hidden"
          style={{ background: 'var(--surface)', borderColor: 'var(--hairline)' }}
        >
          {orgs.map(org => (
            <div
              key={org.id}
              className="flex items-center justify-between px-5 py-3 gap-4"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm truncate" style={{ color: 'var(--ink)' }}>
                    {org.nome}
                  </span>
                  {org.is_cataguases && (
                    <Star className="w-3 h-3 shrink-0" style={{ color: '#B45309' }} />
                  )}
                  {org.is_demo && (
                    <FlaskConical className="w-3 h-3 shrink-0" style={{ color: '#C2410C' }} />
                  )}
                </div>
                <div className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                  {org.municipio}/{org.estado}
                </div>
              </div>
              <div className="text-right shrink-0">
                <div
                  className="text-sm font-semibold"
                  style={{ color: org.saldo_total > 0 ? 'var(--success)' : 'var(--muted)' }}
                >
                  {org.saldo_total.toLocaleString('pt-BR')}
                </div>
                <div className="text-[10px]" style={{ color: 'var(--mutedSoft)' }}>creditos</div>
              </div>
            </div>
          ))}
          {orgs.length === 0 && (
            <div className="px-5 py-8 text-center text-sm" style={{ color: 'var(--muted)' }}>
              Nenhuma organizacao cadastrada.
            </div>
          )}
        </div>
      </section>
    </div>
  )
}
