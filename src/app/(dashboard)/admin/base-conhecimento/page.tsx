import { listarDocumentosBase } from '@/lib/actions/base-conhecimento'
import PainelBaseConhecimento from './painel-base-conhecimento'
import { HelpCircle } from 'lucide-react'

export default async function BaseConhecimentoPage() {
  const { dados: documentos } = await listarDocumentosBase()

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-gray-900">Base de Conhecimento</h2>
            <div className="group relative">
              <HelpCircle className="w-3.5 h-3.5 text-gray-300 hover:text-gray-500 cursor-help" />
              <span className="pointer-events-none absolute left-5 top-0 z-50 hidden group-hover:block w-72 p-2 bg-gray-900 text-white text-xs rounded-lg shadow-xl leading-relaxed">
                Documentos reais de licitacao enviados aqui sao analisados pela IA, que extrai clausulas e modelos de texto. Esses modelos sao reutilizados automaticamente na geracao de novos documentos, reduzindo o consumo de tokens ao longo do tempo. Quanto mais documentos de qualidade enviados, melhor e mais economica se torna a geracao.
              </span>
            </div>
          </div>
          <p className="text-sm text-gray-500 mt-0.5">
            Alimente a IA com documentos reais de licitacao para melhorar a qualidade das geracoes e reduzir o consumo de tokens.
          </p>
        </div>
      </div>

      <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl">
        <p className="text-xs text-amber-800">
          <strong>Como funciona:</strong> Envie um documento, clique em &quot;Analisar com IA&quot; e o sistema extraira clausulas e textos modelo que serao inseridos na base de conhecimento global. A partir dai, ao gerar novos documentos, a plataforma ira verificar primeiro a base local antes de chamar a IA, economizando tokens.
        </p>
      </div>

      <PainelBaseConhecimento documentosIniciais={documentos ?? []} />
    </div>
  )
}