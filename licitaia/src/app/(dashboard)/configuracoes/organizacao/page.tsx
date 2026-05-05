import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import FormOrganizacao from './form-organizacao'

export default async function ConfiguracaoOrganizacaoPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('organizacao_id, papel')
    .eq('id', user.id)
    .single()

  if (!usuario) redirect('/onboarding')

  if (!['admin_organizacao', 'admin_plataforma'].includes(usuario.papel)) {
    redirect('/dashboard')
  }

  const { data: org } = await supabase
    .from('organizacoes')
    .select('*')
    .eq('id', usuario.organizacao_id)
    .single()

  if (!org) redirect('/onboarding')

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Configuracoes da Organizacao</h1>
        <p className="text-gray-500 mt-1">Dados institucionais usados nos documentos gerados</p>
      </div>
      <FormOrganizacao organizacao={org} />
    </div>
  )
}
