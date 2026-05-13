import ConfiguracoesPlatafoma from './configuracoes-form'
import { obterConfiguracoes } from '@/lib/actions/configuracoes-plataforma'

export default async function ConfiguracoesPlataformaPage() {
  const configs = await obterConfiguracoes()
  return (
    <div className="max-w-xl">
      <div className="mb-6">
        <h1 className="text-lg font-bold text-gray-900">Configuracoes da Plataforma</h1>
        <p className="text-sm text-gray-500 mt-0.5">Parametros globais aplicados a toda a plataforma.</p>
      </div>
      <ConfiguracoesPlatafoma
        prazoUrgencia={Number(configs['prazo_urgencia_parecer_dias'] ?? 5)}
        prazoAlerta={Number(configs['prazo_alerta_parecer_dias'] ?? 10)}
      />
    </div>
  )
}
