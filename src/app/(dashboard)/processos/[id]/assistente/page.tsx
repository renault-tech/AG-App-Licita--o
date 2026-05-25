import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { buscarHistoricoAssistente } from '@/lib/actions/assistente-ia'
import { AssistenteIAPanel } from './assistente-panel'

export default async function AssistentePage({ params }: { params: Promise<{ id: string }> }) {
  const { id: processoId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: creditos } = await (supabase as any)
    .from('creditos_usuario')
    .select('saldo')
    .eq('usuario_id', user.id)
    .maybeSingle()

  const historico = await buscarHistoricoAssistente(processoId)
  const saldo = (creditos as any)?.saldo ?? 0

  return (
    <AssistenteIAPanel
      processoId={processoId}
      historicoInicial={historico}
      saldoCreditos={saldo}
    />
  )
}
