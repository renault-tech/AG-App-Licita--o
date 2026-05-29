import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import OnboardingForm from './onboarding-form'

export default async function OnboardingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Sem sessao: vai para o login
  if (!user) redirect('/login')

  // Usuario ja tem organizacao configurada: nao precisa de onboarding
  const { data: usuario } = await (supabase as any)
    .from('usuarios')
    .select('organizacao_id')
    .eq('id', user.id)
    .maybeSingle()

  if ((usuario as { organizacao_id?: string } | null)?.organizacao_id) {
    redirect('/dashboard')
  }

  return <OnboardingForm />
}
