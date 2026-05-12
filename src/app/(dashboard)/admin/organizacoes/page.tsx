import { createClient } from '@/lib/supabase/server'
import { Building2, Users, HelpCircle, CheckCircle2, XCircle } from 'lucide-react'

function Tooltip({ texto }: { texto: string }) {
  return (
    <div className="group relative inline-flex">
      <HelpCircle className="w-3.5 h-3.5 text-gray-300 hover:text-gray-500 cursor-help" />
      <span className="pointer-events-none absolute left-5 top-0 z-50 hidden group-hover:block w-56 p-2 bg-gray-900 text-white text-xs rounded-lg shadow-xl leading-relaxed">
        {texto}
      </span>
    </div>
  )
}

export default async function AdminOrganizacoesPage() {
  const supabase = await createClient()

  const { data: orgs } = await (supabase as any)
    .from('organizacoes')
    .select('id, nome, municipio, estado, cnpj, ativo, created_at')
    .order('created_at', { ascending: false })

  // Contar usuarios por organizacao
  const { data: contagens } = await (supabase as any)
    .from('usuarios')
    .select('organizacao_id')

  const usuariosPorOrg: Record<string, number> = {}
  for (const u of (contagens ?? [])) {
    usuariosPorOrg[u.organizacao_id] = (usuariosPorOrg[u.organizacao_id] ?? 0) + 1
  }

  // Contar processos por organizacao
  const { data: processos } = await (supabase as any)
    .from('processos_licitatorios')
    .select('organizacao_id')

  const processosPorOrg: Record<string, number> = {}
  for (const p of (processos ?? [])) {
    processosPorOrg[p.organizacao_id] = (processosPorOrg[p.organizacao_id] ?? 0) + 1
  }

  type Org = { id: string; nome: string; municipio: string; estado: string; cnpj: string; ativo: boolean; created_at: string }
  const lista = (orgs ?? []) as Org[]

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold text-gray-900">Organizacoes</h2>
          <Tooltip texto="Lista de todas as prefeituras e orgaos publicos cadastrados na plataforma, com contagem de usuarios e processos ativos." />
        </div>
        <p className="text-sm text-gray-500 mt-0.5">
          {lista.length} organizacao(s) cadastrada(s).
        </p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {lista.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <Building2 className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-400">Nenhuma organizacao cadastrada ainda.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500">
                  <span className="flex items-center gap-1.5">
                    Organizacao
                    <Tooltip texto="Nome oficial do orgao ou prefeitura cadastrado." />
                  </span>
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Municipio / UF</th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">
                  <span className="flex items-center justify-end gap-1.5">
                    Usuarios
                    <Tooltip texto="Total de usuarios ativos nesta organizacao." />
                  </span>
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500">
                  <span className="flex items-center justify-end gap-1.5">
                    Processos
                    <Tooltip texto="Total de processos licitatorios criados." />
                  </span>
                </th>
                <th className="text-center px-4 py-3 text-xs font-semibold text-gray-500">
                  <span className="flex items-center justify-center gap-1.5">
                    Status
                    <Tooltip texto="Indica se a organizacao esta ativa na plataforma." />
                  </span>
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Cadastro</th>
              </tr>
            </thead>
            <tbody>
              {lista.map(org => (
                <tr key={org.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                  <td className="px-5 py-3">
                    <p className="font-medium text-gray-900 truncate max-w-[200px]">{org.nome}</p>
                    <p className="text-xs text-gray-400">{org.cnpj}</p>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {org.municipio} / {org.estado}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="inline-flex items-center gap-1 text-gray-700">
                      <Users className="w-3 h-3 text-gray-400" />
                      {usuariosPorOrg[org.id] ?? 0}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right text-gray-700">
                    {processosPorOrg[org.id] ?? 0}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {org.ativo ? (
                      <CheckCircle2 className="w-4 h-4 text-green-500 mx-auto" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-400 mx-auto" />
                    )}
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">
                    {new Date(org.created_at).toLocaleDateString('pt-BR')}
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