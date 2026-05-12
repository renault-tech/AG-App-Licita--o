import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { buscarAviso } from '@/lib/actions/avisos'
import FormularioAdesao from './formulario-adesao'

export default async function AderirPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) notFound()

  const { data: userData } = await supabase
    .from('usuarios')
    .select('secretaria_id')
    .eq('id', user.id)
    .maybeSingle()

  const secretariaId = (userData as any)?.secretaria_id as string | null

  const resultado = await buscarAviso(id)
  if (!resultado.success || !resultado.aviso) notFound()

  const aviso = resultado.aviso

  const eDestinataria = aviso.destinatarias.some(d => d.secretaria_id === secretariaId)
  if (!eDestinataria) notFound()

  const jaAderiu = aviso.adesoes.some(a => a.secretaria_id === secretariaId)

  return (
    <div className="max-w-2xl mx-auto">
      <FormularioAdesao
        aviso={aviso}
        secretariaId={secretariaId!}
        jaAderiu={jaAderiu}
      />
    </div>
  )
}
