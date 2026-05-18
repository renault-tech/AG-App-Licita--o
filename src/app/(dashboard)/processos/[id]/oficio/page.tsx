import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import { obterOficio } from '@/lib/actions/oficio'
import { obterPapelUsuario } from '@/lib/actions/usuario'
import { StepPageHeader } from '@/components/licita/step-page-header'
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
  const readonly = papel === 'procurador' || papel === 'gestor_publico'

  const oficio = await obterOficio(id)
  if (!oficio) return notFound()

  const { data: processo } = await (supabase as any)
    .from('processos_licitatorios')
    .select('modalidade')
    .eq('id', id)
    .maybeSingle()

  const modalidade = (processo as { modalidade: string } | null)?.modalidade ?? 'dispensa'

  return (
    <div className="space-y-4">
      <StepPageHeader
        title="Ofício de Abertura"
        subtitle="Comunica formalmente à Procuradoria a abertura do processo para emissão do Parecer Jurídico."
      />
      <EditorOficio
        oficio={oficio}
        processoId={id}
        modalidade={modalidade}
        podeEditar={!readonly}
      />
    </div>
  )
}
