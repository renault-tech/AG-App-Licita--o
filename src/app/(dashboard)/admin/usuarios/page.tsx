import { createClient } from '@/lib/supabase/server'
import { Users } from 'lucide-react'
import { KPIBar } from '@/components/dashboard/kpi-bar'
import { EditorialKicker, HeadlineSerif } from '@/components/licita/editorial'
import { FooterEditorial } from '../../dashboard/shared'

const PAPEL_LABEL: Record<string, string> = {
  requisitante:      'Requisitante',
  setor_compras:     'Setor de Compras',
  setor_licitacao:   'Setor de Licitacao',
  procurador:        'Procurador',
  gestor_publico:    'Gestor Publico',
  publicacao:        'Publicacao',
  admin_organizacao: 'Admin da Organizacao',
  admin_plataforma:  'Admin da Plataforma',
}

const PAPEL_COR: Record<string, { bg: string; color: string }> = {
  requisitante:      { bg: 'var(--surfaceAlt)',  color: 'var(--muted)' },
  setor_compras:     { bg: 'var(--warnWash)',     color: 'var(--warn)' },
  setor_licitacao:   { bg: 'var(--primaryWash)',  color: 'var(--primary)' },
  procurador:        { bg: 'var(--hairline)',      color: 'var(--inkSoft)' },
  gestor_publico:    { bg: 'var(--warnWash)',      color: 'var(--warn)' },
  publicacao:        { bg: 'var(--successWash)',   color: 'var(--success)' },
  admin_organizacao: { bg: 'var(--successWash)',   color: 'var(--success)' },
  admin_plataforma:  { bg: 'var(--dangerWash)',    color: 'var(--danger)' },
}

export default async function AdminUsuariosPage() {
  const supabase = await createClient()

  const { data: usuarios } = await (supabase as any)
    .from('usuarios')
    .select('id, nome_completo, email, papel, organizacao_id, created_at')
    .order('created_at', { ascending: false })

  const { data: orgs } = await (supabase as any)
    .from('organizacoes')
    .select('id, nome, municipio, estado')

  const orgMap: Record<string, { nome: string; municipio: string; estado: string }> = {}
  for (const o of (orgs ?? [])) orgMap[o.id] = o

  type Usuario = { id: string; nome_completo: string | null; email: string; papel: string; organizacao_id: string; created_at: string }
  const lista = (usuarios ?? []) as Usuario[]

  const totalPorPapel: Record<string, number> = {}
  for (const u of lista) totalPorPapel[u.papel] = (totalPorPapel[u.papel] ?? 0) + 1

  const orgsUnicas = new Set(lista.map(u => u.organizacao_id)).size

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
        <HeadlineSerif size="md" as="h1">Usuarios da plataforma.</HeadlineSerif>
        <p className="mt-2 text-[15px]" style={{ color: 'var(--inkSoft)', fontFamily: 'var(--font-heading)', fontStyle: 'italic' }}>
          {lista.length} usuario{lista.length !== 1 ? 's' : ''} em {orgsUnicas} organizacao{orgsUnicas !== 1 ? 'oes' : ''}.
        </p>
      </div>

      {/* KPIs */}
      <KPIBar items={[
        { label: 'Total usuarios',   value: lista.length, sub: 'cadastrados',    sparkline: 'up',   delta: 'total',    deltaColor: 'blue' },
        { label: 'Organizacoes',     value: orgsUnicas,   sub: 'com usuarios',   sparkline: 'up',   delta: 'total',    deltaColor: 'success' },
        { label: 'Admins org',       value: totalPorPapel['admin_organizacao'] ?? 0, sub: 'gestores', sparkline: 'flat', delta: 'papel', deltaColor: 'muted' },
        { label: 'Admins plataforma', value: totalPorPapel['admin_plataforma'] ?? 0, sub: 'superadmins', sparkline: 'flat', delta: 'papel', deltaColor: 'muted' },
      ]} />

      {/* Resumo por papel */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(totalPorPapel).map(([papel, count]) => {
          const cor = PAPEL_COR[papel] ?? { bg: 'var(--surfaceAlt)', color: 'var(--muted)' }
          return (
            <span
              key={papel}
              className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full"
              style={{ background: cor.bg, color: cor.color }}
            >
              {PAPEL_LABEL[papel] ?? papel}
              <span className="font-bold">{count}</span>
            </span>
          )
        })}
      </div>

      {/* Lista */}
      <div className="glass rounded-[var(--r-lg)] overflow-hidden">
        <div className="flex items-center gap-3 px-5 py-4" style={{ borderBottom: '1px solid var(--glass-edge)', background: 'rgba(0,0,0,0.025)' }}>
          <Users className="w-4 h-4" style={{ color: 'var(--muted)' }} />
          <h3 className="text-sm font-semibold" style={{ color: 'var(--ink)', fontFamily: 'var(--font-heading)' }}>
            Todos os usuarios
          </h3>
        </div>
        {lista.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm" style={{ color: 'var(--muted)' }}>
            Nenhum usuario cadastrado ainda.
          </div>
        ) : (
          <div className="divide-y" style={{ borderColor: 'var(--glass-edge)' }}>
            {lista.map(u => {
              const org = orgMap[u.organizacao_id]
              const cor = PAPEL_COR[u.papel] ?? { bg: 'var(--surfaceAlt)', color: 'var(--muted)' }
              return (
                <div key={u.id} className="flex items-center gap-4 px-5 py-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium" style={{ color: 'var(--ink)' }}>{u.nome_completo ?? 'Sem nome'}</p>
                    <p className="text-xs" style={{ color: 'var(--muted)' }}>{u.email}</p>
                  </div>
                  <div className="hidden sm:block min-w-0 text-right mr-2">
                    {org ? (
                      <>
                        <p className="text-xs font-medium truncate" style={{ color: 'var(--inkSoft)' }}>{org.nome}</p>
                        <p className="text-xs" style={{ color: 'var(--muted)' }}>{org.municipio} / {org.estado}</p>
                      </>
                    ) : (
                      <span className="text-xs" style={{ color: 'var(--muted)' }}>-</span>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span
                      className="text-[11px] font-semibold px-2 py-0.5 rounded-full"
                      style={{ background: cor.bg, color: cor.color }}
                    >
                      {PAPEL_LABEL[u.papel] ?? u.papel}
                    </span>
                    <span className="text-xs hidden md:block" style={{ color: 'var(--muted)' }}>
                      {new Date(u.created_at).toLocaleDateString('pt-BR')}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <FooterEditorial />
    </div>
  )
}
