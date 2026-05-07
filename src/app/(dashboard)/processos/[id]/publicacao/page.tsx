import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { obterPublicacao } from '@/lib/actions/publicacao'
import { obterPapelUsuario } from '@/lib/actions/usuario'
import PainelPublicacao from './painel-publicacao'
import { Globe } from 'lucide-react'

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
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Publicacao do Processo</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Registro da publicacao conforme Art. 54 da Lei 14.133/21.
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-1.5 text-xs text-blue-700 bg-blue-50 border border-blue-100 px-2.5 py-1.5 rounded-lg shrink-0">
          <Globe className="w-3.5 h-3.5" />
          Art. 54
        </div>
      </div>

      <PainelPublicacao
        processoId={id}
        publicacao={publicacao}
        podePublicar={podePublicar}
        autorizado={autorizado}
      />
    </div>
  )
}
