import { redirect } from 'next/navigation'
import { ExternalLink, Zap, Info } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import FormConfigIA from './form-config-ia'

const PROVEDORES = [
  {
    id: 'gemini',
    nome: 'Google Gemini Flash',
    keyVar: 'GEMINI_API_KEY',
    link: 'https://aistudio.google.com/app/apikey',
    linkLabel: 'Obter chave no Google AI Studio',
    passos: [
      'Acesse aistudio.google.com',
      'Faca login com sua conta Google',
      'Clique em "Get API key" e depois "Create API key"',
      'Copie a chave gerada',
      'Abra o arquivo .env.local na raiz do projeto',
      'Adicione: GEMINI_API_KEY=sua_chave_aqui',
      'Reinicie o servidor (npm run dev)',
    ],
  },
  {
    id: 'groq',
    nome: 'Groq (LLaMA 3.3 70B)',
    keyVar: 'GROQ_API_KEY',
    link: 'https://console.groq.com/keys',
    linkLabel: 'Obter chave no Groq Console',
    passos: [
      'Acesse console.groq.com e crie uma conta gratuita',
      'Clique em "API Keys" e depois "Create API Key"',
      'Copie a chave gerada',
      'Adicione ao .env.local: GROQ_API_KEY=sua_chave_aqui',
      'Reinicie o servidor (npm run dev)',
    ],
  },
  {
    id: 'anthropic',
    nome: 'Anthropic Claude',
    keyVar: 'ANTHROPIC_API_KEY',
    link: 'https://console.anthropic.com/',
    linkLabel: 'Obter chave no Anthropic Console',
    passos: [
      'Acesse console.anthropic.com e crie uma conta',
      'Adicione credito de uso (plano pago)',
      'Va em "API Keys" e crie uma nova chave',
      'Adicione ao .env.local: ANTHROPIC_API_KEY=sua_chave_aqui',
      'Reinicie o servidor (npm run dev)',
    ],
  },
  {
    id: 'openrouter',
    nome: 'OpenRouter',
    keyVar: 'OPENROUTER_API_KEY',
    link: 'https://openrouter.ai/keys',
    linkLabel: 'Obter chave no OpenRouter',
    passos: [
      'Acesse openrouter.ai e crie uma conta (creditos gratuitos)',
      'Va em "Keys" e crie uma nova chave',
      'Adicione ao .env.local: OPENROUTER_API_KEY=sua_chave_aqui',
      'Reinicie o servidor (npm run dev)',
    ],
  },
]

