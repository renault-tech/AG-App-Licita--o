import { obterTR } from '@/lib/actions/tr'
import { obterPapelUsuario } from '@/lib/actions/usuario'
import { notFound } from 'next/navigation'
import EditorTR from './editor-tr'
import BotoesExportacao from '@/components/documentos/botoes-exportacao'
import BotaoAssinatura from '@/components/assinatura/botao-assinatura'
import { Info } from 'lucide-react'

export default async function TRPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const [tr, papel] = await Promise.all([obterTR(id), obterPapelUsuario()])
  if (!tr) return notFound()

  const podeAssinar = ['setor_licitacao', 'admin_organizacao', 'admin_plataforma'].includes(papel ?? '')

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-lg font-bold text-gray-900">Termo de Referencia (TR)</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Documento que define o objeto da contratacao e suas condicoes conforme Art. 6&ordm;, XXIII da Lei 14.133/21.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0 flex-wrap justify-end">
          {podeAssinar && (
            <BotaoAssinatura
              tabelaOrigem="termo_referencia"
              documentoId={(tr as any).id}
              processoId={id}
              statusAtual={(tr as any).status ?? 'rascunho'}
            />
          )}
          <BotoesExportacao tipo="tr" processoId={id} nomeDocumento="TR" />
          <div className="hidden sm:flex items-center gap-1.5 text-xs text-blue-700 bg-blue-50 border border-blue-100 px-2.5 py-1.5 rounded-lg">
            <Info className="w-3.5 h-3.5" />
            Art. 6&ordm;, XXIII
          </div>
        </div>
      </div>
      <EditorTR tr={tr} processoId={id} papelUsuario={papel ?? 'requisitante'} />
    </div>
  )
}
