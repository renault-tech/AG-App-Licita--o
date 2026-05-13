import { listarPareceresOrg } from '@/lib/actions/procuradoria'
import { obterConfiguracoes } from '@/lib/actions/configuracoes-plataforma'
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
      <div>
        <h1 className="text-lg font-bold text-gray-900">Procuradoria</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Fila de pareceres juridicos — Art. 53 da Lei 14.133/21
        </p>
      </div>
      <ListaPareceres
        pareceres={pareceres}
        prazoUrgenciaDias={prazoUrgencia}
        prazoAlertaDias={prazoAlerta}
      />
    </div>
  )
}
