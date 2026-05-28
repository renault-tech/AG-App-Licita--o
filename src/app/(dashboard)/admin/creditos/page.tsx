import { listarOrgsComCreditos } from '@/lib/actions/admin-master'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Coins, TrendingUp, Star, FlaskConical } from 'lucide-react'
import ConcederForm from './conceder-form'
import { KPIBar } from '@/components/dashboard/kpi-bar'
import { EditorialKicker, HeadlineSerif } from '@/components/licita/editorial'
import { FooterEditorial } from '../../dashboard/shared'

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
  const orgsComSaldo  = orgs.filter(o => o.saldo_total > 0).length
  const orgsParaForm  = orgs.filter(o => !o.is_demo)

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
        <HeadlineSerif size="md" as="h1">Gestao de creditos.</HeadlineSerif>
        <p className="mt-2 text-[15px]" style={{ color: 'var(--inkSoft)', fontFamily: 'var(--font-heading)', fontStyle: 'italic' }}>
          Saldo e concessao por organizacao.
        </p>
      </div>

      {/* KPIs */}
      <KPIBar items={[
        { label: 'Em circulacao', value: totalCreditos.toLocaleString('pt-BR'), sub: 'creditos totais',   sparkline: 'up',   delta: 'plataforma', deltaColor: 'blue' },
        { label: 'Orgs com saldo', value: orgsComSaldo, sub: 'com creditos',    sparkline: 'flat',  delta: `${orgs.length} total`, deltaColor: 'muted' },
        { label: 'Total orgs',    value: orgs.length,   sub: 'cadastradas',     sparkline: 'up',    delta: 'total',      deltaColor: 'success' },
      ]} />

      <ConcederForm orgs={orgsParaForm} />

      {/* Saldo por organizacao */}
      <section className="space-y-3">
        <p className="text-[9.5px] font-bold uppercase" style={{ color: 'var(--accent)', letterSpacing: '0.16em', fontFamily: 'var(--font-mono)' }}>
          Saldo por organizacao
        </p>
        <div className="glass rounded-[var(--r-lg)] overflow-hidden">
          <div className="divide-y" style={{ borderColor: 'var(--glass-edge)' }}>
            {orgs.map(org => (
              <div key={org.id} className="flex items-center justify-between px-5 py-3 gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm truncate" style={{ color: 'var(--ink)' }}>
                      {org.nome}
                    </span>
                    {org.is_cataguases && (
                      <Star className="w-3 h-3 shrink-0" style={{ color: 'var(--warn)' }} />
                    )}
                    {org.is_demo && (
                      <FlaskConical className="w-3 h-3 shrink-0" style={{ color: 'var(--muted)' }} />
                    )}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>
                    {org.municipio}/{org.estado}
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div
                    className="text-sm font-semibold tabular-nums"
                    style={{ color: org.saldo_total > 0 ? 'var(--success)' : 'var(--muted)' }}
                  >
                    {org.saldo_total.toLocaleString('pt-BR')}
                  </div>
                  <div className="text-[10px]" style={{ color: 'var(--muted)' }}>creditos</div>
                </div>
              </div>
            ))}
            {orgs.length === 0 && (
              <div className="px-5 py-8 text-center text-sm" style={{ color: 'var(--muted)' }}>
                Nenhuma organizacao cadastrada.
              </div>
            )}
          </div>
        </div>
      </section>

      <FooterEditorial />
    </div>
  )
}
