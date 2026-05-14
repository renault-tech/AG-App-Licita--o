import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { obterDeclaracao } from '@/lib/actions/declaracao'
import { obterPapelUsuario } from '@/lib/actions/usuario'
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

  // Procurador e autoridade competente têm acesso somente leitura
  const readonly = papel === 'procurador' || papel === 'autoridade_competente'

  const declaracao = await obterDeclaracao(id)
  if (!declaracao) return notFound()

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-bold text-gray-900">Declaração do Setor Requisitante</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Documento que formaliza a necessidade da contratação pelo setor requisitante.
        </p>
      </div>
      <EditorDeclaracao
        declaracao={declaracao}
        processoId={id}
        podeEditar={!readonly}
      />
    </div>
  )
}
