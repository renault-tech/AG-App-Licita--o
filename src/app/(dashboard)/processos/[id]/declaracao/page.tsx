import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { obterDeclaracao } from '@/lib/actions/declaracao'
import { obterPapelUsuario } from '@/lib/actions/usuario'
import { StepPageHeader } from '@/components/licita/step-page-header'
import EditorDeclaracao from './editor-declaracao'

export default async function DeclaracaoPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const papel = await obterPapelUsuario()
  const readonly = papel === 'procurador' || papel === 'autoridade_competente'

  const declaracao = await obterDeclaracao(id)
  if (!declaracao) return notFound()

  return (
    <div className="space-y-4">
      <StepPageHeader
        title="Declaração do Setor Requisitante"
        subtitle="Documento que formaliza a necessidade da contratação pelo setor requisitante."
      />
      <EditorDeclaracao
        declaracao={declaracao}
        processoId={id}
        podeEditar={!readonly}
      />
    </div>
  )
}
