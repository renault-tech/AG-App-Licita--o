import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { listarConvites } from '@/lib/actions/convites'
import FormConvitePrefeitura from './form-convite-prefeitura'
import TabelaConvites from './tabela-convites'

export default async function ConvitesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: usuarioData } = await (supabase as any)
    .from('usuarios')
    .select('papel')
    .eq('id', user.id)
    .maybeSingle()

  if ((usuarioData as any)?.papel !== 'admin_plataforma') {
    redirect('/configuracoes')
  }

  const convites = await listarConvites()

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-bold" style={{ color: 'var(--ink)', fontFamily: 'var(--font-heading)' }}>
          Convites de Prefeitura
        </h2>
        <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
          Envie um convite por e-mail para o administrador da prefeitura concluir o cadastro.
          O link e valido por 7 dias.
        </p>
      </div>

      <FormConvitePrefeitura />

      <TabelaConvites convites={convites} />
    </div>
  )
}
