import { notFound } from 'next/navigation'
import { buscarAviso } from '@/lib/actions/avisos'
import PainelAcompanhamento from './painel-acompanhamento'

export default async function AvisoDetalhe({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const resultado = await buscarAviso(id)
  if (!resultado.success || !resultado.aviso) notFound()

  return (
    <div className="max-w-4xl mx-auto">
      <PainelAcompanhamento aviso={resultado.aviso} />
    </div>
  )
}
