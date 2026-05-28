import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { listarSecretarias } from '@/lib/actions/secretarias'
import PainelSecretarias from './painel-secretarias'

export default async function SecretariasPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data } = await supabase
    .from('usuarios')
    .select('papel')
    .eq('id', user.id)
    .maybeSingle()

  const usuario = data as { papel: string } | null
  if (!usuario) redirect('/onboarding')
  if (!['admin_organizacao', 'admin_plataforma'].includes(usuario.papel)) redirect('/dashboard')

  const secretarias = await listarSecretarias()

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-base font-semibold" style={{ color: 'var(--ink)', fontFamily: 'var(--font-heading)' }}>Secretarias</h2>
        <p className="text-sm mt-0.5" style={{ color: 'var(--muted)' }}>
          Secretarias e orgaos da organizacao. Sao vinculadas aos processos licitatorios como unidades requisitantes.
        </p>
      </div>

      <PainelSecretarias secretariasIniciais={secretarias} />
    </div>
  )
}
