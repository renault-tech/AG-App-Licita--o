import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import TabelaUsuarios from './tabela-usuarios'
import FormConvite from './form-convite'

const PAPEIS_LABELS: Record<string, string> = {
  requisitante: 'Requisitante',
  setor_licitacao: 'Setor de Licitacao',
  procurador: 'Procurador',
  autoridade_competente: 'Autoridade Competente',
  admin_organizacao: 'Administrador',
  admin_plataforma: 'Admin Plataforma',
}

export default async function GestaoUsuariosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: usuarioAtual } = await supabase
    .from('usuarios')
    .select('organizacao_id, papel')
    .eq('id', user.id)
    .single()

  if (!usuarioAtual) redirect('/onboarding')
  if (!['admin_organizacao', 'admin_plataforma'].includes(usuarioAtual.papel)) redirect('/dashboard')

  const { data: usuarios } = await supabase
    .from('usuarios')
    .select('id, nome_completo, cargo, papel, ativo, created_at')
    .eq('organizacao_id', usuarioAtual.organizacao_id)
    .order('created_at', { ascending: true })

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Gestao de Usuarios</h1>
        <p className="text-gray-500 mt-1">Convide colaboradores e gerencie seus acessos</p>
      </div>

      <FormConvite />

      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          Usuarios cadastrados ({usuarios?.length ?? 0})
        </h2>
        <TabelaUsuarios
          usuarios={usuarios ?? []}
          usuarioAtualId={user.id}
          papeisLabels={PAPEIS_LABELS}
        />
      </div>
    </div>
  )
}
