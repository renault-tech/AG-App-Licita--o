import { createClient } from '@/lib/supabase/server'
import { Users, HelpCircle } from 'lucide-react'

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

const PAPEL_LABEL: Record<string, string> = {
  requisitante:          'Requisitante',
  setor_licitacao:       'Setor de Licitacao',
  procurador:            'Procurador',
  autoridade_competente: 'Autoridade Competente',
  admin_organizacao:     'Admin da Organizacao',
  admin_plataforma:      'Admin da Plataforma',
}

const PAPEL_COR: Record<string, string> = {
  requisitante:          'text-gray-600 bg-gray-100',
  setor_licitacao:       'text-blue-700 bg-blue-50',
  procurador:            'text-purple-700 bg-purple-50',
  autoridade_competente: 'text-amber-700 bg-amber-50',
  admin_organizacao:     'text-teal-700 bg-teal-50',
  admin_plataforma:      'text-red-700 bg-red-50',
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

  return (
    <div className="space-y-4">
      <div>
        <div className="flex items-center gap-2">
          <h2 className="text-base font-semibold text-gray-900">Usuarios</h2>
          <Tooltip texto="Lista de todos os usuarios cadastrados em todas as organizacoes da plataforma." />
        </div>
        <p className="text-sm text-gray-500 mt-0.5">{lista.length} usuario(s) cadastrado(s).</p>
      </div>

      {/* Resumo por papel */}
      <div className="flex flex-wrap gap-2">
        {Object.entries(totalPorPapel).map(([papel, count]) => (
          <span
            key={papel}
            className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${PAPEL_COR[papel] ?? 'text-gray-600 bg-gray-100'}`}
          >
            {PAPEL_LABEL[papel] ?? papel}
            <span className="font-bold">{count}</span>
          </span>
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {lista.length === 0 ? (
          <div className="px-5 py-10 text-center">
            <Users className="w-8 h-8 text-gray-300 mx-auto mb-2" />
            <p className="text-sm text-gray-400">Nenhum usuario cadastrado ainda.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-500">
                  <span className="flex items-center gap-1.5">
                    Usuario
                    <Tooltip texto="Nome e e-mail do usuario cadastrado." />
                  </span>
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">
                  <span className="flex items-center gap-1.5">
                    Papel
                    <Tooltip texto="Papel do usuario dentro da organizacao, que define quais acoes ele pode realizar." />
                  </span>
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Organizacao</th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500">Cadastro</th>
              </tr>
            </thead>
            <tbody>
              {lista.map(u => {
                const org = orgMap[u.organizacao_id]
                return (
                  <tr key={u.id} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/50">
                    <td className="px-5 py-3">
                      <p className="font-medium text-gray-900">{u.nome_completo ?? 'Sem nome'}</p>
                      <p className="text-xs text-gray-400">{u.email}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center text-xs font-medium px-2 py-0.5 rounded-full ${PAPEL_COR[u.papel] ?? 'text-gray-600 bg-gray-100'}`}>
                        {PAPEL_LABEL[u.papel] ?? u.papel}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-gray-600 text-xs">
                      {org ? (
                        <>
                          <span className="font-medium text-gray-800">{org.nome}</span>
                          <br />
                          <span className="text-gray-400">{org.municipio} / {org.estado}</span>
                        </>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-400 text-xs">
                      {new Date(u.created_at).toLocaleDateString('pt-BR')}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}