export default async function ConfiguracaoIAPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: usuarioData } = await supabase
    .from('usuarios')
    .select('papel, organizacao_id')
    .eq('id', user.id)
    .maybeSingle()

  const usuario = usuarioData as { papel: string; organizacao_id: string } | null
  if (!usuario) redirect('/onboarding')
  if (!['admin_organizacao', 'admin_plataforma'].includes(usuario.papel)) redirect('/dashboard')

  const { data: orgData } = await (supabase.from('organizacoes') as any)
    .select('ia_config')
    .eq('id', usuario.organizacao_id)
    .maybeSingle()

  const iaConfigDb = (orgData as any)?.ia_config as { provider?: string } | null
  const provedorEnv = process.env.AI_PROVIDER ?? 'gemini'
  const provedorAtual = iaConfigDb?.provider ?? provedorEnv

  const chavesConfiguradas: Record<string, boolean> = {
    gemini: !!process.env.GEMINI_API_KEY,
    groq: !!process.env.GROQ_API_KEY,
    anthropic: !!process.env.ANTHROPIC_API_KEY,
    openrouter: !!process.env.OPENROUTER_API_KEY,
  }

  const nomeProvedor = PROVEDORES.find(p => p.id === provedorAtual)?.nome ?? provedorAtual
  const chaveDoProcedorAtivo = chavesConfiguradas[provedorAtual] ?? false

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-gray-900">Inteligencia Artificial</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Escolha o provedor de IA para geracao e refinamento de documentos. As chaves de API sao configuradas no servidor.
        </p>
      </div>

      {/* Status atual */}
      <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-1">
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Provedor ativo agora</p>
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-sm font-medium text-gray-900">{nomeProvedor}</p>
          {chaveDoProcedorAtivo ? (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
              <Zap className="w-3 h-3" /> Operacional
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
              Chave nao configurada
            </span>
          )}
        </div>
        {iaConfigDb?.provider ? (
          <p className="text-xs text-gray-500">Definido nas configuracoes da organizacao.</p>
        ) : (
          <p className="text-xs text-gray-500">
            Usando padrao do servidor: <code className="bg-white border border-gray-200 px-1 rounded text-xs">AI_PROVIDER={provedorEnv}</code>
          </p>
        )}
      </div>

      {/* Aviso se chave ausente */}
      {!chaveDoProcedorAtivo && (
        <div className="flex items-start gap-3 p-3 bg-amber-50 border border-amber-200 rounded-xl">
          <Zap className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-medium text-amber-800">Provedor sem chave de API</p>
            <p className="text-xs text-amber-700 mt-0.5">
              Os documentos serao gerados apenas com templates padrao. Configure a chave conforme as instrucoes abaixo.
            </p>
          </div>
        </div>
      )}

      {/* Seletor de provedor */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-gray-700">Provedor preferido desta organizacao</h3>
          <div className="group relative">
            <Info className="w-3.5 h-3.5 text-gray-400 cursor-help" />
            <div className="hidden group-hover:block absolute left-5 top-0 w-56 p-2 bg-gray-900 text-white text-xs rounded-lg shadow-lg z-10">
              Selecione o provedor que sera usado para geracoes de IA nesta organizacao. A chave correspondente deve estar no .env.local do servidor.
            </div>
          </div>
        </div>
        <FormConfigIA provedorAtual={provedorAtual} chavesConfiguradas={chavesConfiguradas} />
      </div>

      {/* Instrucoes por provedor */}
      <div className="space-y-3">
        <h3 className="text-sm font-semibold text-gray-700">Instrucoes de configuracao</h3>
        <div className="space-y-2">
          {PROVEDORES.map(p => {
            const configurado = chavesConfiguradas[p.id] ?? false
            return (
              <details key={p.id} className="group border border-gray-200 rounded-xl overflow-hidden">
                <summary className="flex items-center justify-between px-4 py-3 bg-white hover:bg-gray-50 cursor-pointer list-none">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-800">{p.nome}</span>
                    {configurado ? (
                      <span className="text-xs text-green-700 bg-green-50 border border-green-100 px-1.5 py-0.5 rounded-full">Configurado</span>
                    ) : (
                      <span className="text-xs text-gray-400 bg-gray-50 border border-gray-200 px-1.5 py-0.5 rounded-full">Pendente</span>
                    )}
                  </div>
                  <span className="text-xs text-blue-600 group-open:hidden">Ver instrucoes</span>
                  <span className="text-xs text-blue-600 hidden group-open:inline">Fechar</span>
                </summary>
                <div className="px-4 pb-4 pt-2 border-t border-gray-100 bg-gray-50/50 space-y-3">
                  <ol className="space-y-1.5">
                    {p.passos.map((passo, i) => (
                      <li key={i} className="flex gap-2.5 text-xs text-gray-600">
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
                    className="inline-flex items-center gap-1 text-xs text-blue-600 hover:underline font-medium"
                  >
                    <ExternalLink className="w-3 h-3" />
                    {p.linkLabel}
                  </a>
                </div>
              </details>
            )
          })}
        </div>
      </div>

      <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl">
        <p className="text-xs text-gray-500">
          <strong className="text-gray-700">Seguranca:</strong> As chaves de API ficam somente no arquivo{' '}
          <code className="bg-white border border-gray-200 px-1 rounded">.env.local</code>,
          que nunca e versionado. Nunca compartilhe ou commite este arquivo.
        </p>
      </div>
    </div>
  )
}