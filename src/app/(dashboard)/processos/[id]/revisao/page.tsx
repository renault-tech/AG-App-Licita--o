import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { aprovarDocumento, devolverDocumento } from '@/lib/actions/tramitacao'
import PainelRevisao from './painel-revisao'

const TABELAS_DOCUMENTO = ['dfd', 'etp', 'termo_referencia', 'mapa_riscos', 'edital'] as const
const NOME_DOCUMENTO: Record<string, string> = {
  dfd:             'DFD',
  etp:             'ETP',
  termo_referencia:'TR',
  mapa_riscos:     'Mapa de Riscos',
  edital:          'Edital',
}

export default async function RevisaoPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: usuario } = await supabase
    .from('usuarios')
    .select('papel')
    .eq('id', user.id)
    .maybeSingle()

  const papel = (usuario as any)?.papel
  if (papel !== 'setor_licitacao' && papel !== 'admin_organizacao' && papel !== 'admin_plataforma') {
    redirect(`/processos/${id}/dfd`)
  }

  // Busca todos os documentos do processo e seus status
  const [dfdRes, etpRes, trRes, riscosRes, editalRes] = await Promise.all([
    (supabase as any).from('dfd').select('id, status, updated_at').eq('processo_id', id).maybeSingle(),
    (supabase as any).from('etp').select('id, status, updated_at').eq('processo_id', id).maybeSingle(),
    (supabase as any).from('termo_referencia').select('id, status, updated_at').eq('processo_id', id).maybeSingle(),
    (supabase as any).from('mapa_riscos').select('id, status, updated_at').eq('processo_id', id).maybeSingle(),
    (supabase as any).from('edital').select('id, status, updated_at').eq('processo_id', id).maybeSingle(),
  ])

  const documentos = [
    { tabela: 'dfd' as const,             doc: dfdRes.data,    nome: 'DFD',           slug: 'dfd' },
    { tabela: 'etp' as const,             doc: etpRes.data,    nome: 'ETP',           slug: 'etp' },
    { tabela: 'termo_referencia' as const, doc: trRes.data,    nome: 'TR',            slug: 'tr' },
    { tabela: 'mapa_riscos' as const,     doc: riscosRes.data, nome: 'Mapa de Riscos',slug: 'riscos' },
    { tabela: 'edital' as const,          doc: editalRes.data, nome: 'Edital',        slug: 'edital' },
  ].filter(d => d.doc !== null)

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-lg font-bold text-gray-900">Painel de Revisão</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Analise, aprove ou devolva os documentos enviados para revisão do setor de licitações.
        </p>
      </div>
      <PainelRevisao documentos={documentos} processoId={id} />
    </div>
  )
}
