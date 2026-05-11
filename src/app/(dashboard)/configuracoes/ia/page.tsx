import { CheckCircle2, XCircle, ExternalLink, Zap } from 'lucide-react'

const PROVEDORES = [
  {
    id: 'gemini',
    nome: 'Google Gemini Flash',
    preco: 'Gratuito',
    precoBadge: 'bg-green-100 text-green-700',
    descricao: '15 requisicoes/minuto, 1 milhao de tokens por dia. Ideal para uso inicial e demonstracoes.',
    keyVar: 'GEMINI_API_KEY',
    link: 'https://aistudio.google.com/app/apikey',
    linkLabel: 'Obter chave no Google AI Studio',
    passos: [
      'Acesse Google AI Studio (aistudio.google.com)',
      'Faca login com sua conta Google',
      'Clique em "Get API key" e depois "Create API key"',
      'Copie a chave gerada',
      'Abra o arquivo .env.local na raiz do projeto',
      'Adicione: GEMINI_API_KEY=sua_chave_aqui',
      'Adicione: AI_PROVIDER=gemini',
      'Reinicie o servidor (npm run dev)',
    ],
  },
  {
    id: 'groq',
    nome: 'Groq (LLaMA 3.3 70B)',
    preco: 'Gratuito',
    precoBadge: 'bg-green-100 text-green-700',
    descricao: '14.400 requisicoes por dia. Alta velocidade de geracao.',
    keyVar: 'GROQ_API_KEY',
    link: 'https://console.groq.com/keys',
    linkLabel: 'Obter chave no Groq Console',
    passos: [
      'Acesse console.groq.com',
      'Crie uma conta gratuita',
      'Clique em "API Keys" e depois "Create API Key"',
      'Copie a chave gerada',
      'Adicione ao .env.local: GROQ_API_KEY=sua_chave_aqui',
      'Adicione ao .env.local: AI_PROVIDER=groq',
      'Reinicie o servidor (npm run dev)',
    ],
  },
  {
    id: 'anthropic',
    nome: 'Anthropic Claude',
    preco: 'Pago',
    precoBadge: 'bg-amber-100 text-amber-700',
    descricao: 'Claude Sonnet 4.6 para documentos e Claude Opus 4.7 para geracao completa. Maxima qualidade.',
    keyVar: 'ANTHROPIC_API_KEY',
    link: 'https://console.anthropic.com/',
    linkLabel: 'Obter chave no Anthropic Console',
    passos: [
      'Acesse console.anthropic.com',
      'Crie uma conta e adicione credito de uso',
      'Va em "API Keys" e crie uma nova chave',
      'Adicione ao .env.local: ANTHROPIC_API_KEY=sua_chave_aqui',
      'Adicione ao .env.local: AI_PROVIDER=anthropic',
      'Reinicie o servidor (npm run dev)',
    ],
  },
  {
    id: 'openrouter',
    nome: 'OpenRouter',
    preco: 'Creditos gratuitos',
    precoBadge: 'bg-blue-100 text-blue-700',
    descricao: 'Acesso a dezenas de modelos. Creditos gratuitos para novos usuarios.',
    keyVar: 'OPENROUTER_API_KEY',
    link: 'https://openrouter.ai/keys',
    linkLabel: 'Obter chave no OpenRouter',
    passos: [
      'Acesse openrouter.ai',
      'Crie uma conta (ganhe creditos gratuitos)',
      'Va em "Keys" e crie uma nova chave',
      'Adicione ao .env.local: OPENROUTER_API_KEY=sua_chave_aqui',
      'Adicione ao .env.local: AI_PROVIDER=openrouter',
      'Reinicie o servidor (npm run dev)',
    ],
  },
]

function StatusBadge({ configurado }: { configurado: boolean }) {
  if (configurado) {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
        <CheckCircle2 className="w-3 h-3" /> Configurado
      </span>
    )
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs font-medium text-gray-500 bg-gray-50 border border-gray-200 px-2 py-0.5 rounded-full">
      <XCircle className="w-3 h-3" /> Nao configurado
    </span>
  )
}

