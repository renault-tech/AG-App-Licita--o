import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { obterAutorizacao } from '@/lib/actions/autorizacao'
import { obterPapelUsuario } from '@/lib/actions/usuario'
import { StepPageHeader } from '@/components/licita/step-page-header'
import PainelAutorizacao from './painel-autorizacao'

const DOCUMENTOS_PROCESSO = [
  { nome: 'DFD',            slug: 'dfd',    tabela: 'dfd' },
  { nome: 'ETP',            slug: 'etp',    tabela: 'etp' },
  { nome: 'TR',             slug: 'tr',     tabela: 'termo_referencia' },
  { nome: 'Mapa de Riscos', slug: 'riscos', tabela: 'mapa_riscos' },
  { nome: 'Edital',         slug: 'edital', tabela: 'edital' },
]

export default async function AutorizacaoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const papel = await obterPapelUsuario()
  if (!papel) redirect('/login')

  const podeAutorizar =
    papel === 'gestor_publico' ||
    papel === 'admin_organizacao' ||
    papel === 'admin_plataforma'

  const docQueries = DOCUMENTOS_PROCESSO.map(d =>
    (supabase as any).from(d.tabela).select('status').eq('processo_id', id).maybeSingle()
  )

  const [autorizacao, parecerRes, ...docResults] = await Promise.all([
    obterAutorizacao(id),
    (supabase as any).from('pareceres').select('status').eq('processo_id', id).maybeSingle(),
    ...docQueries,
  ])

  const { data: processo } = await (supabase as any)
    .from('processos_licitatorios')
    .select('id')
    .eq('id', id)
    .maybeSingle()

  if (!processo) return notFound()

  const documentos = DOCUMENTOS_PROCESSO.map((d, i) => ({
    nome:   d.nome,
    slug:   d.slug,
    status: (docResults[i] as any).data?.status ?? 'rascunho',
  }))

  const parecerStatus = (parecerRes as any).data?.status ?? null

  return (
    <div className="space-y-4">
      <StepPageHeader
        title="Autorização da Autoridade Competente"
        subtitle="Autorização para abertura do certame conforme Art. 72 da Lei 14.133/21."
        artigo="Art. 72"
      />
      <PainelAutorizacao
        processoId={id}
        autorizacao={autorizacao}
        documentos={documentos}
        podeAutorizar={podeAutorizar}
        parecerStatus={parecerStatus}
      />
    </div>
  )
}
