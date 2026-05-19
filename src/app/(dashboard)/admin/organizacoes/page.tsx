import { createClient } from '@/lib/supabase/server'
import { marcarOrgCataguases } from '@/lib/actions/admin-master'
import { Building2, Users, CheckCircle2, XCircle, Star, FlaskConical } from 'lucide-react'
import { revalidatePath } from 'next/cache'

async function handleMarcarCataguases(formData: FormData) {
  'use server'
  const id = formData.get('org_id') as string
  if (id) await marcarOrgCataguases(id)
  revalidatePath('/admin/organizacoes')
}

export default async function AdminOrganizacoesPage() {
  const supabase = await createClient()

  const { data: orgs } = await (supabase as any)
    .from('organizacoes')
    .select('id, nome, municipio, estado, cnpj, ativo, is_cataguases, is_demo, created_at')
    .order('created_at', { ascending: false })

  const { data: contagens } = await (supabase as any)
    .from('usuarios')
    .select('organizacao_id')

  const usuariosPorOrg: Record<string, number> = {}
  for (const u of (contagens ?? [])) {
    usuariosPorOrg[u.organizacao_id] = (usuariosPorOrg[u.organizacao_id] ?? 0) + 1
  }

  const { data: processos } = await (supabase as any)
    .from('processos_licitatorios')
    .select('organizacao_id')

  const processosPorOrg: Record<string, number> = {}
  for (const p of (processos ?? [])) {
    processosPorOrg[p.organizacao_id] = (processosPorOrg[p.organizacao_id] ?? 0) + 1
  }

  type Org = {
    id: string
    nome: string
    municipio: string
    estado: string
    cnpj: string
    ativo: boolean
    is_cataguases: boolean
    is_demo: boolean
    created_at: string
  }
  const lista = (orgs ?? []) as Org[]

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-base font-semibold" style={{ color: 'var(--ink)' }}>Organizacoes</h2>
        <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>
          {lista.length} organizacao(s) cadastrada(s).
        </p>
      </div>

      <div
        className="border rounded-[var(--r-lg)] overflow-hidden"
        style={{ background: 'var(--surface)', borderColor: 'var(--hairline)' }}
      >
        {lista.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <Building2 className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--hairline)' }} />
            <p className="text-sm" style={{ color: 'var(--muted)' }}>Nenhuma organizacao cadastrada ainda.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b" style={{ borderColor: 'var(--hairline)', background: 'var(--canvas)' }}>
                <th className="text-left px-5 py-3 text-xs font-semibold" style={{ color: 'var(--muted)' }}>Organizacao</th>
                <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: 'var(--muted)' }}>Municipio / UF</th>
                <th className="text-right px-4 py-3 text-xs font-semibold" style={{ color: 'var(--muted)' }}>Usuarios</th>
                <th className="text-right px-4 py-3 text-xs font-semibold" style={{ color: 'var(--muted)' }}>Processos</th>
                <th className="text-center px-4 py-3 text-xs font-semibold" style={{ color: 'var(--muted)' }}>Status</th>
                <th className="text-center px-4 py-3 text-xs font-semibold" style={{ color: 'var(--muted)' }}>Tipo</th>
                <th className="text-left px-4 py-3 text-xs font-semibold" style={{ color: 'var(--muted)' }}>Cadastro</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {lista.map(org => (
                <tr
                  key={org.id}
                  className="border-b last:border-0 transition-colors"
                  style={{ borderColor: 'var(--hairline)' }}
                >
                  <td className="px-5 py-3">
                    <p className="font-medium truncate max-w-[180px]" style={{ color: 'var(--ink)' }}>{org.nome}</p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--muted)' }}>{org.cnpj}</p>
                  </td>
                  <td className="px-4 py-3" style={{ color: 'var(--ink)' }}>
                    {org.municipio} / {org.estado}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="inline-flex items-center gap-1" style={{ color: 'var(--ink)' }}>
                      <Users className="w-3 h-3" style={{ color: 'var(--muted)' }} />
                      {usuariosPorOrg[org.id] ?? 0}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right" style={{ color: 'var(--ink)' }}>
                    {processosPorOrg[org.id] ?? 0}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {org.ativo ? (
                      <CheckCircle2 className="w-4 h-4 mx-auto" style={{ color: 'var(--success)' }} />
                    ) : (
                      <XCircle className="w-4 h-4 mx-auto" style={{ color: 'var(--danger)' }} />
                    )}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1.5">
                      {org.is_cataguases && (
                        <span
                          className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded"
                          style={{ background: '#FEF9C3', color: '#854D0E', border: '1px solid #FDE047' }}
                        >
                          <Star className="w-2.5 h-2.5" />
                          Cataguases
                        </span>
                      )}
                      {org.is_demo && (
                        <span
                          className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded"
                          style={{ background: '#FFF7ED', color: '#C2410C', border: '1px solid #FED7AA' }}
                        >
                          <FlaskConical className="w-2.5 h-2.5" />
                          Demo
                        </span>
                      )}
                      {!org.is_cataguases && !org.is_demo && (
                        <span className="text-xs" style={{ color: 'var(--mutedSoft)' }}>Regular</span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs" style={{ color: 'var(--muted)' }}>
                    {new Date(org.created_at).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-4 py-3">
                    {!org.is_cataguases && !org.is_demo && (
                      <form action={handleMarcarCataguases}>
                        <input type="hidden" name="org_id" value={org.id} />
                        <button
                          type="submit"
                          className="text-[11px] font-medium px-2.5 py-1 rounded-md transition-colors hover:opacity-80"
                          style={{ background: '#FEF9C3', color: '#854D0E', border: '1px solid #FDE047' }}
                        >
                          Marcar Cataguases
                        </button>
                      </form>
                    )}
                    {org.is_cataguases && (
                      <form action={handleMarcarCataguases}>
                        <input type="hidden" name="org_id" value="" />
                        <button
                          type="button"
                          disabled
                          className="text-[11px] px-2.5 py-1 rounded-md opacity-40 cursor-not-allowed"
                          style={{ border: '1px solid var(--hairline)', color: 'var(--muted)' }}
                        >
                          Definida
                        </button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