export default function ConfiguracaoIAPage() {
  const providerAtivo = process.env.AI_PROVIDER ?? 'gemini'
  const chaves: Record<string, boolean> = {
    gemini: !!process.env.GEMINI_API_KEY,
    groq: !!process.env.GROQ_API_KEY,
    anthropic: !!process.env.ANTHROPIC_API_KEY,
    openrouter: !!process.env.OPENROUTER_API_KEY,
  }
  const algumConfigurado = Object.values(chaves).some(Boolean)

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-lg font-bold text-gray-900">Inteligencia Artificial</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Configure o provedor de IA usado para refinar os documentos gerados. O provedor e definido
          via variavel de ambiente no servidor.
        </p>
      </div>

      {/* Status atual */}
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-1">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Provedor ativo</p>
        <div className="flex items-center gap-2">
          <p className="text-sm font-medium text-gray-900">
            {PROVEDORES.find(p => p.id === providerAtivo)?.nome ?? providerAtivo}
          </p>
          <StatusBadge configurado={chaves[providerAtivo] ?? false} />
        </div>
        <p className="text-xs text-gray-500">
          Definido por <code className="bg-white border border-gray-200 px-1 rounded text-xs">AI_PROVIDER={providerAtivo}</code> no arquivo <code className="bg-white border border-gray-200 px-1 rounded text-xs">.env.local</code>
        </p>
      </div>

      {/* Banner: nenhum configurado */}
      {!algumConfigurado && (
        <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
          <Zap className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-800">Nenhum provedor configurado</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Os documentos serao gerados apenas com templates padrao, sem refinamento por IA.
              Recomendamos comecar com o Google Gemini (gratuito).
            </p>
          </div>
        </div>
      )}

      {/* Cards de provedores */}
      <div className="space-y-4">
        <h2 className="text-sm font-semibold text-gray-700">Provedores disponiveis</h2>
        {PROVEDORES.map(p => {
          const isAtivo = p.id === providerAtivo
          const configurado = chaves[p.id] ?? false
          return (
            <div
              key={p.id}
              className={`border rounded-xl p-4 space-y-3 ${isAtivo ? 'border-blue-300 bg-blue-50/50' : 'border-gray-200 bg-white'}`}
            >
              <div className="flex items-start justify-between gap-2 flex-wrap">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-gray-900">{p.nome}</p>
                  {isAtivo && (
                    <span className="text-xs px-1.5 py-0.5 bg-blue-100 text-blue-700 rounded font-medium">
                      Ativo
                    </span>
                  )}
                  <span className={`text-xs px-1.5 py-0.5 rounded font-medium ${p.precoBadge}`}>
                    {p.preco}
                  </span>
                </div>
                <StatusBadge configurado={configurado} />
              </div>
              <p className="text-xs text-gray-600">{p.descricao}</p>

              {/* Passos de configuracao */}
              <details className="group">
                <summary className="text-xs font-medium text-blue-600 cursor-pointer hover:text-blue-800 list-none flex items-center gap-1">
                  <span className="group-open:hidden">Ver instrucoes de configuracao</span>
                  <span className="hidden group-open:inline">Ocultar instrucoes</span>
                </summary>
                <div className="mt-2 space-y-2">
                  <ol className="space-y-1">
                    {p.passos.map((passo, i) => (
                      <li key={i} className="flex gap-2 text-xs text-gray-600">
                        <span className="w-4 h-4 rounded-full bg-gray-200 text-gray-600 flex items-center justify-center shrink-0 font-semibold text-[10px]">
                          {i + 1}
                        </span>
                        {passo}
                      </li>
                    ))}
                  </ol>
                  <a
                    href={p.link}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline font-medium mt-1"
                  >
                    <ExternalLink className="w-3 h-3" />
                    {p.linkLabel}
                  </a>
                </div>
              </details>
            </div>
          )
        })}
      </div>

      <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl">
        <p className="text-xs text-gray-500">
          <strong className="text-gray-700">Nota de seguranca:</strong> As chaves de API sao armazenadas
          apenas no arquivo <code className="bg-white border border-gray-200 px-1 rounded">.env.local</code>,
          que nunca e versionado no repositorio. Nunca compartilhe ou commite este arquivo.
        </p>
      </div>
    </div>
  )
}