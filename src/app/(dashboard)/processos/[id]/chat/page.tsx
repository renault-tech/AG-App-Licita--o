import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { buscarMensagens, garantirCanalProcesso } from '@/lib/actions/chat'
import { PainelChat } from '@/components/chat/painel-chat'

export default async function ChatProcessoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id: processoId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: processo } = await (supabase as any)
    .from('processos_licitatorios')
    .select('numero_processo, objeto')
    .eq('id', processoId)
    .maybeSingle()

  if (!processo) redirect('/processos')

  const nomeCanal = (processo as any).numero_processo
    ? `${(processo as any).numero_processo}`
    : String((processo as any).objeto ?? '').slice(0, 40)

  const canalId = await garantirCanalProcesso(processoId, nomeCanal)
  if (!canalId) redirect(`/processos/${processoId}/dfd`)

  const mensagens = await buscarMensagens(canalId)

  return (
    <PainelChat
      canalId={canalId}
      mensagensIniciais={mensagens}
      usuarioAtualId={user.id}
      titulo={`Chat do Processo: ${nomeCanal}`}
      className="min-h-[500px]"
    />
  )
}
