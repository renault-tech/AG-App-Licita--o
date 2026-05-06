import { redirect } from 'next/navigation'

export default async function ProcessoIndexPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  redirect(`/processos/${id}/dfd`)
}
