import { obterParecer } from '@/lib/actions/parecer'
import { obterPapelUsuario } from '@/lib/actions/usuario'
import { buscarPrecedentes, obterResumoProcesso } from '@/lib/actions/procuradoria'
import { notFound } from 'next/navigation'
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
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Parecer Jurídico</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Análise de regularidade do processo pela Procuradoria conforme Art. 53 da Lei 14.133/21.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
          {podeAssinar && (
            <BotaoAssinatura
              tabelaOrigem="pareceres"
              documentoId={(parecer as any).id}
              processoId={id}
              statusAtual={(parecer as any).status ?? 'rascunho'}
            />
          )}
          <BotoesExportacao tipo="parecer" processoId={id} nomeDocumento="Parecer" />
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-blue-700 bg-blue-50 border border-blue-100 px-2.5 py-1.5 rounded-lg">
            <span className="font-medium">Art. 53</span>
          </div>
        </div>
      </div>
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
