import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { obterTodasPermissoesOrg } from '@/lib/actions/permissoes'
import MatrizPermissoes from './matriz-permissoes'

export default async function PermissoesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const dadosPermissoes = await obterTodasPermissoesOrg()

  return (
    <div>
      <div className="mb-6">
        <h2
          className="text-lg font-bold text-[#1A365D] leading-tight"
          style={{ fontFamily: 'var(--font-heading)' }}
        >
          Permissoes de Acesso
        </h2>
        <p className="text-sm text-[#74777F] mt-1">
          Configure quais etapas do processo cada perfil de usuario pode visualizar e editar.
          As alteracoes entram em vigor imediatamente. Quando nao houver configuracao salva,
          o sistema usa os padroes da plataforma.
        </p>
      </div>

      <MatrizPermissoes initialData={dadosPermissoes} />
    </div>
  )
}