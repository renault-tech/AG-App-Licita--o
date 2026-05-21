import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  Zap, TrendingUp, TrendingDown, Clock, CheckCircle2,
  XCircle, Bot, ArrowUpRight, ArrowDownRight, Package,
  AlertCircle, CheckCircle,
} from 'lucide-react'
import BotaoCompra from './botao-compra'
import { PACOTES_CREDITOS } from '@/lib/creditos-config'
import { KPICard } from '@/components/licita/kpi-card'
import { EditorialKicker, HeadlineSerif, Wordmark } from '@/components/licita/editorial'

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
  aprimorar_texto:  'Aprimorar texto',
  sugerir_conteudo: 'Sugerir conteúdo',
  gerar_documento:  'Gerar documento',
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

  const saldo: number           = creditosRes.data?.saldo ?? 0
  const transacoes: Transacao[] = transacoesRes.data ?? []
  const acoes: AcaoIA[]         = acoesRes.data ?? []

  const totalGasto       = acoes.reduce((acc: number, a: AcaoIA) => acc + a.creditos_consumidos, 0)
  const acoesComSucesso  = acoes.filter((a: AcaoIA) => a.sucesso).length

  const stripeAtivo = !!process.env.STRIPE_SECRET_KEY
  const mpAtivo     = !!process.env.MERCADOPAGO_ACCESS_TOKEN

  return (
    <div className="space-y-6">
      {/* Masthead */}
      <div
        className="flex items-center justify-between pb-3.5 mb-6"
        style={{ borderBottom: '2px solid var(--rule)' }}
      >
        <EditorialKicker
          kicker="Inteligência Artificial · Créditos"
          edition="Ciclo mensal"
          date={new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }).replaceAll('/', '·')}
        />
        <span className="font-mono text-[10px]" style={{ color: 'var(--muted)', letterSpacing: '0.16em' }}>
          {new Date().getFullYear()}
        </span>
      </div>

      <HeadlineSerif size="md" as="h1" style={{ marginBottom: 24 }}>
        Saldo e consumo de<br />
        <em style={{ fontStyle: 'italic', color: 'var(--muted)' }}>inteligência artificial.</em>
      </HeadlineSerif>

      {/* Feedback pós-pagamento */}
      {params.sucesso && (
        <div
          className="flex items-center gap-3 p-4 rounded-[var(--r-lg)]"
          style={{ background: 'var(--successWash)', border: '1px solid var(--success)' }}
        >
          <CheckCircle className="w-5 h-5 shrink-0" style={{ color: 'var(--success)' }} />
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--success)' }}>Pagamento confirmado!</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--success)' }}>Seus créditos serão creditados em instantes. Atualize a página se necessário.</p>
          </div>
        </div>
      )}
      {params.cancelado && (
        <div
          className="flex items-center gap-3 p-4 rounded-[var(--r-lg)]"
          style={{ background: 'var(--warnWash)', border: '1px solid var(--warn)' }}
        >
          <AlertCircle className="w-5 h-5 shrink-0" style={{ color: 'var(--warn)' }} />
          <p className="text-sm" style={{ color: 'var(--warn)' }}>Pagamento cancelado. Nenhum valor foi cobrado.</p>
        </div>
      )}
      {params.pendente && (
        <div
          className="flex items-center gap-3 p-4 rounded-[var(--r-lg)]"
          style={{ background: 'var(--primaryWash)', border: '1px solid var(--primary)' }}
        >
          <Clock className="w-5 h-5 shrink-0" style={{ color: 'var(--primary)' }} />
          <p className="text-sm" style={{ color: 'var(--primary)' }}>Pagamento em processamento. Os créditos serão liberados após confirmação.</p>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <KPICard
          label="Saldo atual"
          value={saldo}
          sub="créditos disponíveis"
          icon={<Zap className="w-5 h-5" />}
          accent={saldo <= 10}
        />
        <KPICard
          label="Consumo total"
          value={totalGasto}
          sub="créditos usados em IA"
          icon={<TrendingDown className="w-5 h-5" />}
        />
        <KPICard
          label="Ações realizadas"
          value={acoes.length}
          sub={`${acoesComSucesso} com sucesso`}
          icon={<Bot className="w-5 h-5" />}
        />
      </div>

      {/* Pacotes de créditos */}
      <div
        className="rounded-[var(--r-lg)] border overflow-hidden"
        style={{ background: 'var(--surface)', borderColor: 'var(--hairline)' }}
      >
        <div
          className="px-5 py-4 flex items-center gap-2"
          style={{ borderBottom: '1px solid var(--hairline)', background: 'var(--surfaceAlt)' }}
        >
          <Package className="w-4 h-4" style={{ color: 'var(--primary)' }} />
          <h2 className="text-base font-semibold" style={{ color: 'var(--ink)', fontFamily: 'var(--font-heading)' }}>
            Adquirir créditos
          </h2>
          <p className="text-xs ml-1" style={{ color: 'var(--muted)' }}>
            {stripeAtivo || mpAtivo
              ? 'Escolha o pacote e selecione o método de pagamento.'
              : 'Configure as chaves de API para habilitar pagamentos.'}
          </p>
        </div>
        <div className="p-5">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {PACOTES_CREDITOS.map(pac => {
              const isDestaque = pac.id === 'pack_200'
              return (
                <div
                  key={pac.id}
                  className="relative rounded-[var(--r-lg)] p-4 space-y-2"
                  style={isDestaque
                    ? { background: 'var(--primaryWash)', border: '1px solid var(--primary)', boxShadow: '0 0 0 1px var(--primary)' }
                    : { background: 'var(--surface)', border: '1px solid var(--hairline)' }
                  }
                >
                  {isDestaque && (
                    <span
                      className="absolute -top-2.5 left-3 text-xs font-semibold text-white px-2 py-0.5 rounded-[var(--r-pill)]"
                      style={{ background: 'var(--primary)' }}
                    >
                      Mais popular
                    </span>
                  )}
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold" style={{ color: 'var(--ink)' }}>{pac.creditos}</span>
                    <span className="text-xs" style={{ color: 'var(--muted)' }}>créditos</span>
                  </div>
                  <p className="text-lg font-bold" style={{ color: 'var(--primary)' }}>{pac.label}</p>
                  <BotaoCompra
                    pacoteId={pac.id}
                    stripeAtivo={stripeAtivo}
                    mpAtivo={mpAtivo}
                  />
                </div>
              )
            })}
          </div>
          {!stripeAtivo && !mpAtivo && (
            <p className="text-xs mt-3 text-center" style={{ color: 'var(--mutedSoft)' }}>
              Configure STRIPE_SECRET_KEY ou MERCADOPAGO_ACCESS_TOKEN no arquivo .env.local para habilitar os pagamentos.
            </p>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Histórico de transações */}
        <div
          className="rounded-[var(--r-lg)] border overflow-hidden"
          style={{ background: 'var(--surface)', borderColor: 'var(--hairline)' }}
        >
          <div
            className="px-5 py-4 flex items-center gap-2"
            style={{ borderBottom: '1px solid var(--hairline)', background: 'var(--surfaceAlt)' }}
          >
            <TrendingUp className="w-4 h-4" style={{ color: 'var(--muted)' }} />
            <h3 className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>Histórico de créditos</h3>
          </div>
          {transacoes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center px-4">
              <Clock className="w-8 h-8 mb-2" style={{ color: 'var(--hairline)' }} />
              <p className="text-sm" style={{ color: 'var(--muted)' }}>Nenhuma transação ainda.</p>
              <p className="text-xs mt-1" style={{ color: 'var(--mutedSoft)' }}>Adquira créditos para começar.</p>
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto">
              {transacoes.map((t: Transacao) => {
                const isEntrada = t.tipo === 'compra' || t.tipo === 'bonus'
                return (
                  <div
                    key={t.id}
                    className="flex items-center gap-3 px-5 py-3"
                    style={{ borderBottom: '1px solid var(--hairline)' }}
                  >
                    <div
                      className="p-1.5 rounded-[var(--r-md)] shrink-0"
                      style={{ background: isEntrada ? 'var(--successWash)' : 'var(--dangerWash)' }}
                    >
                      {isEntrada
                        ? <ArrowUpRight className="w-3.5 h-3.5" style={{ color: 'var(--success)' }} />
                        : <ArrowDownRight className="w-3.5 h-3.5" style={{ color: 'var(--danger)' }} />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-medium truncate" style={{ color: 'var(--ink)' }}>
                        {t.descricao ?? (isEntrada ? 'Recarga de créditos' : 'Consumo de IA')}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--mutedSoft)' }}>{formatarData(t.created_at)}</p>
                    </div>
                    <div className="text-right shrink-0">
                      <p className="text-sm font-bold" style={{ color: isEntrada ? 'var(--success)' : 'var(--danger)' }}>
                        {isEntrada ? '+' : '-'}{t.quantidade}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--mutedSoft)' }}>saldo: {t.saldo_posterior}</p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>

        {/* Histórico de ações de IA */}
        <div
          className="rounded-[var(--r-lg)] border overflow-hidden"
          style={{ background: 'var(--surface)', borderColor: 'var(--hairline)' }}
        >
          <div
            className="px-5 py-4 flex items-center gap-2"
            style={{ borderBottom: '1px solid var(--hairline)', background: 'var(--surfaceAlt)' }}
          >
            <Bot className="w-4 h-4" style={{ color: 'var(--muted)' }} />
            <h3 className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>Uso de IA recente</h3>
          </div>
          {acoes.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center px-4">
              <Bot className="w-8 h-8 mb-2" style={{ color: 'var(--hairline)' }} />
              <p className="text-sm" style={{ color: 'var(--muted)' }}>Nenhuma ação de IA registrada.</p>
              <p className="text-xs mt-1" style={{ color: 'var(--mutedSoft)' }}>Use os botões de IA nos documentos para gerar conteúdo.</p>
            </div>
          ) : (
            <div className="max-h-80 overflow-y-auto">
              {acoes.map((a: AcaoIA) => (
                <div
                  key={a.id}
                  className="flex items-center gap-3 px-5 py-3"
                  style={{ borderBottom: '1px solid var(--hairline)' }}
                >
                  <div
                    className="p-1.5 rounded-[var(--r-md)] shrink-0"
                    style={{ background: a.sucesso ? 'var(--successWash)' : 'var(--dangerWash)' }}
                  >
                    {a.sucesso
                      ? <CheckCircle2 className="w-3.5 h-3.5" style={{ color: 'var(--success)' }} />
                      : <XCircle className="w-3.5 h-3.5" style={{ color: 'var(--danger)' }} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-medium" style={{ color: 'var(--ink)' }}>
                      {TIPO_ACAO_LABEL[a.tipo_acao] ?? a.tipo_acao}
                    </p>
                    <p className="text-xs truncate" style={{ color: 'var(--mutedSoft)' }}>
                      {a.provedor} &bull; {formatarData(a.created_at)}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-bold" style={{ color: 'var(--inkSoft)' }}>-{a.creditos_consumidos}</p>
                    <p className="text-xs" style={{ color: 'var(--mutedSoft)' }}>créditos</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="pt-4 flex items-center justify-between" style={{ borderTop: '1px solid var(--hairline)' }}>
        <Wordmark />
        <div className="font-mono text-[9.5px]" style={{ color: 'var(--muted)', letterSpacing: '0.12em' }}>
          Créditos debitados em tempo real · Lei 14.133/21
        </div>
      </div>
    </div>
  )
}
