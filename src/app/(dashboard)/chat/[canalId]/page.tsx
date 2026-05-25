import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { buscarMensagens } from '@/lib/actions/chat'
import { PainelChat } from '@/components/chat/painel-chat'

export default async function CanalPage({ params }: { params: Promise<{ canalId: string }> }) {
  const { canalId } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: usr } = await supabase
    .from('usuarios')
    .select('organizacao_id')
    .eq('id', user.id)
    .single()

  const { data: canal } = await (supabase as any)
    .from('canais_chat')
    .select('id, nome, tipo')
    .eq('id', canalId)
    .eq('organizacao_id', (usr as any)?.organizacao_id)
    .maybeSingle()

  if (!canal) return notFound()

  const mensagens = await buscarMensagens(canalId)

  const TITULO_TIPO: Record<string, string> = {
    plataforma: 'Canal Geral',
    setor: 'Canal do Setor',
    processo: 'Chat do Processo',
  }

  return (
    <PainelChat
      canalId={canalId}
      mensagensIniciais={mensagens}
      usuarioAtualId={user.id}
      titulo={`${TITULO_TIPO[(canal as any).tipo] ?? 'Chat'}: ${(canal as any).nome}`}
      className="h-full border-0 rounded-none"
    />
  )
}
