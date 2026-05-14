import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { obterPublicacao } from '@/lib/actions/publicacao'
import { obterPapelUsuario } from '@/lib/actions/usuario'
import { StepPageHeader } from '@/components/licita/step-page-header'
import PainelPublicacao from './painel-publicacao'

export default async function PublicacaoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const papel = await obterPapelUsuario()
  if (!papel) redirect('/login')

  const podePublicar =
    papel === 'setor_licitacao' ||
    papel === 'autoridade_competente' ||
    papel === 'admin_organizacao' ||
    papel === 'admin_plataforma'

  const [processoRes, autorizacaoRes, publicacao] = await Promise.all([
    (supabase as any)
      .from('processos_licitatorios')
      .select('id, objeto, modalidade')
      .eq('id', id)
      .maybeSingle(),
    (supabase as any)
      .from('autorizacoes')
      .select('status')
      .eq('processo_id', id)
      .maybeSingle(),
    obterPublicacao(id),
  ])

  if (!processoRes.data) return notFound()

  const autorizado = autorizacaoRes.data?.status === 'autorizado'

  return (
    <div className="space-y-4">
      <StepPageHeader
        title="Publicação do Processo"
        subtitle="Registro da publicação conforme Art. 54 da Lei 14.133/21."
        artigo="Art. 54"
      />
      <PainelPublicacao
        processoId={id}
        publicacao={publicacao}
        podePublicar={podePublicar}
        autorizado={autorizado}
      />
    </div>
  )
}
