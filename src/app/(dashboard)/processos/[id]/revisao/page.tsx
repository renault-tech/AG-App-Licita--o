import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { StepPageHeader } from '@/components/licita/step-page-header'
import PainelRevisao from './painel-revisao'

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

  const [dfdRes, etpRes, trRes, riscosRes, editalRes] = await Promise.all([
    (supabase as any).from('dfd').select('id, status, updated_at').eq('processo_id', id).maybeSingle(),
    (supabase as any).from('etp').select('id, status, updated_at').eq('processo_id', id).maybeSingle(),
    (supabase as any).from('termo_referencia').select('id, status, updated_at').eq('processo_id', id).maybeSingle(),
    (supabase as any).from('mapa_riscos').select('id, status, updated_at').eq('processo_id', id).maybeSingle(),
    (supabase as any).from('edital').select('id, status, updated_at').eq('processo_id', id).maybeSingle(),
  ])

  const documentos = [
    { tabela: 'dfd' as const,              doc: dfdRes.data,    nome: 'DFD',            slug: 'dfd' },
    { tabela: 'etp' as const,              doc: etpRes.data,    nome: 'ETP',            slug: 'etp' },
    { tabela: 'termo_referencia' as const, doc: trRes.data,     nome: 'TR',             slug: 'tr' },
    { tabela: 'mapa_riscos' as const,      doc: riscosRes.data, nome: 'Mapa de Riscos', slug: 'riscos' },
    { tabela: 'edital' as const,           doc: editalRes.data, nome: 'Edital',         slug: 'edital' },
  ].filter(d => d.doc !== null)

  return (
    <div className="space-y-4">
      <StepPageHeader
        title="Painel de Revisão"
        subtitle="Analise, aprove ou devolva os documentos enviados para revisão do setor de licitações."
      />
      <PainelRevisao documentos={documentos} processoId={id} />
    </div>
  )
}
