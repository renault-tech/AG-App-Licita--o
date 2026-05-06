import { createClient } from '@/lib/supabase/server'
import { FileText, PlusCircle, Clock, CheckCircle, ArrowRight, AlertCircle, Gavel, TrendingUp } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

const STATUS_CONFIG: Record<string, { label: string; classes: string }> = {
  rascunho:   { label: 'Rascunho',   classes: 'bg-gray-100 text-gray-700 border-gray-200' },
  em_revisao: { label: 'Em Revisao', classes: 'bg-amber-50 text-amber-700 border-amber-200' },
  assinado:   { label: 'Assinado',   classes: 'bg-blue-50 text-blue-700 border-blue-200' },
  publicado:  { label: 'Publicado',  classes: 'bg-green-50 text-green-700 border-green-200' },
}

const MODALIDADE_LABEL: Record<string, string> = {
  pregao_eletronico:  'Pregao Eletronico',
  pregao_presencial:  'Pregao Presencial',
  concorrencia:       'Concorrencia',
  concurso:           'Concurso',
  leilao:             'Leilao',
  dialogo_competitivo:'Dialogo Competitivo',
  dispensa:           'Dispensa',
  inexigibilidade:    'Inexigibilidade',
}

// Retorna a ultima etapa com conteudo, para mostrar progresso
function calcularEtapaAtual(p: any): { etapa: string; slug: string; percentual: number } {
  // Usa status como proxy simples; leituras de sub-documentos exigiriam joins
  if (p.status === 'publicado') return { etapa: 'Publicado', slug: 'parecer', percentual: 100 }
  if (p.status === 'assinado')  return { etapa: 'Assinado',  slug: 'parecer', percentual: 85 }
  return { etapa: 'DFD',    slug: 'dfd',    percentual: 14 }
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return null

  const { data: usuarioData } = await supabase
    .from('usuarios')
    .select('nome_completo, organizacao_id, papel')
    .eq('id', user.id)
    .maybeSingle()

  const usuario = usuarioData as any
  const organizacaoId = usuario?.organizacao_id

  const [{ data: dataProcessos }, { data: orgData }, { data: creditosData }] = await Promise.all([
    supabase
      .from('processos_licitatorios')
      .select('id, objeto, modalidade, status, numero_processo, created_at, valor_estimado')
      .eq('organizacao_id', organizacaoId as string)
      .order('created_at', { ascending: false }),
    supabase
      .from('organizacoes')
      .select('nome, municipio, estado')
      .eq('id', organizacaoId as string)
      .maybeSingle(),
    (supabase as any)
      .from('creditos_usuario')
      .select('saldo')
      .eq('usuario_id', user.id)
      .maybeSingle(),
  ])

  const processos = (dataProcessos as any[] | null) ?? []
  const org = orgData as any
  const saldo = (creditosData as any)?.saldo ?? 0

  const totalProcessos = processos.length
  const concluidos   = processos.filter(p => p.status === 'publicado' || p.status === 'assinado').length
  const emAndamento  = processos.filter(p => p.status === 'rascunho' || p.status === 'em_revisao').length

  const nomeUsuario = usuario?.nome_completo || user.email || 'Gestor'
  const primeiroNome = nomeUsuario.split(' ')[0]

  return (
    <div className="space-y-6">

      {/* Cabecalho de boas-vindas */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900">
            Bom dia, {primeiroNome}.
          </h1>
          {org && (
            <p className="text-sm text-gray-500 mt-0.5">
              {org.nome} &bull; {org.municipio}/{org.estado}
            </p>
          )}
        </div>
        <Link href="/processos/novo">
          <Button className="bg-blue-700 hover:bg-blue-800 text-white gap-2 h-9 text-sm">
            <PlusCircle className="w-4 h-4" />
            Novo Processo
          </Button>
        </Link>
      </div>

      {/* Cards de metricas */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Total</p>
                <p className="text-2xl font-bold text-gray-900 mt-1">{totalProcessos}</p>
                <p className="text-xs text-gray-500 mt-0.5">Processos</p>
              </div>
              <div className="p-2 bg-blue-50 rounded-lg">
                <FileText className="w-4 h-4 text-blue-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Andamento</p>
                <p className="text-2xl font-bold text-amber-600 mt-1">{emAndamento}</p>
                <p className="text-xs text-gray-500 mt-0.5">Em elaboracao</p>
              </div>
              <div className="p-2 bg-amber-50 rounded-lg">
                <Clock className="w-4 h-4 text-amber-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Concluidos</p>
                <p className="text-2xl font-bold text-green-600 mt-1">{concluidos}</p>
                <p className="text-xs text-gray-500 mt-0.5">Assinados/Publicados</p>
              </div>
              <div className="p-2 bg-green-50 rounded-lg">
                <CheckCircle className="w-4 h-4 text-green-600" />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-gray-200">
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Creditos IA</p>
                <p className="text-2xl font-bold text-purple-700 mt-1">{saldo}</p>
                <p className="text-xs text-gray-500 mt-0.5">Disponiveis</p>
              </div>
              <div className="p-2 bg-purple-50 rounded-lg">
                <TrendingUp className="w-4 h-4 text-purple-600" />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Lista de Processos */}
      <Card className="border-gray-200">
        <CardHeader className="px-5 py-4 border-b border-gray-100 flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold text-gray-900">Processos Licitatorios</CardTitle>
            <CardDescription className="text-xs mt-0.5">Acompanhe e continue a elaboracao dos documentos</CardDescription>
          </div>
          {totalProcessos > 0 && (
            <Link href="/processos/novo">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs h-8">
                <PlusCircle className="w-3.5 h-3.5" />
                Novo
              </Button>
            </Link>
          )}
        </CardHeader>

        <CardContent className="p-0">
          {totalProcessos === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center px-6">
              <div className="w-14 h-14 rounded-full bg-blue-50 flex items-center justify-center mb-4">
                <Gavel className="w-7 h-7 text-blue-400" />
              </div>
              <h3 className="text-base font-semibold text-gray-900">Nenhum processo ainda</h3>
              <p className="text-sm text-gray-500 mt-1 max-w-sm">
                Clique em "Novo Processo" para iniciar a elaboracao do primeiro processo licitatorio da sua organizacao.
              </p>
              <Link href="/processos/novo" className="mt-4">
                <Button className="bg-blue-700 hover:bg-blue-800 text-white gap-2 text-sm">
                  <PlusCircle className="w-4 h-4" />
                  Criar primeiro processo
                </Button>
              </Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {processos.map((p: any) => {
                const etapaInfo = calcularEtapaAtual(p)
                const statusInfo = STATUS_CONFIG[p.status] ?? STATUS_CONFIG['rascunho']
                const modalidade = MODALIDADE_LABEL[p.modalidade] ?? p.modalidade

                return (
                  <Link
                    key={p.id}
                    href={`/processos/${p.id}/${etapaInfo.slug}`}
                    className="flex items-center gap-4 px-5 py-4 hover:bg-gray-50 transition-colors group"
                  >
                    {/* Icone */}
                    <div className="w-9 h-9 rounded-lg bg-blue-50 flex items-center justify-center shrink-0">
                      <FileText className="w-4 h-4 text-blue-600" />
                    </div>

                    {/* Dados principais */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          {p.numero_processo ? `${p.numero_processo} - ` : ''}{p.objeto}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs text-gray-400">{modalidade}</span>
                        {p.valor_estimado > 0 && (
                          <>
                            <span className="text-gray-300">|</span>
                            <span className="text-xs text-gray-500 font-medium">
                              R$ {(p.valor_estimado as number).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}
                            </span>
                          </>
                        )}
                      </div>
                      {/* Barra de progresso */}
                      <div className="flex items-center gap-2 mt-2">
                        <div className="flex-1 h-1 bg-gray-200 rounded-full max-w-24">
                          <div
                            className="h-1 bg-blue-500 rounded-full transition-all"
                            style={{ width: `${etapaInfo.percentual}%` }}
                          />
                        </div>
                        <span className="text-xs text-gray-400">{etapaInfo.etapa}</span>
                      </div>
                    </div>

                    {/* Status + seta */}
                    <div className="flex items-center gap-3 shrink-0">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${statusInfo.classes}`}>
                        {statusInfo.label}
                      </span>
                      <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-blue-500 transition-colors" />
                    </div>
                  </Link>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Aviso creditos baixos */}
      {saldo < 10 && saldo >= 0 && (
        <div className="flex items-start gap-3 p-4 bg-amber-50 border border-amber-200 rounded-lg text-sm">
          <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <p className="font-medium text-amber-800">Saldo de creditos baixo</p>
            <p className="text-amber-700 text-xs mt-0.5">
              Voce tem apenas {saldo} credito(s) restante(s). As funcionalidades de IA ficam indisponiveis com saldo zerado.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
