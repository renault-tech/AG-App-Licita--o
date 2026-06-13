import { redirect, notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Package, AlertTriangle, CheckCircle2, XCircle, Clock, ArrowRightCircle } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { obterSolicitacao } from '@/lib/actions/solicitacoes'
import { AcoesGestao } from './acoes-gestao'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline'; icon: React.ReactNode }> = {
  rascunho:   { label: 'Rascunho',     variant: 'outline',     icon: <Clock className="w-3 h-3" /> },
  enviada:    { label: 'Enviada',      variant: 'secondary',   icon: <ArrowRightCircle className="w-3 h-3" /> },
  em_analise: { label: 'Em Análise',   variant: 'default',     icon: <Clock className="w-3 h-3" /> },
  aprovada:   { label: 'Aprovada',     variant: 'default',     icon: <CheckCircle2 className="w-3 h-3" /> },
  recusada:   { label: 'Recusada',     variant: 'destructive', icon: <XCircle className="w-3 h-3" /> },
  convertida: { label: 'Em Processo',  variant: 'default',     icon: <CheckCircle2 className="w-3 h-3" /> },
}

const PRIORIDADE_CONFIG: Record<string, { label: string; className: string }> = {
  baixa:   { label: 'Baixa',   className: 'text-gray-500 bg-gray-100' },
  media:   { label: 'Média',   className: 'text-blue-600 bg-blue-50' },
  alta:    { label: 'Alta',    className: 'text-orange-600 bg-orange-50' },
  urgente: { label: 'Urgente', className: 'text-red-600 bg-red-50' },
}

export default async function SolicitacaoDetalhe({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: usuarioRaw } = await supabase
    .from('usuarios')
    .select('papel, organizacao_id')
    .eq('id', user.id)
    .maybeSingle()

  const usuario = usuarioRaw as { papel: string; organizacao_id: string } | null
  if (!usuario) redirect('/login')

  const sol = await obterSolicitacao(id)
  if (!sol) notFound()

  const papeisGestao = ['setor_compras', 'setor_licitacao', 'admin_organizacao', 'admin_plataforma']
  const isGestao = papeisGestao.includes(usuario.papel)
  const podeProceder = isGestao && (sol.status === 'enviada' || sol.status === 'em_analise')

  const status = STATUS_CONFIG[sol.status] ?? STATUS_CONFIG.rascunho
  const prioridade = PRIORIDADE_CONFIG[sol.prioridade ?? 'media'] ?? PRIORIDADE_CONFIG.media

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/solicitacoes"
          className="inline-flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-800 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Solicitações
        </Link>
      </div>

      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className={`inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${prioridade.className}`}>
              {sol.prioridade === 'urgente' && <AlertTriangle className="w-3 h-3" />}
              {prioridade.label}
            </span>
            <Badge variant={status.variant} className="gap-1 text-xs">
              {status.icon}
              {status.label}
            </Badge>
          </div>
          <h1 className="text-xl font-semibold text-gray-900">{sol.objeto}</h1>
          <p className="text-sm text-gray-500">
            por <strong>{sol.usuarios?.nome_completo ?? 'Desconhecido'}</strong>
            {sol.secretarias?.nome && <> · {sol.secretarias.nome}</>}
            {' · '}{new Date(sol.created_at).toLocaleDateString('pt-BR')}
          </p>
        </div>

        {sol.processo_id && (
          <Link
            href={`/processos/${sol.processo_id}`}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-blue-50 text-blue-700 hover:bg-blue-100 transition-colors"
          >
            Ver Processo
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        {sol.data_necessidade && (
          <div className="bg-gray-50 rounded-lg p-3 space-y-0.5">
            <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Data de Necessidade</p>
            <p className="font-medium text-gray-800">{new Date(sol.data_necessidade).toLocaleDateString('pt-BR')}</p>
          </div>
        )}
        <div className="bg-gray-50 rounded-lg p-3 space-y-0.5">
          <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Itens</p>
          <p className="font-medium text-gray-800">{sol.solicitacoes_itens?.length ?? 0} item(ns)</p>
        </div>
        {sol.secretarias?.nome && (
          <div className="bg-gray-50 rounded-lg p-3 space-y-0.5">
            <p className="text-xs text-gray-400 uppercase tracking-wide font-medium">Secretaria</p>
            <p className="font-medium text-gray-800">{sol.secretarias.nome}</p>
          </div>
        )}
      </div>

      {sol.justificativa && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600">Justificativa</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-gray-800 whitespace-pre-wrap">{sol.justificativa}</p>
          </CardContent>
        </Card>
      )}

      {sol.solicitacoes_itens && sol.solicitacoes_itens.length > 0 && (
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-gray-600 flex items-center gap-2">
              <Package className="w-4 h-4" />
              Itens Solicitados
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <div className="divide-y divide-gray-100">
              {sol.solicitacoes_itens.map((item) => (
                <div key={item.id} className="px-6 py-3 flex items-start gap-4">
                  <span className="text-xs font-medium text-gray-400 w-5 shrink-0 pt-0.5">{item.numero_item}</span>
                  <div className="flex-1 min-w-0 space-y-0.5">
                    <p className="text-sm font-medium text-gray-800">{item.catmat_descricao}</p>
                    {item.catmat_codigo && (
                      <p className="text-xs text-gray-400">CATMAT {item.catmat_codigo}</p>
                    )}
                    {item.especificacao_complementar && (
                      <p className="text-xs text-gray-600">{item.especificacao_complementar}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-medium text-gray-800">{item.quantidade} {item.unidade_medida ?? item.catmat_unidade}</p>
                    {item.valor_estimado_unitario != null && (
                      <p className="text-xs text-gray-400">
                        R$ {item.valor_estimado_unitario.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} /un
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {sol.motivo_recusa && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-4">
            <p className="text-sm font-medium text-red-700 mb-1">Motivo da recusa</p>
            <p className="text-sm text-red-600">{sol.motivo_recusa}</p>
          </CardContent>
        </Card>
      )}

      {podeProceder && <AcoesGestao solicitacaoId={id} objeto={sol.objeto} />}
    </div>
  )
}
