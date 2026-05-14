import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  Zap, TrendingUp, TrendingDown, Clock, CheckCircle2,
  XCircle, Bot, ArrowUpRight, ArrowDownRight, Package,
  AlertCircle, CheckCircle,
} from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import BotaoCompra from './botao-compra'
import { PACOTES_CREDITOS } from '@/lib/creditos-config'

type Transacao = {
  id: string
  created_at: string
  tipo: string
  quantidade: number
  saldo_anterior: number
  saldo_posterior: number
  descricao: string | null
}

type AcaoIA = {
  id: string
  created_at: string
  tipo_acao: string
  provedor: string
  creditos_consumidos: number
  sucesso: boolean
  input_resumo: string | null
}

const TIPO_ACAO_LABEL: Record<string, string> = {
  aprimorar_texto:   'Aprimorar texto',
  sugerir_conteudo:  'Sugerir conteúdo',
  gerar_documento:   'Gerar documento',
}

function formatarData(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default async function CreditosPage({
  searchParams,
}: {
  searchParams: Promise<{ sucesso?: string; cancelado?: string; pendente?: string }>
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const params = await searchParams

  const [creditosRes, transacoesRes, acoesRes] = await Promise.all([
    (supabase as any)
      .from('creditos_usuario')
      .select('saldo, updated_at')
      .eq('usuario_id', user.id)
      .maybeSingle(),
    (supabase as any)
      .from('transacoes_credito')
      .select('id, created_at, tipo, quantidade, saldo_anterior, saldo_posterior, descricao')
      .eq('usuario_id', user.id)
      .order('created_at', { ascending: false })
      .limit(30),
    (supabase as any)
      .from('acoes_ia')
      .select('id, created_at, tipo_acao, provedor, creditos_consumidos, sucesso, input_resumo')
      .eq('usuario_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  const saldo: number       = creditosRes.data?.saldo ?? 0
  const transacoes: Transacao[] = transacoesRes.data ?? []
  const acoes: AcaoIA[]     = acoesRes.data ?? []

  const totalGasto      = acoes.reduce((acc: number, a: AcaoIA) => acc + a.creditos_consumidos, 0)
  const acoesComSucesso = acoes.filter((a: AcaoIA) => a.sucesso).length

  const stripeAtivo = !!process.env.STRIPE_SECRET_KEY
  const mpAtivo     = !!process.env.MERCADOPAGO_ACCESS_TOKEN

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Créditos de IA</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Gerencie seu saldo e acompanhe o consumo de recursos de inteligência artificial.
        </p>
      </div>

      {/* Feedback pós-pagamento */}
      {params.sucesso && (
        <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-xl">
          <CheckCircle className="w-5 h-5 text-green-600 shrink-0" />
          <div>
            <p className="text-sm font-semibold text-green-800">Pagamento confirmado!</p>
            <p className="text-xs text-green-700 mt-0.5">Seus créditos serão creditados em instantes. Atualize a página se necessário.</p>
          </div>
        </div>
      )}
      {params.cancelado && (
        <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200 rounded-xl">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
          <p className="text-sm text-amber-800">Pagamento cancelado. Nenhum valor foi cobrado.</p>
        </div>
      )}
      {params.pendente && (
        <div className="flex items-center gap-3 p-4 bg-blue-50 border border-blue-200 rounded-xl">
          <Clock className="w-5 h-5 text-blue-600 shrink-0" />
          <p className="text-sm text-blue-800">Pagamento em processamento. Os créditos serão liberados após confirmação.</p>
        </div>
      )}

      {/* Cards de métricas */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="border-gray-200">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Saldo atual</p>
                <p className={`text-3xl font-bold mt-1 ${saldo <= 10 ? 'text-red-600' : 'text-purple-700'}`}>
                  {saldo}
                </p>
                <p className="text-xs text-gray-500 mt-0.5">créditos disponíveis</p>
              </div>
              <div className="p-2.5 bg-purple-50 rounded-xl">
                <Zap className="w-5 h-5 text-purple-600" />
              </div>
            </div>
            {saldo <= 10 && (
              <p className="text-xs text-red-600 mt-2 font-medium">Saldo baixo. Recarregue para continuar usando IA.</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-gray-200">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Consumo total</p>
                <p className="text-3xl font-bold mt-1 text-gray-800">{totalGasto}</p>
                <p className="text-xs text-gray-500 mt-0.5">créditos usados em IA</p>
              </div>
              <div className="p-2.5 bg-blue-50 rounded-xl">
                <TrendingDown className="w-5 h-5 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200">
          <CardContent className="p-5">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Ações realizadas</p>
                <p className="text-3xl font-bold mt-1 text-gray-800">{acoes.length}</p>
                <p className="text-xs text-gray-500 mt-0.5">{acoesComSucesso} com sucesso</p>
              </div>
              <div className="p-2.5 bg-green-50 rounded-xl">
                <Bot className="w-5 h-5 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Pacotes de créditos */}
      <Card className="border-gray-200">
        <CardHeader className="px-5 py-4 border-b border-gray-100">
          <CardTitle className="text-base font-semibold text-gray-900 flex items-center gap-2">
            <Package className="w-4 h-4 text-purple-600" />
            Adquirir créditos
          </CardTitle>
          <p className="text-xs text-gray-500 mt-0.5">
            {stripeAtivo || mpAtivo
              ? 'Escolha o pacote e selecione o método de pagamento.'
              : 'Pagamentos via Stripe e Mercado Pago. Configure as chaves de API para habilitar.'}
          </p>
        </CardHeader>
        <CardContent className="p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {PACOTES_CREDITOS.map(pac => (
              <div
                key={pac.id}
                className={`relative rounded-xl border p-4 space-y-2 ${
                  pac.id === 'pack_200'
                    ? 'border-purple-400 bg-purple-50 ring-1 ring-purple-300'
                    : 'border-gray-200 bg-white'
                }`}
              >
                {pac.id === 'pack_200' && (
                  <span className="absolute -top-2.5 left-3 text-xs font-semibold text-white bg-purple-600 px-2 py-0.5 rounded-full">
                    Mais popular
                  </span>
                )}
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold text-gray-900">{pac.creditos}</span>
                  <span className="text-xs text-gray-500">créditos</span>
                </div>
                <p className="text-lg font-bold text-purple-700">{pac.label}</p>

                {/* Botão de compra (Client Component) */}
                <BotaoCompra
                  pacoteId={pac.id}
                  stripeAtivo={stripeAtivo}
                  mpAtivo={mpAtivo}
                />
              </div>
            ))}
          </div>

          {!stripeAtivo && !mpAtivo && (
            <p className="text-xs text-gray-400 mt-3 text-center">
              Configure STRIPE_SECRET_KEY ou MERCADOPAGO_ACCESS_TOKEN no arquivo .env.local para habilitar os pagamentos.
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Histórico de transações */}
        <Card className="border-gray-200">
          <CardHeader className="px-5 py-4 border-b border-gray-100">
            <CardTitle className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-gray-500" />
              Histórico de créditos
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {transacoes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center px-4">
                <Clock className="w-8 h-8 text-gray-300 mb-2" />
                <p className="text-sm text-gray-500">Nenhuma transação ainda.</p>
                <p className="text-xs text-gray-400 mt-1">Adquira créditos para começar.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
                {transacoes.map((t: Transacao) => {
                  const isEntrada = t.tipo === 'compra' || t.tipo === 'bonus'
                  return (
                    <div key={t.id} className="flex items-center gap-3 px-5 py-3">
                      <div className={`p-1.5 rounded-lg shrink-0 ${isEntrada ? 'bg-green-50' : 'bg-red-50'}`}>
                        {isEntrada
                          ? <ArrowUpRight className="w-3.5 h-3.5 text-green-600" />
                          : <ArrowDownRight className="w-3.5 h-3.5 text-red-500" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium text-gray-800 truncate">
                          {t.descricao ?? (isEntrada ? 'Recarga de créditos' : 'Consumo de IA')}
                        </p>
                        <p className="text-xs text-gray-400">{formatarData(t.created_at)}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className={`text-sm font-bold ${isEntrada ? 'text-green-600' : 'text-red-500'}`}>
                          {isEntrada ? '+' : '-'}{t.quantidade}
                        </p>
                        <p className="text-xs text-gray-400">saldo: {t.saldo_posterior}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Histórico de ações de IA */}
        <Card className="border-gray-200">
          <CardHeader className="px-5 py-4 border-b border-gray-100">
            <CardTitle className="text-sm font-semibold text-gray-900 flex items-center gap-2">
              <Bot className="w-4 h-4 text-gray-500" />
              Uso de IA recente
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {acoes.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 text-center px-4">
                <Bot className="w-8 h-8 text-gray-300 mb-2" />
                <p className="text-sm text-gray-500">Nenhuma ação de IA registrada.</p>
                <p className="text-xs text-gray-400 mt-1">Use os botões de IA nos documentos para gerar conteúdo.</p>
              </div>
            ) : (
              <div className="divide-y divide-gray-100 max-h-80 overflow-y-auto">
                {acoes.map((a: AcaoIA) => (
                  <div key={a.id} className="flex items-center gap-3 px-5 py-3">
                    <div className={`p-1.5 rounded-lg shrink-0 ${a.sucesso ? 'bg-green-50' : 'bg-red-50'}`}>
                      {a.sucesso
                        ? <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                        : <XCircle className="w-3.5 h-3.5 text-red-500" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium text-gray-800">
                        {TIPO_ACAO_LABEL[a.tipo_acao] ?? a.tipo_acao}
                      </p>
                      <p className="text-xs text-gray-400 truncate">
                        {a.provedor} &bull; {formatarData(a.created_at)}
                      </p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold text-gray-700">-{a.creditos_consumidos}</p>
                      <p className="text-xs text-gray-400">créditos</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}