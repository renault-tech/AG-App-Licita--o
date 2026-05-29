import { redirect } from 'next/navigation'
import { garantirCanalDM } from '@/lib/actions/chat'

interface Props {
  params: Promise<{ usuarioId: string }>
}

export default async function ChatDMPage({ params }: Props) {
  const { usuarioId } = await params
  const canalId = await garantirCanalDM(usuarioId)

  if (!canalId) redirect('/chat')

  redirect(`/chat/${canalId}`)
}
