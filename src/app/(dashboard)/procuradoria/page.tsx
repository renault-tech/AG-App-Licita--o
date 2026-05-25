import { listarPareceresOrg } from '@/lib/actions/procuradoria'
import { obterConfiguracoes } from '@/lib/actions/configuracoes-plataforma'
import { StepPageHeader } from '@/components/licita/step-page-header'
import { EditorialKicker, HeadlineSerif, BigStat, Wordmark } from '@/components/licita/editorial'
import ListaPareceres from './lista-pareceres'

export default async function ProcuradoriaPage() {
  const [pareceres, configs] = await Promise.all([
    listarPareceresOrg(),
    obterConfiguracoes(),
  ])

  const prazoUrgencia = Number(configs['prazo_urgencia_parecer_dias'] ?? 5)
  const prazoAlerta   = Number(configs['prazo_alerta_parecer_dias']   ?? 10)

  const totalAguardando = pareceres.filter(p =>
    p.status === 'pendente' || p.status === 'em_analise'
  ).length
  const totalAprovados = pareceres.filter(p =>
    p.status === 'aprovado' || p.status === 'aprovado_com_ressalvas'
  ).length

  return (
    <div className="space-y-6">
      {/* Masthead editorial */}
      <div
        className="flex items-center justify-between pb-3.5"
        style={{ borderBottom: '2px solid var(--rule)' }}
      >
        <EditorialKicker
          kicker="Procuradoria Geral do Município"
          edition="Art. 53, Lei 14.133/21"
          date={new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }).replaceAll('/', '·')}
        />
      </div>

      {/* Headline editorial + contadores */}
      <div className="grid gap-8" style={{ gridTemplateColumns: '1fr auto' }}>
        <HeadlineSerif size="lg" as="h1">
          Análise jurídica{' '}
          <em style={{ fontStyle: 'italic', color: 'var(--muted)' }}>prévia.</em>
        </HeadlineSerif>

        <div className="hidden lg:flex items-end gap-8">
          <BigStat label="Aguardando" valor={totalAguardando} accent />
          <BigStat label="Aprovados" valor={totalAprovados} />
        </div>
      </div>

      <StepPageHeader
        title="Procuradoria"
        subtitle="Fila de pareceres jurídicos, Art. 53 da Lei 14.133/21."
        artigo="Art. 53"
      />
      <ListaPareceres
        pareceres={pareceres}
        prazoUrgenciaDias={prazoUrgencia}
        prazoAlertaDias={prazoAlerta}
      />

      {/* Rodapé editorial */}
      <div className="pt-4 flex items-center justify-between" style={{ borderTop: '1px solid var(--hairline)' }}>
        <Wordmark />
        <div className="font-mono text-[9.5px]" style={{ color: 'var(--muted)', letterSpacing: '0.12em' }}>
          Art. 53 · Parecer jurídico obrigatório antes da abertura
        </div>
      </div>
    </div>
  )
}
