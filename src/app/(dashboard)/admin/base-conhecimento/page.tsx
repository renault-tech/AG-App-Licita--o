import { listarDocumentosBase } from '@/lib/actions/base-conhecimento'
import PainelBaseConhecimento from './painel-base-conhecimento'
import { BookOpen } from 'lucide-react'
import { EditorialKicker, HeadlineSerif } from '@/components/licita/editorial'
import { FooterEditorial } from '../../dashboard/shared'

export default async function BaseConhecimentoPage() {
  const { dados: documentos } = await listarDocumentosBase()

  return (
    <div className="space-y-8">
      {/* Masthead editorial */}
      <div>
        <div className="flex items-center justify-between pb-3.5 mb-5" style={{ borderBottom: '2px solid var(--rule)' }}>
          <EditorialKicker
            kicker="Administracao da Plataforma"
            date={new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' }).replace(/^./, c => c.toUpperCase())}
          />
          <div className="font-mono text-[10px] font-semibold uppercase hidden sm:block" style={{ color: 'var(--muted)', letterSpacing: '0.14em' }}>
            Lei 14.133/21
          </div>
        </div>
        <HeadlineSerif size="md" as="h1">Base de conhecimento.</HeadlineSerif>
        <p className="mt-2 text-[15px]" style={{ color: 'var(--inkSoft)', fontFamily: 'var(--font-heading)', fontStyle: 'italic' }}>
          Alimente a IA com documentos reais para melhorar geracoes e reduzir tokens.
        </p>
      </div>

      {/* Info card */}
      <div className="glass rounded-[var(--r-lg)] p-5 flex items-start gap-4">
        <div
          className="w-8 h-8 rounded-[var(--r-md)] flex items-center justify-center shrink-0 mt-0.5"
          style={{ background: 'var(--primaryWash)' }}
        >
          <BookOpen className="w-4 h-4" style={{ color: 'var(--primary)' }} />
        </div>
        <div>
          <p className="text-sm font-semibold mb-1" style={{ color: 'var(--ink)' }}>Como funciona</p>
          <p className="text-xs leading-relaxed" style={{ color: 'var(--inkSoft)' }}>
            Envie um documento, clique em &quot;Analisar com IA&quot; e o sistema extraira clausulas e textos modelo para a base de conhecimento global.
            Na geracao de novos documentos, a plataforma verifica a base local antes de chamar a IA, economizando tokens progressivamente.
          </p>
        </div>
      </div>

      <PainelBaseConhecimento documentosIniciais={documentos ?? []} />

      <FooterEditorial />
    </div>
  )
}
