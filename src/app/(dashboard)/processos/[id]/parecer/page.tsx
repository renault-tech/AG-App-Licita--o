import { obterParecer } from '@/lib/actions/parecer'
import { obterPapelUsuario } from '@/lib/actions/usuario'
import { buscarPrecedentes, obterResumoProcesso } from '@/lib/actions/procuradoria'
import { notFound } from 'next/navigation'
import { StepPageHeader } from '@/components/licita/step-page-header'
import EditorParecer from './editor-parecer'
import BotoesExportacao from '@/components/documentos/botoes-exportacao'
import BotaoAssinatura from '@/components/assinatura/botao-assinatura'

export default async function ParecerPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const [parecer, papel, precedentes, resumo] = await Promise.all([
    obterParecer(id),
    obterPapelUsuario(),
    buscarPrecedentes(id),
    obterResumoProcesso(id),
  ])

  if (!parecer) return notFound()

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
              />
            )}
            <BotoesExportacao tipo="parecer" processoId={id} nomeDocumento="Parecer" />
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
