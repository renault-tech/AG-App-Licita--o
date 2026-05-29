import { createClient } from '@/lib/supabase/server'
import { obterParecer } from '@/lib/actions/parecer'
import { obterPapelUsuario } from '@/lib/actions/usuario'
import { buscarPrecedentes, obterResumoProcesso } from '@/lib/actions/procuradoria'
import { notFound } from 'next/navigation'
import { StepPageHeader } from '@/components/licita/step-page-header'
import EditorParecer from './editor-parecer'
import BotoesExportacao from '@/components/documentos/botoes-exportacao'
import BotaoAssinatura from '@/components/assinatura/botao-assinatura'
import BotoesParecer from '@/components/documentos/botoes-parecer'
import { obterProvedorAssinatura } from '@/lib/actions/assinaturas'
import type { FaseProcesso } from '@/types/database'

export default async function ParecerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()

  const [parecer, papel, precedentes, resumo, provedor, processoRes] = await Promise.all([
    obterParecer(id),
    obterPapelUsuario(),
    buscarPrecedentes(id),
    obterResumoProcesso(id),
    obterProvedorAssinatura(),
    (supabase as any)
      .from('processos_licitatorios')
      .select('fase_atual, etapa_atual')
      .eq('id', id)
      .maybeSingle(),
  ])

  if (!parecer) return notFound()

  const faseAtual: FaseProcesso = processoRes.data?.fase_atual ?? 'procurador'
  const etapaAtual: number = processoRes.data?.etapa_atual ?? 10

  const podeAssinar = ['procurador', 'admin_organizacao', 'admin_plataforma'].includes(papel ?? '')

  const documentosDisponiveis = {
    dfd:    !!resumo?.justificativa,
    etp:    !!resumo?.resultados_pretendidos,
    tr:     !!resumo?.requisitos_tecnicos,
    edital: true,
  }

  return (
    <div className="space-y-4">
      <StepPageHeader
        title="Parecer Jurídico"
        subtitle="Análise de regularidade do processo pela Procuradoria conforme Art. 53 da Lei 14.133/21."
        artigo="Art. 53"
        actions={
          <>
            {podeAssinar && (
              <BotaoAssinatura
                tabelaOrigem="pareceres"
                documentoId={(parecer as any).id}
                processoId={id}
                statusAtual={(parecer as any).status ?? 'rascunho'}
                provedor={provedor}
              />
            )}
            <BotoesExportacao tipo="parecer" processoId={id} nomeDocumento="Parecer" />
            <BotoesParecer processoId={id} faseAtual={faseAtual} etapaAtual={etapaAtual} />
          </>
        }
      />
      <EditorParecer
        parecer={parecer as any}
        processoId={id}
        precedentes={precedentes}
        resumo={resumo}
        documentosDisponiveis={documentosDisponiveis}
      />
    </div>
  )
}
