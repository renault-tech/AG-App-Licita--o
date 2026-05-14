import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { obterOficio } from '@/lib/actions/oficio'
import { obterPapelUsuario } from '@/lib/actions/usuario'
import EditorOficio from './editor-oficio'

export default async function OficioPage({
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

  const oficio = await obterOficio(id)
  if (!oficio) return notFound()

  // Buscar modalidade do processo para o prompt de IA
  const { data: processo } = await (supabase as any)
    .from('processos_licitatorios')
    .select('modalidade')
    .eq('id', id)
    .maybeSingle()

  const modalidade = (processo as { modalidade: string } | null)?.modalidade ?? 'dispensa'

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-bold text-gray-900">Ofício de Abertura</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Comunica formalmente à Procuradoria a abertura do processo para emissão do Parecer Jurídico.
        </p>
      </div>
      <EditorOficio
        oficio={oficio}
        processoId={id}
        modalidade={modalidade}
        podeEditar={!readonly}
      />
    </div>
  )
}
