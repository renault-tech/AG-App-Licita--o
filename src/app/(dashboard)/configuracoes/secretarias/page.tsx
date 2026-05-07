import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Building2 } from 'lucide-react'
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
    <div className="max-w-2xl space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Secretarias</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Secretarias e orgaos da organizacao. Sao vinculadas aos processos licitatorios como unidades requisitantes.
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-blue-700 bg-blue-50 border border-blue-100 px-2.5 py-1.5 rounded-lg shrink-0">
          <Building2 className="w-3.5 h-3.5" />
          Unidades
        </div>
      </div>

      <PainelSecretarias secretariasIniciais={secretarias} />
    </div>
  )
}
