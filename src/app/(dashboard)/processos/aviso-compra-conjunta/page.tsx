import { redirect } from 'next/navigation'
import Link from 'next/link'
import { PlusCircle, Clock, CheckCircle2, Users, ArrowRight } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { listarAvisos } from '@/lib/actions/avisos'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { EditorialKicker } from '@/components/licita/editorial'
import type { AvisoResumo } from '@/lib/actions/avisos'

const STATUS_CONFIG: Record<string, { label: string; variant: 'default' | 'secondary' | 'outline' }> = {
  aberto:            { label: 'Aberto',           variant: 'default' },
  encerrado:         { label: 'Encerrado',         variant: 'secondary' },
  processo_iniciado: { label: 'Processo iniciado', variant: 'outline' },
}

function AvisoCard({ aviso }: { aviso: AvisoResumo }) {
  const status = STATUS_CONFIG[aviso.status] ?? STATUS_CONFIG.aberto
  const prazo = new Date(aviso.prazo_adesao)
  const diasRestantes = Math.ceil((prazo.getTime() - Date.now()) / 86400000)
  const prazoVencido = diasRestantes < 0

  return (
    <Link href={`/processos/aviso-compra-conjunta/${aviso.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer border-[var(--hairline)]">
        <CardContent className="p-4">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0 space-y-1.5">
              <div className="flex items-center gap-2 flex-wrap">
                <Badge variant={status.variant} className="text-xs">{status.label}</Badge>
                <span className="text-xs text-gray-500">
                  {aviso.secretaria_origem.sigla
                    ? `${aviso.secretaria_origem.sigla} · ${aviso.secretaria_origem.nome}`
                    : aviso.secretaria_origem.nome}
                </span>
              </div>
              <p className="text-sm font-semibold text-gray-900">
                {aviso.categoria_objeto} — {aviso.modalidade}
              </p>
              <div className="flex items-center gap-4 text-xs text-gray-500">
                <span className="flex items-center gap-1">
                  <Users className="w-3 h-3" />
                  {aviso.total_aderidas}/{aviso.total_destinatarias} adesões
                </span>
                <span className={`flex items-center gap-1 ${prazoVencido ? 'text-red-500' : diasRestantes <= 3 ? 'text-amber-600' : ''}`}>
                  <Clock className="w-3 h-3" />
                  {prazoVencido
                    ? 'Prazo encerrado'
                    : diasRestantes === 0
                    ? 'Encerra hoje'
                    : `${diasRestantes}d restantes`}
                </span>
              </div>
            </div>
            <ArrowRight className="w-4 h-4 text-gray-400 shrink-0 mt-1" />
          </div>
        </CardContent>
      </Card>
    </Link>
  )
}

export default async function AvisosListPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: usuarioRaw } = await supabase
    .from('usuarios')
    .select('papel')
    .eq('id', user.id)
    .maybeSingle()

  const papel = (usuarioRaw as { papel: string } | null)?.papel ?? ''
  const podeCriar = ['setor_compras', 'admin_organizacao', 'admin_plataforma'].includes(papel)

  const avisos = await listarAvisos()

  const abertos   = avisos.filter(a => a.status === 'aberto')
  const encerrados = avisos.filter(a => a.status !== 'aberto')

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <EditorialKicker
        kicker="Compra Conjunta"
        date={new Date().toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }).replaceAll('/', '·')}
      />

      <div className="flex items-end justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--ink)', fontFamily: 'var(--font-heading)' }}>
            Avisos de Compra Conjunta
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--muted)' }}>
            Gerencie convites para compras compartilhadas entre secretarias.
          </p>
        </div>
        {podeCriar && (
          <Link
            href="/processos/aviso-compra-conjunta/novo"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-[var(--r-md)] text-sm font-semibold transition-all hover:brightness-110 shadow-[0_2px_8px_rgba(0,0,0,0.12)]"
            style={{ background: 'var(--primary)', color: 'var(--primaryInk)' }}
          >
            <PlusCircle className="w-4 h-4" />
            Novo aviso
          </Link>
        )}
      </div>

      {avisos.length === 0 ? (
        <Card className="border-dashed border-gray-200">
          <CardContent className="p-12 text-center space-y-3">
            <div className="w-10 h-10 bg-gray-100 rounded-full flex items-center justify-center mx-auto">
              <Users className="w-5 h-5 text-gray-400" />
            </div>
            <p className="text-sm font-medium text-gray-600">Nenhum aviso de compra conjunta</p>
            {podeCriar && (
              <p className="text-xs text-gray-400">
                Crie um aviso para convidar secretarias a participar de uma compra compartilhada.
              </p>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {abertos.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold" style={{ color: 'var(--ink)' }}>
                  Em aberto
                </h2>
                <span className="text-xs px-1.5 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">
                  {abertos.length}
                </span>
              </div>
              {abertos.map(a => <AvisoCard key={a.id} aviso={a} />)}
            </div>
          )}

          {encerrados.length > 0 && (
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold" style={{ color: 'var(--muted)' }}>
                  Encerrados / Iniciados
                </h2>
                <span className="text-xs px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600 font-medium">
                  {encerrados.length}
                </span>
              </div>
              {encerrados.map(a => <AvisoCard key={a.id} aviso={a} />)}
            </div>
          )}
        </div>
      )}

      {avisos.length > 0 && (
        <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--muted)' }}>
          <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
          {avisos.filter(a => a.status === 'processo_iniciado').length} aviso(s) convertidos em processo
        </div>
      )}
    </div>
  )
}
