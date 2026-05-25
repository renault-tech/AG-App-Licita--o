import { redirect } from 'next/navigation'
import { garantirCanalPlataforma } from '@/lib/actions/chat'

export default async function ChatIndexPage() {
  const canalId = await garantirCanalPlataforma()
  if (canalId) redirect(`/chat/${canalId}`)

  return (
    <div className="flex items-center justify-center h-full">
      <p className="text-sm" style={{ color: 'var(--muted)' }}>
        Nenhum canal disponivel ainda.
      </p>
    </div>
  )
}
