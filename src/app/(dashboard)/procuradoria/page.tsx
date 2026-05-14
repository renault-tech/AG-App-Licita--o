import { listarPareceresOrg } from '@/lib/actions/procuradoria'
import { obterConfiguracoes } from '@/lib/actions/configuracoes-plataforma'
import { StepPageHeader } from '@/components/licita/step-page-header'
import ListaPareceres from './lista-pareceres'

export default async function ProcuradoriaPage() {
  const [pareceres, configs] = await Promise.all([
    listarPareceresOrg(),
    obterConfiguracoes(),
  ])

  const prazoUrgencia = Number(configs['prazo_urgencia_parecer_dias'] ?? 5)
  const prazoAlerta   = Number(configs['prazo_alerta_parecer_dias']   ?? 10)

  return (
    <div className="space-y-6">
      <StepPageHeader
        title="Procuradoria"
        subtitle="Fila de pareceres jurídicos — Art. 53 da Lei 14.133/21."
        artigo="Art. 53"
      />
      <ListaPareceres
        pareceres={pareceres}
        prazoUrgenciaDias={prazoUrgencia}
        prazoAlertaDias={prazoAlerta}
      />
    </div>
  )
}
