import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import TabelaUsuarios from './tabela-usuarios'
import FormConvite from './form-convite'

const PAPEIS_LABELS: Record<string, string> = {
  requisitante: 'Requisitante',
  setor_compras: 'Setor de Compras',
  setor_licitacao: 'Setor de Licitacao',
  procurador: 'Procurador',
  gestor_publico: 'Gestor Publico',
  publicacao: 'Publicacao',
  admin_organizacao: 'Administrador',
  admin_plataforma: 'Admin Plataforma',
}

export default async function GestaoUsuariosPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data } = await supabase
    .from('usuarios')
    .select('*')
    .eq('id', user.id)
    .single()

  const usuarioAtual = data as any;

  if (!usuarioAtual) redirect('/onboarding')
  if (!['admin_organizacao', 'admin_plataforma'].includes(usuarioAtual.papel)) redirect('/dashboard')

  const [{ data: usuarios }, { data: secretariasData }] = await Promise.all([
    supabase
      .from('usuarios')
      .select('*')
      .eq('organizacao_id', usuarioAtual.organizacao_id)
      .order('created_at', { ascending: true }),
    (supabase as any)
      .from('secretarias')
      .select('id, nome, sigla')
      .eq('organizacao_id', usuarioAtual.organizacao_id)
      .eq('ativo', true)
      .order('nome'),
  ])

  const secretarias = (secretariasData ?? []) as Array<{ id: string; nome: string; sigla: string | null }>

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold" style={{ color: 'var(--ink)', fontFamily: 'var(--font-heading)' }}>Gestao de Usuarios</h2>
        <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>Convide colaboradores e gerencie papeis de acesso.</p>
      </div>

      <FormConvite secretarias={secretarias} />

      <div>
        <h2 className="text-sm font-semibold mb-3" style={{ color: 'var(--ink)' }}>
          Usuarios cadastrados ({usuarios?.length ?? 0})
        </h2>
        <TabelaUsuarios
          usuarios={usuarios ?? []}
          usuarioAtualId={user.id}
          papeisLabels={PAPEIS_LABELS}
          secretarias={secretarias}
        />
      </div>
    </div>
  )
}
