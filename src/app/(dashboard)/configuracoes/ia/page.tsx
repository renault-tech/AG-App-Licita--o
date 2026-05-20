import { redirect } from 'next/navigation'
import { ExternalLink, Zap, TrendingUp } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import FormConfigIA from './form-config-ia'

const PROVEDORES = [
  {
    id: 'gemini',
    nome: 'Google Gemini Flash',
    gratis: true,
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
    gratis: true,
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
    gratis: false,
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
    gratis: false,
    keyVar: 'OPENROUTER_API_KEY',
    link: 'https://openrouter.ai/keys',
    linkLabel: 'Obter chave no OpenRouter',
    passos: [
      'Acesse openrouter.ai e crie uma conta (creditos gratuitos no inicio)',
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

  const isAdmin = ['admin_organizacao', 'admin_plataforma'].includes(usuario.papel)

  // Buscar uso pessoal dos ultimos 30 dias
  const trintaDiasAtras = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const { data: usoRaw } = await (supabase as any)
    .from('acoes_ia')
    .select('created_at, tokens_entrada_real, tokens_saida_real, provedor, modelo, tipo_acao, sucesso')
    .eq('usuario_id', user.id)
    .gte('created_at', trintaDiasAtras)
    .order('created_at', { ascending: false })
    .limit(50)

  type UsoItem = {
    created_at: string
    tokens_entrada_real: number | null
    tokens_saida_real: number | null
    provedor: string
    modelo: string
    tipo_acao: string
    sucesso: boolean
  }
  const uso = (usoRaw ?? []) as UsoItem[]
  const totalTokens = uso.reduce((s, r) => s + (r.tokens_entrada_real ?? 0) + (r.tokens_saida_real ?? 0), 0)

  // Grafico de barras: consumo por dia dos ultimos 7 dias
  const seteDias = Array.from({ length: 7 }, (_, i) => {
    const d = new Date()
    d.setDate(d.getDate() - (6 - i))
    return d.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit' })
  })
  const porDia = new Map<string, number>()
  for (const r of uso) {
    const label = new Date(r.created_at).toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit' })
    porDia.set(label, (porDia.get(label) ?? 0) + (r.tokens_entrada_real ?? 0) + (r.tokens_saida_real ?? 0))
  }
  const maxDia = Math.max(...seteDias.map(d => porDia.get(d) ?? 0), 1)

  // Config de provedor (apenas para admins)
  const { data: orgData } = isAdmin
    ? await (supabase.from('organizacoes') as any).select('ia_config').eq('id', usuario.organizacao_id).maybeSingle()
    : { data: null }

  const iaConfigDb = (orgData as any)?.ia_config as { provider?: string } | null
  const provedorEnv = process.env.AI_PROVIDER ?? 'gemini'
  const provedorAtual = iaConfigDb?.provider ?? provedorEnv
  const chavesConfiguradas: Record<string, boolean> = {
    gemini: !!process.env.GEMINI_API_KEY,
    groq: !!process.env.GROQ_API_KEY,
    anthropic: !!process.env.ANTHROPIC_API_KEY,
    openrouter: !!process.env.OPENROUTER_API_KEY,
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-base font-semibold text-gray-900">Inteligencia Artificial</h2>
        <p className="text-sm text-gray-500 mt-0.5">
          Configure o modelo de IA e monitore seu uso pessoal.
        </p>
      </div>

      {/* Monitoramento pessoal: visivel para todos os usuarios */}
      <div className="space-y-3">
        <div className="flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-gray-400" />
          <h3 className="text-sm font-semibold text-gray-700">Meu uso nos ultimos 30 dias</h3>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
            <p className="text-xs text-gray-500">Tokens consumidos</p>
            <p className="text-xl font-bold text-gray-900 mt-0.5">{totalTokens.toLocaleString('pt-BR')}</p>
          </div>
          <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
            <p className="text-xs text-gray-500">Documentos gerados</p>
            <p className="text-xl font-bold text-gray-900 mt-0.5">{uso.filter(r => r.tipo_acao === 'gerar_documento').length}</p>
          </div>
        </div>

        {/* Grafico de barras simples sem dependencia extra */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-3">Tokens por dia (ultimos 7 dias)</p>
          <div className="flex items-end gap-2 h-16">
            {seteDias.map(dia => {
              const val = porDia.get(dia) ?? 0
              const altura = maxDia > 0 ? Math.max(4, Math.round((val / maxDia) * 64)) : 4
              return (
                <div key={dia} className="flex-1 flex flex-col items-center gap-1">
                  <div
                    className="w-full rounded-sm bg-indigo-500"
                    style={{ height: `${altura}px` }}
                    title={`${val.toLocaleString('pt-BR')} tokens`}
                  />
                  <span className="text-[9px] text-gray-400 truncate w-full text-center">{dia}</span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Ultimas acoes de IA */}
        {uso.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-4 py-2 border-b border-gray-100">
              <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Ultimas chamadas de IA</p>
            </div>
            <div className="divide-y divide-gray-100">
              {uso.slice(0, 10).map((r, i) => (
                <div key={i} className="px-4 py-2 flex items-center justify-between">
                  <div>
                    <p className="text-xs font-medium text-gray-800">{r.tipo_acao.replace(/_/g, ' ')}</p>
                    <p className="text-[10px] text-gray-400">{r.modelo} via {r.provedor}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-gray-600">
                      {((r.tokens_entrada_real ?? 0) + (r.tokens_saida_real ?? 0)).toLocaleString('pt-BR')} tokens
                    </p>
                    <p className="text-[10px] text-gray-400">
                      {new Date(r.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Configuracao de provedor: apenas para admins */}
      {isAdmin && (
        <div className="border-t border-gray-100 pt-6 space-y-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-700">Provedor de IA da organizacao</h3>
            <p className="text-xs text-gray-400 mt-0.5">Visivel apenas para administradores. Afeta todos os usuarios da organizacao.</p>
          </div>

          <div className="p-4 bg-gray-50 border border-gray-200 rounded-xl space-y-1">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Provedor ativo agora</p>
            <div className="flex items-center gap-2 flex-wrap">
              <p className="text-sm font-medium text-gray-900">
                {PROVEDORES.find(p => p.id === provedorAtual)?.nome ?? provedorAtual}
              </p>
              {PROVEDORES.find(p => p.id === provedorAtual)?.gratis ? (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                  Gratuito
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                  Pago, consome creditos
                </span>
              )}
              {chavesConfiguradas[provedorAtual] ? (
                <span className="inline-flex items-center gap-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
                  <Zap className="w-3 h-3" /> Operacional
                </span>
              ) : (
                <span className="text-xs font-medium text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full">
                  Chave nao configurada
                </span>
              )}
            </div>
          </div>

          <FormConfigIA provedorAtual={provedorAtual} chavesConfiguradas={chavesConfiguradas} />

          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-gray-600">Instrucoes de configuracao por provedor</h4>
            {PROVEDORES.map(p => (
              <details key={p.id} className="group border border-gray-200 rounded-xl overflow-hidden">
                <summary className="flex items-center justify-between px-4 py-3 bg-white hover:bg-gray-50 cursor-pointer list-none">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-gray-800">{p.nome}</span>
                    {p.gratis ? (
                      <span className="text-xs text-green-700 bg-green-50 border border-green-100 px-1.5 py-0.5 rounded-full">Gratuito</span>
                    ) : (
                      <span className="text-xs text-amber-700 bg-amber-50 border border-amber-100 px-1.5 py-0.5 rounded-full">Pago</span>
                    )}
                    {chavesConfiguradas[p.id] && (
                      <span className="text-xs text-blue-600 bg-blue-50 border border-blue-100 px-1.5 py-0.5 rounded-full">Configurado</span>
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
            ))}
          </div>

          <div className="p-3 bg-gray-50 border border-gray-200 rounded-xl">
            <p className="text-xs text-gray-500">
              <strong className="text-gray-700">Preferencia:</strong> Use sempre um provedor gratuito (Gemini ou Groq) como padrao.
              Provedores pagos so devem ser ativados quando ha necessidade especifica e o usuario esta autenticado com creditos disponiveis.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
